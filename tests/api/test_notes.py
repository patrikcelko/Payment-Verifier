"""
Tests notes endpoints
=====================
"""

from httpx import AsyncClient


async def test_list_notes_empty(client: AsyncClient) -> None:
    """Test listing notes returns empty array when no notes exist"""

    resp = await client.post('/api/projects', json={'name': 'NoNotes'})
    pid = resp.json()['id']
    resp = await client.get(f'/api/projects/{pid}/notes')
    assert resp.status_code == 200
    assert resp.json()['count'] == 0
    assert resp.json()['notes'] == []


async def test_create_note(client: AsyncClient) -> None:
    """Test creating a note returns HTTP 201 with note data"""

    resp = await client.post('/api/projects', json={'name': 'NoteApp'})
    pid = resp.json()['id']
    resp = await client.post(f'/api/projects/{pid}/notes', json={'content': 'First note'})
    assert resp.status_code == 201
    data = resp.json()
    assert data['content'] == 'First note'
    assert data['project_id'] == pid
    assert 'id' in data
    assert 'created_at' in data


async def test_list_notes_after_create(client: AsyncClient) -> None:
    """Test listing notes after creation shows all notes for project"""

    resp = await client.post('/api/projects', json={'name': 'ListNotes'})
    pid = resp.json()['id']
    await client.post(f'/api/projects/{pid}/notes', json={'content': 'A'})
    await client.post(f'/api/projects/{pid}/notes', json={'content': 'B'})
    resp = await client.get(f'/api/projects/{pid}/notes')
    assert resp.json()['count'] == 2


async def test_delete_note(client: AsyncClient) -> None:
    """Test deleting a note removes it from database"""

    resp = await client.post('/api/projects', json={'name': 'DelNoteApp'})
    pid = resp.json()['id']
    resp = await client.post(f'/api/projects/{pid}/notes', json={'content': 'Bye'})
    nid = resp.json()['id']
    resp = await client.delete(f'/api/projects/{pid}/notes/{nid}')
    assert resp.status_code == 200

    resp = await client.get(f'/api/projects/{pid}/notes')
    assert resp.json()['count'] == 0


async def test_delete_note_not_found(client: AsyncClient) -> None:
    """Test deleting non-existent note returns HTTP 404"""

    resp = await client.post('/api/projects', json={'name': 'NoNoteApp'})
    pid = resp.json()['id']
    resp = await client.delete(f'/api/projects/{pid}/notes/99999')
    assert resp.status_code == 404


async def test_create_note_project_not_found(client: AsyncClient) -> None:
    """Test creating note for non-existent project returns HTTP 404"""

    resp = await client.post('/api/projects/99999/notes', json={'content': 'Ghost'})
    assert resp.status_code == 404


async def test_list_notes_project_not_found(client: AsyncClient) -> None:
    """Test listing notes for non-existent project returns HTTP 404"""

    resp = await client.get('/api/projects/99999/notes')
    assert resp.status_code == 404


async def test_create_note_empty_content_rejected(client: AsyncClient) -> None:
    """Test creating note with empty content returns HTTP 422"""

    resp = await client.post('/api/projects', json={'name': 'EmptyNote'})
    pid = resp.json()['id']
    resp = await client.post(f'/api/projects/{pid}/notes', json={'content': ''})
    assert resp.status_code == 422
