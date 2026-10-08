import uvicorn

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  Starting ASI-Telemetry FastAPI Backend on http://127.0.0.1:8080")
    print("  Live Web Dashboard: http://127.0.0.1:8080/dashboard")
    print("  API Docs (Swagger): http://127.0.0.1:8080/docs")
    print("=" * 60 + "\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
