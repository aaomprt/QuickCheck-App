from pydantic import BaseModel
from typing import List, Optional

class ResultItemOut(BaseModel):
    part_number: str
    part_type: str
    part_name_th: str
    damage_level: str
    price: float
    image_path: Optional[str] = None

class HistoryResultResponse(BaseModel):
    history_id: int
    user_name: str
    license_plate: str
    car_brand: str
    car_model: str
    car_year: Optional[int] = None 
    items: List[ResultItemOut]
    total_cost: float