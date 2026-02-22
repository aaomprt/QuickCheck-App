from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, String, ForeignKey, TIMESTAMP, text
from app.core.database import Base

class History(Base):
    __tablename__ = "history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    created_date: Mapped[str] = mapped_column(TIMESTAMP, server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    license_plate: Mapped[str] = mapped_column(String(50), ForeignKey("car.license_plate", ondelete="CASCADE"), nullable=False)

class HistoryItem(Base):
    __tablename__ = "history_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    history_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("history.id", ondelete="CASCADE"), nullable=False)
    part_number: Mapped[str] = mapped_column(String(50), ForeignKey("part_master.part_number", ondelete="RESTRICT"), nullable=False)
    damage_level: Mapped[str] = mapped_column(String(20), nullable=False)
    image_path: Mapped[str | None] = mapped_column(nullable=True)
