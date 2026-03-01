"""
Request-log schemas
===================
"""

from __future__ import annotations

import datetime

from pydantic import BaseModel, ConfigDict, Field


class RequestLogResponse(BaseModel):
    """Single request log entry."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    """Unique identifier for the log entry."""

    project_name: str
    """Name of the project associated with the request."""

    status_code: int
    """HTTP status code returned for the request."""

    response_text: str
    """Text content of the response returned for the request."""

    client_ip: str
    """IP address of the client making the request."""

    created_at: datetime.datetime
    """Timestamp when the request was created."""


class RequestLogListResponse(BaseModel):
    """Paginated list of request logs."""

    count: int
    """Number of log entries in the current response."""

    total: int
    """Total number of log entries matching the query (for pagination)."""

    logs: list[RequestLogResponse]
    """List of log entries in the current response."""


class LogStatsResponse(BaseModel):
    """Aggregated log statistics by status code."""

    total: int = 0
    """Total number of log entries."""

    ok: int = Field(default=0, alias='200')
    """Number of log entries with HTTP status code 200."""

    unpaid: int = Field(default=0, alias='402')
    """Number of log entries with HTTP status code 402."""

    not_found: int = Field(default=0, alias='404')
    """Number of log entries with HTTP status code 404."""

    model_config = ConfigDict(populate_by_name=True)
