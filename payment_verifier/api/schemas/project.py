"""
Project schemas
================
"""

import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Valid status values
StatusType = Literal["OK", "UNPAID", "PENDING", "OVERDUE", "PARTIAL", "SUSPENDED"]


class ProjectCreate(BaseModel):
    """Body for creating a new project."""

    name: str = Field(..., min_length=1, max_length=255, examples=["Sport-Betting-App"])
    """Unique project name, used for verification (e.g. in the `project` query parameter)."""

    status: StatusType = Field(default="OK", examples=["OK", "UNPAID", "PENDING"])
    """Initial payment status for the project."""

    customer_name: str | None = Field(default=None, max_length=255, examples=["Acme Corp"])
    """Customer name associated with the project, for reference."""

    customer_address: str | None = Field(default=None, examples=["123 Main St, Prague"])
    """Customer address, for reference."""

    project_url: str | None = Field(default=None, max_length=500, examples=["https://example.com"])
    """URL of the project or related page, for reference."""

    contact_person: str | None = Field(default=None, max_length=255, examples=["John Doe"])
    """Contact person for the project, for reference."""

    contact_email: str | None = Field(default=None, max_length=255, examples=["john@acme.com"])
    """Contact email for the project, for reference."""

    contact_phone: str | None = Field(default=None, max_length=50, examples=["+421 900 123 456"])
    """Contact phone number for the project, for reference."""


class ProjectStatusUpdate(BaseModel):
    """Body for updating a project's payment status."""

    status: StatusType = Field(..., examples=["OK", "UNPAID", "PENDING"])
    """New payment status for the project."""


class ProjectUpdate(BaseModel):
    """Body for updating project detail fields."""

    customer_name: str | None = Field(default=None, max_length=255, examples=["Acme Corp"])
    """Customer name associated with the project, for reference."""

    customer_address: str | None = Field(default=None, examples=["123 Main St, Prague"])
    """Customer address, for reference."""

    project_url: str | None = Field(default=None, max_length=500, examples=["https://example.com"])
    """URL of the project or related page, for reference."""

    contact_person: str | None = Field(default=None, max_length=255, examples=["John Doe"])
    """Contact person for the project, for reference."""

    contact_email: str | None = Field(default=None, max_length=255, examples=["john@acme.com"])
    """Contact email for the project, for reference."""

    contact_phone: str | None = Field(default=None, max_length=50, examples=["+421 900 123 456"])
    """Contact phone number for the project, for reference."""


class ProjectResponse(BaseModel):
    """Single project representation."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    """Unique identifier for the project."""

    name: str
    """Unique project name, used for verification (e.g. in the `project`
    query parameter).
    """

    status: str
    """Current payment status of the project."""

    customer_name: str | None
    """Customer name associated with the project, for reference."""

    customer_address: str | None
    """Customer address, for reference."""

    project_url: str | None
    """URL of the project or related page, for reference."""

    contact_person: str | None
    """Contact person for the project, for reference."""

    contact_email: str | None
    """Contact email for the project, for reference."""

    contact_phone: str | None
    """Contact phone number for the project, for reference."""

    created_at: datetime.datetime
    """Timestamp when the project was created."""

    updated_at: datetime.datetime
    """Timestamp when the project was last updated."""

    last_queried_at: datetime.datetime | None
    """Timestamp when the project was last queried."""


class ProjectListResponse(BaseModel):
    """List wrapper returned by the list endpoint."""

    count: int
    """Number of projects in the current response."""

    projects: list[ProjectResponse]
    """List of projects in the current response."""


class NoteCreate(BaseModel):
    """Body for creating a new note."""

    content: str = Field(..., min_length=1, max_length=5000, examples=["Customer called, requesting extension."])
    """Content of the note."""


class NoteResponse(BaseModel):
    """Single note representation."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    """Unique identifier for the note."""

    project_id: int
    """Identifier of the associated project."""

    content: str
    """Content of the note."""

    created_at: datetime.datetime
    """Timestamp when the note was created."""


class NoteListResponse(BaseModel):
    """List wrapper returned by the notes list endpoint."""

    count: int
    """Number of notes in the current response."""

    notes: list[NoteResponse]
    """List of notes in the current response."""


class StatusMessageUpdate(BaseModel):
    """Body for updating a single status message."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        examples=["Payment is required. Service access is restricted."],
    )
    """New message text for the status."""


class StatusMessageResponse(BaseModel):
    """Single status message representation."""

    model_config = ConfigDict(from_attributes=True)

    status: str
    """Status value this message applies to."""

    message: str
    """Message text for this status."""


class StatusMessageListResponse(BaseModel):
    """All status messages (with defaults)."""

    messages: list[StatusMessageResponse]
    """List of status messages."""


class ProjectMessageResponse(BaseModel):
    """A single status message with source info."""

    status: str
    """Status value this message applies to."""

    message: str
    """Message text for this status."""

    is_custom: bool = Field(
        description="True if the project has its own custom message for this status.",
    )
    """Indicates whether this message is a custom message defined for the project (True) or a
    default/global message (False).
    """

    default_message: str = Field(
        description="The global/default message for reference.",
    )
    """The global/default message text for this status, included for reference
    when a project has a custom message defined (is_custom=True).
    """


class ProjectMessagesResponse(BaseModel):
    """All effective messages for a project."""

    project_id: int
    """Identifier of the project these messages apply to."""

    messages: list[ProjectMessageResponse]
    """List of effective messages for the project."""
