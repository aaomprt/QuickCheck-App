from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DECIMAL
from app.core.database import Base

class PartMaster(Base):
    __tablename__ = "part_master"

    part_number: Mapped[str] = mapped_column(String(50), primary_key=True)
    part_type: Mapped[str] = mapped_column(String(30), nullable=False)
    model: Mapped[str] = mapped_column(String(30), nullable=False)
    year: Mapped[int | None] = mapped_column(Integer)
    price: Mapped[float | None] = mapped_column(DECIMAL(10, 2))
