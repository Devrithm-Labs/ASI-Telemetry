import uvicorn
from config import settings

if __name__ == "__main__":
    print(f"\n🚀 Starting ASI-Telemetry Backend on http://{settings.HOST}:{settings.PORT}")
    print(f"📊 Swagger API Docs: http://localhost:{settings.PORT}/docs")
    print(f"🗄️ ClickHouse Host: {settings.CLICKHOUSE_HOST}:{settings.CLICKHOUSE_PORT}\n")

    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
