"""
Rate limiting
=============
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri=None,
)

RATE_LIMIT_AUTH = "5/minute"

__all__ = ["limiter", "RATE_LIMIT_AUTH"]
