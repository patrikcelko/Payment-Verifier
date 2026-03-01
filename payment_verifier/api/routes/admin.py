"""
Admin dashboard routes
======================
"""

from pathlib import Path

from fastapi import APIRouter, Request, Response
from fastapi.templating import Jinja2Templates

from payment_verifier import __version__

router = APIRouter()

_BASE_DIR = Path(__file__).parent.parent.parent
templates = Jinja2Templates(directory=str(_BASE_DIR / "templates"))


@router.get("/admin", include_in_schema=False)
async def admin_dashboard(request: Request) -> Response:
    """Serve the admin dashboard SPA."""

    return templates.TemplateResponse("admin.html", {"request": request, "version": __version__})
