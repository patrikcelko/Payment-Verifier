"""
Tests project endpoints
=======================
"""

from httpx import AsyncClient


async def test_list_projects_empty(client: AsyncClient) -> None:
    """Test listing projects returns empty array when no projects exist"""

    resp = await client.get('/api/projects')
    assert resp.status_code == 200
    data = resp.json()
    assert data['count'] == 0
    assert data['projects'] == []


async def test_create_project(client: AsyncClient) -> None:
    """Test creating a new project returns HTTP 201 with project data"""

    resp = await client.post('/api/projects', json={'name': 'New-App', 'status': 'OK'})
    assert resp.status_code == 201
    data = resp.json()
    assert data['name'] == 'New-App'
    assert data['status'] == 'OK'
    assert 'id' in data


async def test_create_duplicate_returns_409(client: AsyncClient) -> None:
    """Test creating duplicate project returns HTTP 409"""

    await client.post('/api/projects', json={'name': 'Dup-App'})
    resp = await client.post('/api/projects', json={'name': 'Dup-App'})
    assert resp.status_code == 409


async def test_create_empty_name_returns_422(client: AsyncClient) -> None:
    """Test creating project with empty name returns HTTP 422"""

    resp = await client.post('/api/projects', json={'name': '', 'status': 'OK'})
    assert resp.status_code == 422


async def test_get_project_by_id(client: AsyncClient) -> None:
    """Test getting project by ID returns HTTP 200 with project data"""

    create_resp = await client.post('/api/projects', json={'name': 'Get-Me'})
    pid = create_resp.json()['id']
    resp = await client.get(f'/api/projects/{pid}')
    assert resp.status_code == 200
    assert resp.json()['name'] == 'Get-Me'


async def test_get_project_not_found(client: AsyncClient) -> None:
    """Test getting non-existent project returns HTTP 404"""

    resp = await client.get('/api/projects/99999')
    assert resp.status_code == 404


async def test_delete_project(client: AsyncClient) -> None:
    """Test deleting project removes it from database"""

    create_resp = await client.post('/api/projects', json={'name': 'DeleteMe'})
    pid = create_resp.json()['id']
    resp = await client.delete(f'/api/projects/{pid}')
    assert resp.status_code == 200

    assert (await client.get(f'/api/projects/{pid}')).status_code == 404


async def test_delete_project_not_found(client: AsyncClient) -> None:
    """Test deleting non-existent project returns HTTP 404"""

    resp = await client.delete('/api/projects/99999')
    assert resp.status_code == 404


async def test_list_projects_sorted_by_name(client: AsyncClient) -> None:
    """Test listing projects returns them sorted alphabetically by name"""

    await client.post('/api/projects', json={'name': 'Zebra'})
    await client.post('/api/projects', json={'name': 'Alpha'})
    await client.post('/api/projects', json={'name': 'Mango'})
    data = (await client.get('/api/projects')).json()
    names = [p['name'] for p in data['projects']]
    assert names == ['Alpha', 'Mango', 'Zebra']


async def test_update_status(client: AsyncClient) -> None:
    """Test updating project status returns HTTP 200 with updated status"""

    create_resp = await client.post('/api/projects', json={'name': 'StatusTest', 'status': 'OK'})
    pid = create_resp.json()['id']
    resp = await client.patch(f'/api/projects/{pid}/status', json={'status': 'UNPAID'})
    assert resp.status_code == 200
    assert resp.json()['status'] == 'UNPAID'


async def test_update_status_not_found(client: AsyncClient) -> None:
    """Test updating status of non-existent project returns HTTP 404"""

    resp = await client.patch('/api/projects/99999/status', json={'status': 'OK'})
    assert resp.status_code == 404


async def test_update_status_invalid_rejected(client: AsyncClient) -> None:
    """Test updating to invalid status returns HTTP 422"""

    resp = await client.post('/api/projects', json={'name': 'BadStatus'})
    pid = resp.json()['id']
    resp = await client.patch(f'/api/projects/{pid}/status', json={'status': 'INVALID'})
    assert resp.status_code == 422


async def test_all_valid_statuses_accepted(client: AsyncClient) -> None:
    """Test all valid status values are accepted when creating projects"""

    for status in ('OK', 'UNPAID', 'PENDING', 'OVERDUE', 'PARTIAL', 'SUSPENDED'):
        resp = await client.post(
            '/api/projects', json={'name': f'S-{status}', 'status': status},
        )
        assert resp.status_code == 201
        assert resp.json()['status'] == status


async def test_create_with_customer_fields(client: AsyncClient) -> None:
    """Test creating project with customer fields stores all values"""

    resp = await client.post('/api/projects', json={
        'name': 'Customer-App', 'status': 'OK',
        'customer_name': 'Acme Corp',
        'customer_address': '123 Main St, Prague',
        'project_url': 'https://acme.example.com',
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data['customer_name'] == 'Acme Corp'
    assert data['customer_address'] == '123 Main St, Prague'
    assert data['project_url'] == 'https://acme.example.com'


async def test_create_with_contact_fields(client: AsyncClient) -> None:
    """Test creating project with contact fields stores all values"""

    resp = await client.post('/api/projects', json={
        'name': 'Contact-App',
        'contact_person': 'John Doe',
        'contact_email': 'john@example.com',
        'contact_phone': '+421900111222',
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data['contact_person'] == 'John Doe'
    assert data['contact_email'] == 'john@example.com'
    assert data['contact_phone'] == '+421900111222'


async def test_create_without_optional_fields_defaults_to_null(client: AsyncClient) -> None:
    """Test creating project without optional fields defaults them to None"""

    resp = await client.post('/api/projects', json={'name': 'NoCust'})
    assert resp.status_code == 201
    data = resp.json()
    assert data['customer_name'] is None
    assert data['contact_person'] is None


async def test_update_project_details(client: AsyncClient) -> None:
    """Test updating project details via PATCH updates specified fields"""

    resp = await client.post('/api/projects', json={'name': 'EditMe'})
    pid = resp.json()['id']
    resp = await client.patch(f'/api/projects/{pid}', json={
        'customer_name': 'New Client',
        'customer_address': '456 Oak Ave',
        'project_url': 'https://new.example.com',
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data['customer_name'] == 'New Client'
    assert data['customer_address'] == '456 Oak Ave'
    assert data['project_url'] == 'https://new.example.com'


async def test_update_project_partial_preserves_other_fields(client: AsyncClient) -> None:
    """Test partial project update preserves unspecified fields"""

    await client.post('/api/projects', json={
        'name': 'PartialEdit',
        'customer_name': 'Original',
        'project_url': 'https://orig.example.com',
    })
    pid = resp.json()['id']  # noqa
    resp = await client.patch(f'/api/projects/{pid}', json={'customer_name': 'Changed'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['customer_name'] == 'Changed'
    assert data['project_url'] == 'https://orig.example.com'


async def test_update_project_contacts(client: AsyncClient) -> None:
    """Test updating project contact information via PATCH"""

    resp = await client.post('/api/projects', json={'name': 'ContactEdit'})
    pid = resp.json()['id']
    resp = await client.patch(f'/api/projects/{pid}', json={
        'contact_person': 'Jane',
        'contact_email': 'jane@example.com',
        'contact_phone': '+421911',
    })
    assert resp.status_code == 200
    assert resp.json()['contact_person'] == 'Jane'


async def test_update_project_not_found(client: AsyncClient) -> None:
    """Test updating non-existent project returns HTTP 404"""

    resp = await client.patch('/api/projects/99999', json={'customer_name': 'Ghost'})
    assert resp.status_code == 404
