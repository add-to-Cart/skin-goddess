from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.schemas.client import (
    ClientCreate,
    ClientResponse,
    ClientUpdate,
)


router = APIRouter(
    prefix="/api/clients",
    tags=["Clients"],
    dependencies=[Depends(get_current_user)],
)


@router.post(
    "",
    response_model=ClientResponse,
    status_code=201,
)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
):
    client = Client(
        **client_data.model_dump()
    )

    db.add(client)
    db.commit()
    db.refresh(client)

    return client


@router.get(
    "",
    response_model=list[ClientResponse],
)
def get_clients(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    statement = select(Client).where(
        Client.is_active.is_(True)
    )

    if search:
        search_pattern = f"%{search}%"

        statement = statement.where(
            or_(
                Client.first_name.ilike(search_pattern),
                Client.last_name.ilike(search_pattern),
                Client.phone.ilike(search_pattern),
            )
        )

    statement = statement.order_by(
        Client.last_name,
        Client.first_name,
    )

    return db.scalars(statement).all()

@router.get(
    "/{client_id}",
    response_model=ClientResponse,
)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
):
    statement = select(Client).where(
        Client.id == client_id,
        Client.is_active.is_(True),
    )

    client = db.scalar(statement)

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    return client

@router.patch(
    "/{client_id}",
    response_model=ClientResponse,
)
def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
):
    statement = select(Client).where(
        Client.id == client_id,
        Client.is_active.is_(True),
    )

    client = db.scalar(statement)

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    update_data = client_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)

    return client

@router.delete(
    "/{client_id}",
    status_code=204,
)
def deactivate_client(
    client_id: int,
    db: Session = Depends(get_db),
):
    statement = select(Client).where(
        Client.id == client_id,
        Client.is_active.is_(True),
    )

    client = db.scalar(statement)

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )

    client.is_active = False

    db.commit()