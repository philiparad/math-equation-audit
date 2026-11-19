import os
import tempfile
from pathlib import Path

# Isolate from user data; evaluated before importing the ASGI application.
TEST_DIR = tempfile.TemporaryDirectory(prefix='mathaudit-test-')
os.environ['DATA_DIR'] = TEST_DIR.name
os.environ.pop('APP_ACCESS_TOKEN', None)
os.environ['APP_ENV'] = 'development'

import pytest
from fastapi.testclient import TestClient
from backend.app import app

@pytest.fixture(scope='session')
def client():
    with TestClient(app) as c:
        yield c
