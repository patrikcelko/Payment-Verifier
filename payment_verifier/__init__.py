"""
Payment Verifier
================

Payment status verification service.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from payment_verifier.api import router
from payment_verifier.utilities.lifespan import lifespan

__version__: str = '1.5.11'

_BASE_DIR = Path(__file__).parent


app = FastAPI(
    title='Payment Verifier',
    version=__version__,
    description='Internal service for verifying project payment status.',
    lifespan=lifespan,
)
"""Application instance."""

app.mount('/static', StaticFiles(directory=str(_BASE_DIR / 'static')), name='static')
app.include_router(router)

__all__ = ['app', '__version__']
