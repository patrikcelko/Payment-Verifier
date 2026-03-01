"""
Tests Project note
==================
"""

from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.models.project import create_project
from payment_verifier.database.models.project_note import (
    create_note,
    delete_note,
    get_note_by_id,
    list_notes,
)


async def test_create_note(session: AsyncSession) -> None:
    """Test creating a note for a project"""

    project = await create_project(session, name="Noted")
    note = await create_note(session, project_id=project.id, content="First note")
    assert note.id is not None
    assert note.project_id == project.id
    assert note.content == "First note"
    assert note.created_at is not None


async def test_list_notes(session: AsyncSession) -> None:
    """Test listing all notes for a project"""

    project = await create_project(session, name="NoteList")
    await create_note(session, project_id=project.id, content="A")
    await create_note(session, project_id=project.id, content="B")
    notes = await list_notes(session, project.id)
    assert len(notes) == 2
    assert {n.content for n in notes} == {"A", "B"}


async def test_list_notes_empty(session: AsyncSession) -> None:
    """Test listing notes for a project with no notes returns empty list"""

    project = await create_project(session, name="NoNotes")
    assert await list_notes(session, project.id) == []


async def test_delete_note(session: AsyncSession) -> None:
    """Test deleting a note removes it from the database"""

    project = await create_project(session, name="DelNote")
    note = await create_note(session, project_id=project.id, content="Bye")
    await delete_note(session, note)
    assert await get_note_by_id(session, note.id) is None


async def test_get_note_by_id(session: AsyncSession) -> None:
    """Test retrieving a note by its ID"""

    project = await create_project(session, name="GetNote")
    note = await create_note(session, project_id=project.id, content="Find me")
    fetched = await get_note_by_id(session, note.id)
    assert fetched is not None
    assert fetched.content == "Find me"


async def test_get_note_by_id_not_found(session: AsyncSession) -> None:
    """Test retrieving a non-existent note by ID returns None"""

    assert await get_note_by_id(session, 99999) is None
