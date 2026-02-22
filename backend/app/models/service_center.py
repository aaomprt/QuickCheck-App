from sqlalchemy import Column, Integer, String, Text, Time, Numeric
from app.core.database import Base

class ServiceCenterModel(Base):
    __tablename__ = "service_center"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    phone = Column(String(20))
    open_time = Column(Time)
    close_time = Column(Time)
    lat = Column(Numeric(10, 7))
    lng = Column(Numeric(10, 7))
