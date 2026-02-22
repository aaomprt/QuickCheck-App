import os
from fastapi import FastAPI
from app.core.cors import setup_cors
from app.api.v1.router import api_router
from fastapi.staticfiles import StaticFiles

import tensorflow as tf
from app.services.model_predict_service import ModelPredictService

app = FastAPI(title="QuickCheck Backend")

origins = [
    "http://localhost:5173",
    "https://quickcheck-project.vercel.app",
]

setup_cors(app, origins)
app.include_router(api_router, prefix="/api/v1")

# Load Model
MODEL_PATH = 'app/core/assets/mobilenet_v3l.keras'

@app.on_event("startup")
def load_model():
    model = tf.keras.models.load_model(MODEL_PATH)
    app.state.model_predict = ModelPredictService(model)