from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import db
from routes import telemetry_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to ClickHouse on server startup
    db.connect()
    yield


app = FastAPI(
    title="ASI-Telemetry Backend",
    description="Simple ClickHouse Telemetry Ingestion for AI Agents",
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

# Register API routes
app.include_router(telemetry_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "message": "ASI-Telemetry Backend is running. Open /docs for Swagger UI.",
    }
