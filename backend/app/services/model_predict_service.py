import numpy as np
import tensorflow as tf

IMG_SIZE = 256
CLASS_NAMES = ['Minor', 'Moderate', 'Severe']

class ModelPredictService:
    def __init__(self, model: tf.keras.Model):
        self.model = model
        
    def _preprocess_image(self, image_bytes: bytes) -> tf.Tensor:
        x = tf.io.decode_image(image_bytes, channels=3, expand_animations=False)
        x = tf.image.resize(x, (IMG_SIZE, IMG_SIZE))
        x = tf.cast(x, tf.float32)
        x = tf.keras.applications.mobilenet_v3.preprocess_input(x)
        x = tf.expand_dims(x, axis=0)
        return x
        
    def predict(self, image_bytes: bytes) -> tuple[str, float, dict]:
        x = self._preprocess_image(image_bytes)
        prob = self.model.predict(x, verbose=0)[0]
        
        pred_idx = int(np.argmax(prob))
        level = CLASS_NAMES[pred_idx]
        conf = float(prob[pred_idx])
        prob_dict = {CLASS_NAMES[i]: float(prob[i]) for i in range(len(CLASS_NAMES))}
        
        return level, conf, prob_dict
        