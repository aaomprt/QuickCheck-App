from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    line_id_hash = Column(String(64), unique=True, index=True, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    
    # Relationships
    cars = relationship("CarModel", back_populates="user", cascade="all, delete-orphan")
