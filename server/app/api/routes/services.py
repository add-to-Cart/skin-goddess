from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceResponse, ServiceUpdate

router = APIRouter(
    prefix="/api/services",
    tags=["Services"],
    dependencies=[Depends(get_current_user)],
)


@router.post("", response_model=ServiceResponse, status_code=201)
def create_service(
    data: ServiceCreate,
    db: Session = Depends(get_db),
):
    service = Service(**data.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.get("", response_model=list[ServiceResponse])
def get_services(
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    stmt = select(Service).order_by(Service.name)
    if active_only:
        stmt = stmt.where(Service.is_active.is_(True))
    return db.scalars(stmt).all()


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
):
    service = db.scalar(select(Service).where(Service.id == service_id))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.patch("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: int,
    data: ServiceUpdate,
    db: Session = Depends(get_db),
):
    service = db.scalar(select(Service).where(Service.id == service_id))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)
    return service
