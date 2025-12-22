from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
import base64
import os
from detection_core import HelmetDetector


app = Flask(__name__)
CORS(app)




# Check if running in memory-constrained environment (e.g. free tier cloud)
low_memory_mode = os.environ.get('LOW_MEMORY_MODE', 'false').lower() == 'true'

if low_memory_mode:
    print("Running in LOW MEMORY MODE (Using Nano model for all tasks)")
    detector_nano = HelmetDetector("Weights/YOLOV8N/best.pt")
    detector_image = detector_nano
    detector_video = detector_nano
    detector_webcam = detector_nano
else:
    detector_image = HelmetDetector("Weights/YOLOV8L/best.pt")
    print("Loaded Image Model (Large)")
    detector_video = HelmetDetector("Weights/YOLOV8N/best.pt")
    print("Loaded Video Model (Nano)")
    detector_webcam = HelmetDetector("Weights/YOLOV8S/best.pt")
    print("Loaded Webcam Model (Small)")


def process_image(image_data, mode='image'):
    """Process image and return detection results"""

    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return None, []
    

    if mode == 'video':
        detector = detector_video
        print("Using Video Detector (Nano)")
    elif mode == 'webcam':
        detector = detector_webcam
        print("Using Webcam Detector (Small)")
    else:
        detector = detector_image
        print("Using Image Detector (Large)")

    processed_img, detections = detector.detect_and_annotate(img)
    

    _, buffer = cv2.imencode('.jpg', processed_img, [cv2.IMWRITE_JPEG_QUALITY, 70])
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return img_base64, detections

@app.route('/')
def index():
    """Serve main page"""
    return render_template('index.html')

@app.route('/detect', methods=['POST'])
def detect():
    """Handle image upload and detection"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    try:
        image_data = file.read()
        mode = request.form.get('mode', 'image')

        annotated_flag = request.form.get('annotated', 'false').lower() in ('1', 'true', 'yes', 'on')

        processed_image, detections = process_image(image_data, mode)
        
        if processed_image is None:
            return jsonify({'error': 'Could not process image'}), 400
        

        with_helmet = sum(1 for d in detections if d['label'] == 'With Helmet')
        without_helmet = sum(1 for d in detections if d['label'] == 'Without Helmet')
        
        response = {
            'success': True,
            'detections': detections,
            'stats': {
                'total': len(detections),
                'with_helmet': with_helmet,
                'without_helmet': without_helmet
            }
        }


        if annotated_flag:
            response['image'] = processed_image

        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/sample/<filename>')
def sample_image(filename):
    """Serve sample images"""
    return send_from_directory('Media', filename)

@app.route('/samples')
def get_samples():
    """Get list of sample images and videos"""
    media_dir = 'Media'
    images = []
    videos = []
    if os.path.exists(media_dir):
        for f in os.listdir(media_dir):
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                images.append(f)
            elif f.lower().endswith(('.mp4', '.avi', '.mov')):
                videos.append(f)
    return jsonify({'images': images, 'videos': videos})

if __name__ == '__main__':

    app.run(debug=False, host='0.0.0.0', port=5000, use_reloader=False)
