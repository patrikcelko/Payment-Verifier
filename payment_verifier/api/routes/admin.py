"""
Admin dashboard routes
======================
"""

from pathlib import Path

from fastapi import APIRouter, Request, Response
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates

from payment_verifier import __version__

router = APIRouter()

_BASE_DIR = Path(__file__).parent.parent.parent
templates = Jinja2Templates(directory=str(_BASE_DIR / "templates"))


@router.get("/admin", include_in_schema=False)
async def admin_dashboard(request: Request) -> Response:
    """Serve the admin dashboard SPA."""

    return templates.TemplateResponse(request, "main.html", {"version": __version__})


@router.get("/sw.js", include_in_schema=False)
async def service_worker() -> FileResponse:
    """Serve the service worker from the root scope."""

    return FileResponse(
        _BASE_DIR / "static" / "sw.js",
        media_type="application/javascript",
        headers={"Service-Worker-Allowed": "/", "Cache-Control": "no-cache"},
    )
