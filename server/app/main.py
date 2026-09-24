from fastapi import FastAPI

from app.api.routes.clients import router as clients_router


app = FastAPI(
    title="Skin Goddess Clinic System API",
    version="1.0.0",
)


app.include_router(clients_router)