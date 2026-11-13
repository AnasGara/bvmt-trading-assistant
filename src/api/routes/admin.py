from typing import List
from fastapi import APIRouter, Depends, HTTPException

from src.api.auth import get_admin_user
from src.api.models import (
    UserOut, RoleUpdate, AdminStats, AlertHistoryOut, SettingsUpdate
)
from src.storage.db import (
    get_all_users, update_user_role, delete_user,
    get_alert_history, get_dashboard_stats,
    get_all_settings, set_app_setting
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStats)
async def admin_stats(_user: dict = Depends(get_admin_user)):
    stats = get_dashboard_stats()
    return AdminStats(**stats)


@router.get("/users", response_model=List[UserOut])
async def list_users(_user: dict = Depends(get_admin_user)):
    users = get_all_users()
    return [
        UserOut(
            id=u["id"], email=u["email"], full_name=u["full_name"],
            role=u["role"], is_active=bool(u["is_active"]),
            created_at=u.get("created_at")
        )
        for u in users
    ]


@router.put("/users/{user_id}/role")
async def change_role(user_id: int, data: RoleUpdate, admin: dict = Depends(get_admin_user)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    if not update_user_role(user_id, data.role):
        raise HTTPException(status_code=404, detail="User not found")
    return {"detail": "Role updated", "user_id": user_id, "new_role": data.role}


@router.delete("/users/{user_id}")
async def remove_user(user_id: int, admin: dict = Depends(get_admin_user)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    if not delete_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return {"detail": "User deleted", "user_id": user_id}


@router.get("/alerts", response_model=List[AlertHistoryOut])
async def alert_history(_user: dict = Depends(get_admin_user)):
    alerts = get_alert_history(limit=100)
    return [AlertHistoryOut(**a) for a in alerts]


@router.get("/settings")
async def get_settings(_user: dict = Depends(get_admin_user)):
    return get_all_settings()


@router.post("/settings")
async def update_settings(data: SettingsUpdate, _user: dict = Depends(get_admin_user)):
    for key, value in data.settings.items():
        set_app_setting(key, value)
    return {"detail": "Settings updated", "count": len(data.settings)}
