from pydantic import BaseModel
from typing import List

class AssessDamageItemIn(BaseModel):
    part_type: str

class HistoryItemOut(BaseModel):
    part_number: str
    part_type: str
    damage_level: str
    image_path: str | None = None

class AssessDamageResponse(BaseModel):
    history_id: int
    license_plate: str
    items: List[HistoryItemOut]

