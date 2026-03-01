"""
Test Project
============
"""

from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.models.project import (
    create_project,
    delete_project,
    get_project_by_id,
    get_project_by_name,
    list_projects,
    touch_last_queried,
    update_project,
    update_project_status,
)


async def test_create_and_get_by_name(session: AsyncSession) -> None:
    """Test creating a project and retrieving it by name"""

    project = await create_project(session, name='TestProject', status='OK')
    assert project.id is not None
    fetched = await get_project_by_name(session, 'TestProject')
    assert fetched is not None
    assert fetched.name == 'TestProject'
    assert fetched.status == 'OK'


async def test_get_by_name_not_found(session: AsyncSession) -> None:
    """Test retrieving a non-existent project by name returns None"""

    assert await get_project_by_name(session, 'Ghost') is None


async def test_get_by_id(session: AsyncSession) -> None:
    """Test retrieving a project by its ID"""

    project = await create_project(session, name='ById')
    fetched = await get_project_by_id(session, project.id)
    assert fetched is not None
    assert fetched.name == 'ById'


async def test_get_by_id_not_found(session: AsyncSession) -> None:
    """Test retrieving a non-existent project by ID returns None"""

    assert await get_project_by_id(session, 99999) is None


async def test_list_projects_sorted(session: AsyncSession) -> None:
    """Test listing projects returns them sorted alphabetically by name"""

    await create_project(session, name='B-Project')
    await create_project(session, name='A-Project')
    projects = await list_projects(session)
    assert len(projects) == 2
    assert projects[0].name == 'A-Project'
    assert projects[1].name == 'B-Project'


async def test_list_projects_empty(session: AsyncSession) -> None:
    """Test listing projects when database is empty returns empty list"""

    assert await list_projects(session) == []


async def test_default_status_is_ok(session: AsyncSession) -> None:
    """Test project created without explicit status defaults to 'OK'"""

    project = await create_project(session, name='DefaultStatus')
    assert project.status == 'OK'


async def test_delete_project(session: AsyncSession) -> None:
    """Test deleting a project removes it from the database"""

    project = await create_project(session, name='ToDelete')
    await delete_project(session, project)
    assert await get_project_by_id(session, project.id) is None


async def test_update_status(session: AsyncSession) -> None:
    """Test updating project status changes the status field"""

    project = await create_project(session, name='Toggle', status='OK')
    updated = await update_project_status(session, project, 'UNPAID')
    assert updated.status == 'UNPAID'


async def test_update_status_preserves_name(session: AsyncSession) -> None:
    """Test updating status preserves other project fields like name"""

    project = await create_project(session, name='Stable-Name', status='OK')
    updated = await update_project_status(session, project, 'UNPAID')
    assert updated.name == 'Stable-Name'


async def test_create_with_customer_fields(session: AsyncSession) -> None:
    """Test creating a project with customer-related fields"""

    project = await create_project(
        session, name='WithCustomer',
        customer_name='Acme Corp', customer_address='123 Main St',
        project_url='https://acme.example.com',
    )
    assert project.customer_name == 'Acme Corp'
    assert project.customer_address == '123 Main St'
    assert project.project_url == 'https://acme.example.com'


async def test_create_without_optional_fields(session: AsyncSession) -> None:
    """Test creating a project without optional fields leaves them as None"""

    project = await create_project(session, name='NoCustomer')
    assert project.customer_name is None
    assert project.customer_address is None
    assert project.project_url is None
    assert project.contact_person is None
    assert project.contact_email is None
    assert project.contact_phone is None


async def test_create_with_contact_fields(session: AsyncSession) -> None:
    """Test creating a project with contact person details"""

    project = await create_project(
        session, name='WithContacts',
        contact_person='John Doe', contact_email='john@example.com',
        contact_phone='+421900123456',
    )
    assert project.contact_person == 'John Doe'
    assert project.contact_email == 'john@example.com'
    assert project.contact_phone == '+421900123456'


async def test_update_project_details(session: AsyncSession) -> None:
    """Test updating multiple project detail fields at once"""

    project = await create_project(session, name='Editable')
    updated = await update_project(
        session, project,
        fields_set=frozenset(
            {'customer_name', 'customer_address', 'project_url'}
        ),
        customer_name='New Client', customer_address='456 Oak Ave',
        project_url='https://new.example.com',
    )
    assert updated.customer_name == 'New Client'
    assert updated.customer_address == '456 Oak Ave'
    assert updated.project_url == 'https://new.example.com'


async def test_update_partial_preserves_other_fields(session: AsyncSession) -> None:
    """Test partial update preserves fields not in fields_set"""

    project = await create_project(
        session, name='Partial',
        customer_name='Original', project_url='https://orig.example.com',
    )
    updated = await update_project(
        session, project,
        fields_set=frozenset({'customer_name'}),
        customer_name='Changed',
    )
    assert updated.customer_name == 'Changed'
    assert updated.project_url == 'https://orig.example.com'


async def test_update_contact_fields(session: AsyncSession) -> None:
    """Test updating contact-related fields"""

    project = await create_project(session, name='ContactEdit')
    updated = await update_project(
        session, project,
        fields_set=frozenset(
            {'contact_person', 'contact_email', 'contact_phone'}
        ),
        contact_person='Jane', contact_email='jane@example.com',
        contact_phone='+421911222333',
    )
    assert updated.contact_person == 'Jane'
    assert updated.contact_email == 'jane@example.com'
    assert updated.contact_phone == '+421911222333'


async def test_update_field_to_none_clears_it(session: AsyncSession) -> None:
    """Test updating a field to None clears the existing value"""

    project = await create_project(
        session, name='ClearMe', customer_name='Was Set',
    )
    updated = await update_project(
        session, project,
        fields_set=frozenset({'customer_name'}),
        customer_name=None,
    )
    assert updated.customer_name is None


async def test_touch_last_queried(session: AsyncSession) -> None:
    """Test touching last_queried_at sets the timestamp"""

    project = await create_project(session, name='Queried')
    assert project.last_queried_at is None
    await touch_last_queried(session, project)
    await session.refresh(project)
    assert project.last_queried_at is not None
