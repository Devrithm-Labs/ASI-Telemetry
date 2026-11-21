"""Compatibility shim for LLM router."""
from api.llm import router, router as llm_router

__all__ = ["router", "llm_router"]
