"""
Payment Verifier
================

Payment status verification service.
"""

from pathlib import Path

__version__: str = "1.5.11"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
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

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(_BASE_DIR / "static")), name="static")
app.include_router(router)

__all__ = ["app", "__version__"]
