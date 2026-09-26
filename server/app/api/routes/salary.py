from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.salary import SalaryRecord
from app.schemas.salary import SalaryRecordCreate, SalaryRecordResponse, SalaryRecordUpdate

router = APIRouter(
    prefix="/api/salary",
    tags=["Salary"],
    dependencies=[Depends(get_current_user)],
)


@router.post("", response_model=SalaryRecordResponse, status_code=201)
def create_salary_record(
    data: SalaryRecordCreate,
    db: Session = Depends(get_db),
):
    record = SalaryRecord(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=list[SalaryRecordResponse])
def get_salary_records(
    employee_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = select(SalaryRecord).order_by(SalaryRecord.period_end.desc())

    if employee_id:
        stmt = stmt.where(SalaryRecord.employee_id == employee_id)
    if status:
        stmt = stmt.where(SalaryRecord.status == status)

    return db.scalars(stmt).all()


@router.get("/{record_id}", response_model=SalaryRecordResponse)
def get_salary_record(
    record_id: int,
    db: Session = Depends(get_db),
):
    record = db.scalar(select(SalaryRecord).where(SalaryRecord.id == record_id))
    if not record:
        raise HTTPException(status_code=404, detail="Salary record not found")
    return record


@router.patch("/{record_id}", response_model=SalaryRecordResponse)
def update_salary_record(
    record_id: int,
    data: SalaryRecordUpdate,
    db: Session = Depends(get_db),
):
    record = db.scalar(select(SalaryRecord).where(SalaryRecord.id == record_id))
    if not record:
        raise HTTPException(status_code=404, detail="Salary record not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record
