import math
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException

from src.api.auth import get_current_user, get_admin_user
from src.api.models import SignalOut, PaginatedSignals, SignalSummary
from src.storage.db import (
    get_signals, get_signal_by_id, get_latest_signals,
    get_signal_summary, get_signals_count,
    delete_signal_by_id, clear_all_signals
)

router = APIRouter(prefix="/api/signals", tags=["Signals"])


@router.get("", response_model=PaginatedSignals)
async def list_signals(
    ticker: Optional[str] = Query(None),
    signal_type: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _user: dict = Depends(get_current_user)
):
    offset = (page - 1) * page_size
    rows = get_signals(
        ticker=ticker, signal_type=signal_type, direction=direction,
        date_from=date_from, date_to=date_to, sort_order=sort_order,
        limit=page_size, offset=offset
    )
    total = get_signals_count(
        ticker=ticker, signal_type=signal_type, direction=direction,
        date_from=date_from, date_to=date_to
    )
    return PaginatedSignals(
        signals=[SignalOut(**r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1
    )


@router.get("/latest", response_model=list[SignalOut])
async def latest_signals(_user: dict = Depends(get_current_user)):
    rows = get_latest_signals()
    return [SignalOut(**r) for r in rows]


@router.get("/summary", response_model=SignalSummary)
async def signal_summary(_user: dict = Depends(get_current_user)):
    data = get_signal_summary()
    return SignalSummary(**data)


@router.get("/{signal_id}", response_model=SignalOut)
async def get_signal(signal_id: int, _user: dict = Depends(get_current_user)):
    row = get_signal_by_id(signal_id)
    if not row:
        raise HTTPException(status_code=404, detail="Signal not found")
    return SignalOut(**row)


@router.delete("/{signal_id}")
async def delete_signal(signal_id: int, user: dict = Depends(get_current_user)):
    """Deletes a single recommendation by its ID."""
    deleted = delete_signal_by_id(signal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Signal not found")
    return {"detail": f"Signal #{signal_id} deleted successfully", "id": signal_id}


@router.delete("")
async def clear_signals(
    ticker: Optional[str] = Query(None),
    _admin: dict = Depends(get_admin_user)
):
    """Admin endpoint to clear all recommendations or filter by ticker."""
    count = clear_all_signals(ticker=ticker)
    return {"detail": f"{count} recommendation(s) cleared successfully", "deleted_count": count}
