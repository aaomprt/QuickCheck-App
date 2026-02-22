from datetime import time
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict

class ServiceCenterBase(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    open_time: Optional[time] = None
    close_time: Optional[time] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None

class ServiceCenterOut(ServiceCenterBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
