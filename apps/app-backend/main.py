from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import db
<<<<<<< HEAD
from routes import telemetry_router, ws_router
=======
from routes import telemetry_router
from routes.auth import router as auth_router
from auth.database import initialize_auth_database
>>>>>>> 8394fde (Updated code Login SignUp)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to ClickHouse on server startup
    db.connect()
<<<<<<< HEAD
=======
    initialize_auth_database()
>>>>>>> 8394fde (Updated code Login SignUp)
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
<<<<<<< HEAD
app.include_router(ws_router)
=======
app.include_router(auth_router)
>>>>>>> 8394fde (Updated code Login SignUp)


@app.get("/")
def root():
    return {
        "status": "online",
        "message": "ASI-Telemetry Backend is running. Open /docs for Swagger UI.",
    }
