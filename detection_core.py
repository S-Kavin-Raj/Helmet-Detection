import cv2
import numpy as np
import math
from ultralytics import YOLO

class HelmetDetector:
    def __init__(self, model_path="Weights/best.pt"):
        import torch
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Loading YOLO model on {self.device}...")
        self.model = YOLO(model_path)
        self.class_labels = ['With Helmet', 'Without Helmet']
        self.colors = {
            0: (0, 255, 0),
            1: (0, 0, 255)
        }

    def detect_and_annotate(self, img, conf_threshold=0.1):
        """
        Run detection on a frame and draw bounding boxes + labels.
        Returns:
            processed_img: The image with annotations
            detections: List of detection dicts
        """
        if img is None:
            return None, []

        results = self.model(img, verbose=False, device=self.device)
        detections = []

        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0]
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                
                conf = math.ceil((box.conf[0] * 100)) / 100
                cls = int(box.cls[0])
                
                if conf > conf_threshold:
                    label = self.class_labels[cls] if cls < len(self.class_labels) else str(cls)
                    color = self.colors.get(cls, (255, 255, 255))

                    cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)
                    
                    label_text = f'{label} {conf:.0%}'
                    (text_width, text_height), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)

                    label_y = max(y1 - 10, text_height + 10)
                    
                    cv2.rectangle(img, (x1, label_y - text_height - 5), (x1 + text_width + 10, label_y + 5), color, -1)
                    cv2.putText(img, label_text, (x1 + 5, label_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                    
                    detections.append({
                        'label': label,
                        'confidence': float(conf),
                        'bbox': [x1, y1, x2, y2],
                        'class_id': cls
                    })
        
        return img, detections
