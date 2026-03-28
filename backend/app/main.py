import os
from fastapi import FastAPI
from app.core.cors import setup_cors
from app.core.config import settings
from app.api.v1.router import api_router

from app.services.model_predict_service import ModelPredictService

app = FastAPI(title="QuickCheck Backend")

setup_cors(app, settings.ALLOWED_ORIGINS)
app.include_router(api_router, prefix="/api/v1")

# Load Model
MODEL_PATH = 'app/core/assets/mobilevit.onnx'

@app.on_event("startup")
def load_model():
    app.state.model_predict = ModelPredictService(MODEL_PATH)
    print("Model loaded successfully with ONNX Runtime!")