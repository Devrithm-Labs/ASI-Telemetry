import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f"\n>> Starting ASI-Telemetry Backend on http://{settings.HOST}:{settings.PORT}")
    print(f">> Swagger API Docs: http://localhost:{settings.PORT}/docs")
    print(f">> PostgreSQL Target: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}\n")

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
