from sqlalchemy.orm import Session
from app.models.service_center import ServiceCenterModel

class ServiceCenterService:
    @staticmethod
    def get_all(db: Session):
        return db.query(ServiceCenterModel).all()
