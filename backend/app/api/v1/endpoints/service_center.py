from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.service_center import ServiceCenterOut
from app.services.center_service import ServiceCenterService

router = APIRouter()

@router.get("/service_center", response_model=list[ServiceCenterOut])
def get_service_centers(db: Session = Depends(get_db)):
    return ServiceCenterService.get_all(db)