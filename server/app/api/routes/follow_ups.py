from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.db.session import get_db
from app.models.follow_up import FollowUp
from app.schemas.follow_up import FollowUpCreate, FollowUpResponse, FollowUpUpdate

router = APIRouter(
    prefix="/api/follow-ups",
    tags=["Follow-ups"],
)


@router.post("", response_model=FollowUpResponse, status_code=201)
def create_follow_up(
    data: FollowUpCreate,
    db: Session = Depends(get_db),
):
    follow_up = FollowUp(**data.model_dump())
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return follow_up


@router.get("", response_model=list[FollowUpResponse])
def get_follow_ups(
    client_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = select(FollowUp).order_by(FollowUp.follow_up_date)

    if client_id:
        stmt = stmt.where(FollowUp.client_id == client_id)
    if status:
        stmt = stmt.where(FollowUp.status == status)
    if date_from:
        stmt = stmt.where(FollowUp.follow_up_date >= date_from)
    if date_to:
        stmt = stmt.where(FollowUp.follow_up_date <= date_to)

    return db.scalars(stmt).all()


@router.get("/upcoming", response_model=list[FollowUpResponse])
def get_upcoming_follow_ups(
    days_ahead: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Follow-ups due within the next N days (default 7)."""
    today = date.today()
    from datetime import timedelta
    cutoff = today + timedelta(days=days_ahead)

    stmt = (
        select(FollowUp)
        .where(
            FollowUp.follow_up_date >= today,
            FollowUp.follow_up_date <= cutoff,
            FollowUp.status.in_(("upcoming", "due")),
        )
        .order_by(FollowUp.follow_up_date)
    )
    return db.scalars(stmt).all()


@router.get("/overdue", response_model=list[FollowUpResponse])
def get_overdue_follow_ups(
    db: Session = Depends(get_db),
):
    """Follow-ups whose date has passed and are still not completed."""
    today = date.today()
    stmt = (
        select(FollowUp)
        .where(
            FollowUp.follow_up_date < today,
            FollowUp.status.in_(("upcoming", "due")),
        )
        .order_by(FollowUp.follow_up_date)
    )
    return db.scalars(stmt).all()


@router.get("/{follow_up_id}", response_model=FollowUpResponse)
def get_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
):
    follow_up = db.scalar(select(FollowUp).where(FollowUp.id == follow_up_id))
    if not follow_up:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return follow_up


@router.patch("/{follow_up_id}", response_model=FollowUpResponse)
def update_follow_up(
    follow_up_id: int,
    data: FollowUpUpdate,
    db: Session = Depends(get_db),
):
    follow_up = db.scalar(select(FollowUp).where(FollowUp.id == follow_up_id))
    if not follow_up:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(follow_up, field, value)

    db.commit()
    db.refresh(follow_up)
    return follow_up
