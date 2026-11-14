from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from fastapi import Depends, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from config.settings import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_MINUTES, ADMIN_EMAIL, ADMIN_PASSWORD
from src.storage.db import (
    get_user_by_email, create_user, get_user_by_id,
    update_user_profile
)
from src.api.models import (
    UserCreate, UserLogin, UserOut, Token,
    UserProfileUpdate, TelegramTestRequest
)
from src.alerts.telegram_bot import send_telegram_message

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        plain_bytes = plain.encode('utf-8')[:72]
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = get_user_by_id(int(user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account disabled")
    return user


async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def ensure_admin_exists():
    """Create default admin account if none exists."""
    existing = get_user_by_email(ADMIN_EMAIL)
    if not existing:
        hashed = hash_password(ADMIN_PASSWORD)
        create_user(email=ADMIN_EMAIL, hashed_password=hashed, full_name="BVMT Admin", role="admin")


# ─── Routes ──────────────────────────────────────────────────────────

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user_data.password)
    user_id = create_user(
        email=user_data.email,
        hashed_password=hashed,
        full_name=user_data.full_name,
        role="user"
    )
    if user_id is None:
        raise HTTPException(status_code=400, detail="Registration failed")

    user = get_user_by_id(user_id)
    token = create_access_token(data={"sub": str(user_id), "role": "user"})
    return Token(
        access_token=token,
        user=UserOut(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", ""),
            role=user["role"],
            telegram_chat_id=user.get("telegram_chat_id"),
            telegram_phone=user.get("telegram_phone"),
            telegram_enabled=bool(user.get("telegram_enabled", 1)),
            is_active=bool(user["is_active"]),
            created_at=user["created_at"]
        )
    )


@router.post("/login", response_model=Token)
async def login(form_data: UserLogin):
    user = get_user_by_email(form_data.email)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_access_token(data={"sub": str(user["id"]), "role": user["role"]})
    return Token(
        access_token=token,
        user=UserOut(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", ""),
            role=user["role"],
            telegram_chat_id=user.get("telegram_chat_id"),
            telegram_phone=user.get("telegram_phone"),
            telegram_enabled=bool(user.get("telegram_enabled", 1)),
            is_active=bool(user["is_active"]),
            created_at=user["created_at"]
        )
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user.get("full_name", ""),
        role=current_user["role"],
        telegram_chat_id=current_user.get("telegram_chat_id"),
        telegram_phone=current_user.get("telegram_phone"),
        telegram_enabled=bool(current_user.get("telegram_enabled", 1)),
        is_active=bool(current_user["is_active"]),
        created_at=current_user["created_at"]
    )


@router.put("/profile", response_model=UserOut)
async def update_profile(data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Allows user to configure their full name, Telegram Chat ID, phone number, and alert preferences."""
    updated = update_user_profile(
        user_id=current_user["id"],
        full_name=data.full_name,
        telegram_chat_id=data.telegram_chat_id,
        telegram_phone=data.telegram_phone,
        telegram_enabled=data.telegram_enabled
    )
    if not updated and data.dict(exclude_unset=True):
        raise HTTPException(status_code=400, detail="Update failed")

    refreshed = get_user_by_id(current_user["id"])
    return UserOut(
        id=refreshed["id"],
        email=refreshed["email"],
        full_name=refreshed.get("full_name", ""),
        role=refreshed["role"],
        telegram_chat_id=refreshed.get("telegram_chat_id"),
        telegram_phone=refreshed.get("telegram_phone"),
        telegram_enabled=bool(refreshed.get("telegram_enabled", 1)),
        is_active=bool(refreshed["is_active"]),
        created_at=refreshed["created_at"]
    )


@router.post("/telegram-test")
async def test_telegram_alert(
    req: TelegramTestRequest = TelegramTestRequest(),
    current_user: dict = Depends(get_current_user)
):
    """Sends a real test alert to the user's Telegram Chat ID to verify configuration."""
    chat_id = req.chat_id or current_user.get("telegram_chat_id")
    if not chat_id:
        raise HTTPException(
            status_code=400,
            detail="Aucun identifiant Telegram (Chat ID) configuré. Veuillez entrer votre Chat ID."
        )

    user_name = current_user.get("full_name") or current_user.get("email")
    message = (
        f"🤖 <b>BVMT Trading Assistant | Test de Connexion</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"Bonjour <b>{user_name}</b> ! 👋\n\n"
        f"✅ <b>Votre compte Telegram est correctement configuré !</b>\n"
        f"Vous recevrez désormais en temps réel les signaux de trading et recommandations pour la Bourse de Tunis.\n\n"
        f"⏰ <b>Prochain scan automatique :</b> 14:30 CET (Lundi - Vendredi)\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🇹🇳 <i>BVMT Trading Assistant</i>"
    )

    success = send_telegram_message(message, chat_id=str(chat_id).strip())
    if not success:
        raise HTTPException(
            status_code=502,
            detail="Échec de l'envoi du message Telegram. Assurez-vous d'avoir cliqué sur /start dans le bot Telegram d'abord, et que votre Chat ID est exact."
        )

    return {
        "success": True,
        "detail": f"Message de test envoyé avec succès sur Telegram à {chat_id} !"
    }
