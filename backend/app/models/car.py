from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class CarModel(Base):
    __tablename__ = "car"

    license_plate = Column(String(100), primary_key=True)
    chassis_number = Column(String(50), unique=True, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    brand = Column(String(100))  # ยี่ห้อรถ เช่น Toyota
    model = Column(String(100))  # แบบรถ เช่น Camry
    year = Column(Integer)  # ปี ค.ศ.
    province = Column(String(50))  # จังหวัดที่จดทะเบียน เช่น BKK
    service_center_id = Column(Integer, ForeignKey("service_center.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("UserModel", back_populates="cars")
