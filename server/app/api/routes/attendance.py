from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.attendance import Attendance
from app.schemas.attendance import AttendanceCreate, AttendanceResponse, AttendanceUpdate

router = APIRouter(
    prefix="/api/attendance",
    tags=["Attendance"],
)


@router.post("", response_model=AttendanceResponse, status_code=201)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
):
    record = Attendance(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=list[AttendanceResponse])
def get_attendance(
    employee_id: int | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = select(Attendance).order_by(
        Attendance.attendance_date.desc()
    )

    if employee_id:
        stmt = stmt.where(Attendance.employee_id == employee_id)
    if date_from:
        stmt = stmt.where(Attendance.attendance_date >= date_from)
    if date_to:
        stmt = stmt.where(Attendance.attendance_date <= date_to)

    return db.scalars(stmt).all()


@router.get("/{attendance_id}", response_model=AttendanceResponse)
def get_attendance_record(
    attendance_id: int,
    db: Session = Depends(get_db),
):
    record = db.scalar(select(Attendance).where(Attendance.id == attendance_id))
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return record


@router.patch("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
):
    record = db.scalar(select(Attendance).where(Attendance.id == attendance_id))
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record
