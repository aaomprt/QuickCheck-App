from fastapi import APIRouter
from app.api.v1.endpoints import health, service_center, assess_damage, user

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(service_center.router, tags=["service_center"])
api_router.include_router(assess_damage.router, tags=["assess_damage"])
api_router.include_router(user.router, tags=["user"])