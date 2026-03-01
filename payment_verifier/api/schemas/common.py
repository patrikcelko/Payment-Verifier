"""
Common schemas
================
"""

from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Simple message envelope."""

    detail: str
    """A human-readable message describing the response, typically used for
    error details or informational messages.
    """
