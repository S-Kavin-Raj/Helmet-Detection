import io
import base64
import sys, os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

SAMPLE_DETECTIONS = [
    {'label': 'With Helmet', 'confidence': 0.95, 'bbox': [10, 10, 100, 150], 'class_id': 0}
]


import app as app_module

def fake_process_image(image_data, mode='image'):
    fake_jpeg = base64.b64encode(b'\xff\xd8\xff\xd9').decode('utf-8')
    return fake_jpeg, SAMPLE_DETECTIONS

app_module.process_image = fake_process_image

with app.test_client() as client:

    file_bytes = io.BytesIO(b'test')
    resp = client.post('/detect', data={'image': (file_bytes, 'test.jpg'), 'mode': 'image'}, content_type='multipart/form-data')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'detections' in data
    assert 'image' not in data
    print('Compact JSON test passed')


    file_bytes = io.BytesIO(b'test')
    resp = client.post('/detect', data={'image': (file_bytes, 'test.jpg'), 'mode': 'image', 'annotated': 'true'}, content_type='multipart/form-data')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'detections' in data
    assert 'image' in data
    print('Annotated image test passed')

print('All backend smoke tests passed')
