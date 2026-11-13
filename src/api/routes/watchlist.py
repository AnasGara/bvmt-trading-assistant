from typing import List
from fastapi import APIRouter, Depends, HTTPException

from src.api.auth import get_current_user
from src.api.models import WatchlistItem, WatchlistAdd
from src.storage.db import get_user_watchlist, add_to_watchlist, remove_from_watchlist
from config.settings import DEFAULT_WATCHLIST

router = APIRouter(prefix="/api/watchlist", tags=["Watchlist"])


@router.get("", response_model=List[WatchlistItem])
async def list_watchlist(user: dict = Depends(get_current_user)):
    items = get_user_watchlist(user["id"])
    return [WatchlistItem(**item) for item in items]


@router.post("", response_model=WatchlistItem)
async def add_ticker(data: WatchlistAdd, user: dict = Depends(get_current_user)):
    ticker = data.ticker.upper()
    if ticker not in DEFAULT_WATCHLIST:
        raise HTTPException(status_code=400, detail=f"{ticker} is not a valid BVMT ticker")

    item_id = add_to_watchlist(user["id"], ticker)
    if item_id is None:
        raise HTTPException(status_code=409, detail=f"{ticker} is already in your watchlist")

    return WatchlistItem(id=item_id, ticker=ticker)


@router.delete("/{ticker}")
async def remove_ticker(ticker: str, user: dict = Depends(get_current_user)):
    if not remove_from_watchlist(user["id"], ticker.upper()):
        raise HTTPException(status_code=404, detail=f"{ticker.upper()} not found in your watchlist")
    return {"detail": f"{ticker.upper()} removed from watchlist"}
