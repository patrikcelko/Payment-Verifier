"""
API routes
==========
"""

from fastapi import APIRouter

from payment_verifier.api.routes.admin import router as admin_router
from payment_verifier.api.routes.logs import router as logs_router
from payment_verifier.api.routes.projects import router as projects_router
from payment_verifier.api.routes.verification import router as verification_router

router = APIRouter()
router.include_router(admin_router)
router.include_router(verification_router)
router.include_router(projects_router)
router.include_router(logs_router)

__all__ = ["router"]
