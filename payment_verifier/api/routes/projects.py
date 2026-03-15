"""
Project management
==================
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from payment_verifier.api.dependencies import DBSession, get_current_user
from payment_verifier.api.schemas.common import MessageResponse
from payment_verifier.api.schemas.project import (
    NoteCreate,
    NoteListResponse,
    NoteResponse,
    ProjectCreate,
    ProjectListResponse,
    ProjectMessageResponse,
    ProjectMessagesResponse,
    ProjectResponse,
    ProjectStatusUpdate,
    ProjectUpdate,
    StatusMessageListResponse,
    StatusMessageResponse,
    StatusMessageUpdate,
)
from payment_verifier.database.models.project import (
    create_project,
    delete_project,
    get_project_by_id,
    get_project_by_name,
    list_projects_by_user,
    update_project,
    update_project_status,
)
from payment_verifier.database.models.project_note import (
    create_note,
    delete_note,
    get_note_by_id,
    list_notes,
)
from payment_verifier.database.models.status_message import (
    DEFAULT_MESSAGES,
    delete_project_message,
    list_project_messages,
    list_status_messages,
    reset_project_messages,
    reset_status_messages,
    upsert_status_message,
)
from payment_verifier.database.models.user import User

router = APIRouter()


@router.get(
    "/api/projects",
    response_model=ProjectListResponse,
    summary="List all projects",
    tags=["projects"],
)
async def api_list_projects(
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> ProjectListResponse:
    """Return projects for the authenticated user."""

    rows = await list_projects_by_user(session, user.id)
    return ProjectListResponse(
        count=len(rows),
        projects=[ProjectResponse.model_validate(r) for r in rows],
    )


@router.get(
    "/api/projects/{project_id}",
    response_model=ProjectResponse,
    summary="Get project by ID",
    tags=["projects"],
)
async def api_get_project(
    project_id: int,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> ProjectResponse:
    """Return a single project if owned by the authenticated user."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse.model_validate(row)


@router.post(
    "/api/projects",
    response_model=ProjectResponse,
    status_code=201,
    summary="Create a new project",
    tags=["projects"],
)
async def api_create_project(
    body: ProjectCreate,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> ProjectResponse:
    """Register a new project in the payment registry."""

    existing = await get_project_by_name(session, body.name)
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Project {body.name} already exists")

    row = await create_project(
        session,
        user_id=user.id,
        name=body.name,
        status=body.status,
        customer_name=body.customer_name,
        customer_address=body.customer_address,
        project_url=body.project_url,
        contact_person=body.contact_person,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone,
    )
    return ProjectResponse.model_validate(row)


@router.patch(
    "/api/projects/{project_id}/status",
    response_model=ProjectResponse,
    summary="Update project status",
    tags=["projects"],
)
async def api_update_status(
    project_id: int,
    body: ProjectStatusUpdate,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> ProjectResponse:
    """Change the payment status of a project if owned by the authenticated user."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    updated = await update_project_status(session, row, body.status)
    return ProjectResponse.model_validate(updated)


@router.patch(
    "/api/projects/{project_id}",
    response_model=ProjectResponse,
    summary="Update project details",
    tags=["projects"],
)
async def api_update_project(
    project_id: int,
    body: ProjectUpdate,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> ProjectResponse:
    """Update customer info, contact details, and project URL."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    updated = await update_project(
        session,
        row,
        fields_set=frozenset(body.model_fields_set),
        customer_name=body.customer_name,
        customer_address=body.customer_address,
        project_url=body.project_url,
        contact_person=body.contact_person,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone,
    )
    return ProjectResponse.model_validate(updated)


@router.delete(
    "/api/projects/{project_id}",
    response_model=MessageResponse,
    summary="Delete a project",
    tags=["projects"],
)
async def api_delete_project(
    project_id: int,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Remove a project from the registry."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    await delete_project(session, row)

    return MessageResponse(detail=f"Project {row.name} deleted")


@router.get(
    "/api/projects/{project_id}/notes",
    response_model=NoteListResponse,
    summary="List notes for a project",
    tags=["notes"],
)
async def api_list_notes(
    project_id: int,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> NoteListResponse:
    """Return all notes for a project, newest first."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    notes = await list_notes(session, project_id)
    return NoteListResponse(
        count=len(notes),
        notes=[NoteResponse.model_validate(n) for n in notes],
    )


@router.post(
    "/api/projects/{project_id}/notes",
    response_model=NoteResponse,
    status_code=201,
    summary="Add a note to a project",
    tags=["notes"],
)
async def api_create_note(
    project_id: int,
    body: NoteCreate,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> NoteResponse:
    """Attach a new note to a project."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    note = await create_note(session, project_id=project_id, content=body.content)
    return NoteResponse.model_validate(note)


@router.delete(
    "/api/projects/{project_id}/notes/{note_id}",
    response_model=MessageResponse,
    summary="Delete a note",
    tags=["notes"],
)
async def api_delete_note(
    project_id: int,
    note_id: int,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Remove a note from a project."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    note = await get_note_by_id(session, note_id)
    if note is None or note.project_id != project_id:
        raise HTTPException(status_code=404, detail="Note not found")

    await delete_note(session, note)
    return MessageResponse(detail="Note deleted")


@router.get(
    "/api/status-messages",
    response_model=StatusMessageListResponse,
    summary="List all status messages",
    tags=["status-messages"],
)
async def api_list_status_messages(
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> StatusMessageListResponse:
    """Return all custom status messages, merged with defaults."""

    rows = await list_status_messages(session)
    stored = {r.status: r for r in rows}
    merged: list[StatusMessageResponse] = []
    for status in sorted(DEFAULT_MESSAGES):
        if status in stored:
            merged.append(StatusMessageResponse.model_validate(stored[status]))
            continue

        merged.append(StatusMessageResponse(status=status, message=DEFAULT_MESSAGES[status]))

    return StatusMessageListResponse(messages=merged)


@router.put(
    "/api/status-messages/{status}",
    response_model=StatusMessageResponse,
    summary="Update a status message",
    tags=["status-messages"],
)
async def api_update_status_message(
    status: str,
    body: StatusMessageUpdate,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> StatusMessageResponse:
    """Set a custom message for the given status."""

    upper = status.upper()
    if upper not in DEFAULT_MESSAGES:
        raise HTTPException(
            status_code=404,
            detail=f"Status {upper} has no configurable message",
        )

    row = await upsert_status_message(session, status=upper, message=body.message)
    return StatusMessageResponse.model_validate(row)


@router.post(
    "/api/status-messages/reset",
    response_model=StatusMessageListResponse,
    summary="Reset all status messages to defaults",
    tags=["status-messages"],
)
async def api_reset_status_messages(
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> StatusMessageListResponse:
    """Restore every status message to its built-in default."""

    rows = await reset_status_messages(session)
    return StatusMessageListResponse(
        messages=[StatusMessageResponse.model_validate(r) for r in rows],
    )


@router.get(
    "/api/projects/{project_id}/messages",
    response_model=ProjectMessagesResponse,
    summary="List effective messages for a project",
    tags=["project-messages"],
)
async def api_list_project_messages(
    project_id: int,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> ProjectMessagesResponse:
    """Return the effective message for each blocked status.

    Shows whether each message is overridden at the project level or
    falls back to the global / built-in default.
    """

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    project_rows = await list_project_messages(session, project_id)
    project_map = {r.status: r.message for r in project_rows}
    global_rows = await list_status_messages(session)
    global_map = {r.status: r.message for r in global_rows}

    messages: list[ProjectMessageResponse] = []
    for status in sorted(DEFAULT_MESSAGES):
        default_msg = global_map.get(status, DEFAULT_MESSAGES[status])
        if status in project_map:
            messages.append(
                ProjectMessageResponse(
                    status=status,
                    message=project_map[status],
                    is_custom=True,
                    default_message=default_msg,
                )
            )
        else:
            messages.append(
                ProjectMessageResponse(
                    status=status,
                    message=default_msg,
                    is_custom=False,
                    default_message=default_msg,
                )
            )
    return ProjectMessagesResponse(project_id=project_id, messages=messages)


@router.put(
    "/api/projects/{project_id}/messages/{status}",
    response_model=StatusMessageResponse,
    summary="Set a custom message for a project status",
    tags=["project-messages"],
)
async def api_set_project_message(
    project_id: int,
    status: str,
    body: StatusMessageUpdate,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> StatusMessageResponse:
    """Override the message for a specific status on one project."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    upper = status.upper()
    if upper not in DEFAULT_MESSAGES:
        raise HTTPException(
            status_code=404,
            detail=f"Status {upper} has no configurable message",
        )

    msg = await upsert_status_message(
        session,
        status=upper,
        message=body.message,
        project_id=project_id,
    )
    return StatusMessageResponse.model_validate(msg)


@router.delete(
    "/api/projects/{project_id}/messages/{status}",
    response_model=MessageResponse,
    summary="Remove a project-specific message override",
    tags=["project-messages"],
)
async def api_delete_project_message(
    project_id: int,
    status: str,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Remove the project-level override so the global default is used."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    upper = status.upper()
    deleted = await delete_project_message(session, project_id=project_id, status=upper)

    if not deleted:
        raise HTTPException(status_code=404, detail="No custom override for this status")
    return MessageResponse(detail=f"Custom message for {upper} removed")


@router.post(
    "/api/projects/{project_id}/messages/reset",
    response_model=MessageResponse,
    summary="Remove all project-specific message overrides",
    tags=["project-messages"],
)
async def api_reset_project_messages(
    project_id: int,
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Remove every project-level message override."""

    row = await get_project_by_id(session, project_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    await reset_project_messages(session, project_id)

    return MessageResponse(detail="Project message overrides removed")
