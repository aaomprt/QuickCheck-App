import numpy as np
import onnxruntime as ort
from PIL import Image
import io

IMG_SIZE = 256
CLASS_NAMES = ['Minor', 'Moderate', 'Severe']

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)

class ModelPredictService:
    def __init__(self, model_path: str):
        self.session = ort.InferenceSession(model_path)  # โหลดโมเดลด้วย ONNX Runtime
        self.input_name = self.session.get_inputs()[0].name
        
    def _preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB') # อ่านรูปด้วย Pillow
        img = img.resize((IMG_SIZE, IMG_SIZE))
        img_array = np.array(img).astype(np.float32) / 255.0 #แปลงเป็น Numpy
        img_array = np.transpose(img_array, (2, 0, 1))
        img_array = (img_array - MEAN) / STD # Normalize
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
        
    def predict(self, image_bytes: bytes) -> tuple[str, float, dict]:
        x = self._preprocess_image(image_bytes)
        logits = self.session.run(None, {self.input_name: x})[0][0] # Predict ด้วย ONNX
        exp_logits = np.exp(logits - np.max(logits))
        prob = exp_logits / exp_logits.sum()

        pred_idx = int(np.argmax(prob))
        level = CLASS_NAMES[pred_idx]
        conf = float(prob[pred_idx])

        return level, conf