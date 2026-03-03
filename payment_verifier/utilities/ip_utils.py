"""
IP address validation
=====================
"""

import ipaddress


def validate_ip_address(ip_str: str) -> str | None:
    """Validate and normalize an IP address string."""

    if not ip_str or not isinstance(ip_str, str):
        return None

    ip_str = ip_str.strip()
    if not ip_str or len(ip_str) > 45:  # Max length for IPv6 with zones
        return None

    try:
        ip = ipaddress.ip_address(ip_str)
        return str(ip)
    except ValueError:
        return None


def extract_client_ip(x_forwarded_for: str | None) -> str | None:
    """Safely extract client IP from X-Forwarded-For header."""

    if not x_forwarded_for:
        return None

    for ip_str in x_forwarded_for.split(","):
        ip_str = ip_str.strip()
        if ip_str:
            valid_ip = validate_ip_address(ip_str)
            if valid_ip:
                return valid_ip

    return None


__all__ = ["validate_ip_address", "extract_client_ip"]
