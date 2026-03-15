"""
Payment Verifier
================

Payment status verification service.
"""

import os
from pathlib import Path

__version__: str = "1.5.11"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from payment_verifier.api import router
from payment_verifier.utilities.lifespan import lifespan
from payment_verifier.utilities.rate_limit import limiter

_BASE_DIR = Path(__file__).parent


app = FastAPI(
    title="Payment Verifier",
    version=__version__,
    description="Internal service for verifying project payment status.",
    lifespan=lifespan,
)
"""Application instance."""

app.state.limiter = limiter

_cors_origins_raw = os.environ.get("PV_CORS_ORIGINS", "*")
_cors_origins: list[str] = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials="*" not in _cors_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(_BASE_DIR / "static")), name="static")
app.include_router(router)

__all__ = ["app", "__version__"]
