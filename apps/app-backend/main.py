from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import db_connection
from models import initialize_schema
from api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to PostgreSQL on server startup and initialize schemas
    db_connection.connect()
    initialize_schema(db_connection)
    yield


app = FastAPI(
    title="ASI-Telemetry Backend",
    description="PostgreSQL Telemetry and Observability Backend for AI Agents with SQLAlchemy ORM",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular API routes
app.include_router(api_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "message": "ASI-Telemetry Backend is running. Open /docs for Swagger UI.",
    }
