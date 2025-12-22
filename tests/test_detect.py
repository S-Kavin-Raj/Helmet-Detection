import io
import base64
import pytest
from app import app

SAMPLE_DETECTIONS = [
    {'label': 'With Helmet', 'confidence': 0.95, 'bbox': [10, 10, 100, 150], 'class_id': 0}
]


@pytest.fixture(autouse=True)
def patch_process_image(monkeypatch):

    def fake_process_image(image_data, mode='image'):

        fake_jpeg = base64.b64encode(b'\xff\xd8\xff\xd9').decode('utf-8')
        return fake_jpeg, SAMPLE_DETECTIONS

    monkeypatch.setattr('app.process_image', fake_process_image)


@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


def test_detect_compact_json(client):
    data = {
        'mode': 'image'
    }
    file_bytes = io.BytesIO(b'test')
    response = client.post('/detect', data={'image': (file_bytes, 'test.jpg'), 'mode': 'image'}, content_type='multipart/form-data')
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data['success'] is True
    assert 'detections' in json_data
    assert 'image' not in json_data


def test_detect_with_annotated(client):
    data = {
        'mode': 'image',
        'annotated': 'true'
    }
    file_bytes = io.BytesIO(b'test')
    response = client.post('/detect', data={'image': (file_bytes, 'test.jpg'), 'mode': 'image', 'annotated': 'true'}, content_type='multipart/form-data')
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data['success'] is True
    assert 'detections' in json_data
    assert 'image' in json_data
