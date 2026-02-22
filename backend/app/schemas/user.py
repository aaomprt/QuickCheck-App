from pydantic import BaseModel, Field, validator
from typing import List, Optional

class CarCreate(BaseModel):
    """Schema สำหรับข้อมูลรถแต่ละคัน"""
    brand: str = Field(..., description="ยี่ห้อรถ เช่น Toyota")
    model: str = Field(..., description="แบบรถ เช่น Camry")
    year: int = Field(..., description="ปี ค.ศ.")
    license_plate: str = Field(..., description="เลขทะเบียน เช่น กย 1234")
    chassis_number: Optional[str] = Field(None, description="เลขตัวรถ เช่น AAAAA12345A123456 (optional)")
    province: str = Field(..., description="จังหวัดที่จดทะเบียน เช่น BKK")
    
    @validator('year')
    def validate_year(cls, v):
        if v < 1900 or v > 2100:
            raise ValueError('ปีไม่ถูกต้อง')
        return v
    
    @validator('chassis_number')
    def validate_chassis_number(cls, v):
        if v is not None and (not v or len(v) < 10):
            raise ValueError('เลขตัวรถไม่ถูกต้อง')
        return v.upper() if v else None

class UserRegisterRequest(BaseModel):
    """Schema สำหรับ request การลงทะเบียน"""
    line_id: str = Field(..., description="LINE ID ของผู้ใช้")
    first_name: str = Field(..., description="ชื่อ")
    last_name: str = Field(..., description="นามสกุล")
    phone: Optional[str] = Field(None, description="เบอร์โทร")
    cars: List[CarCreate] = Field(..., min_items=1, description="ข้อมูลรถ (สามารถส่งหลายคันได้)")
    consent: bool = Field(..., description="อนุญาตให้ใช้ข้อมูล")
    
    @validator('consent')
    def validate_consent(cls, v):
        if not v:
            raise ValueError('กรุณายอมรับการใช้ข้อมูล')
        return v

class CarResponse(BaseModel):
    """Schema สำหรับ response ข้อมูลรถ"""
    license_plate: str
    chassis_number: Optional[str]
    brand: str
    model: str
    year: int
    province: str
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    """Schema สำหรับ response ผู้ใช้"""
    id: int
    first_name: str
    last_name: str
    
    class Config:
        from_attributes = True

class RegisterResponse(BaseModel):
    """Schema สำหรับ response การลงทะเบียน"""
    message: str
    user: UserResponse
    cars: List[CarResponse]
    cars_count: int

class AddCarRequest(BaseModel):
    """Schema สำหรับ request เพิ่มรถให้ user"""
    line_id: str = Field(..., description="LINE ID ของผู้ใช้")
    cars: List[CarCreate] = Field(..., min_items=1, description="ข้อมูลรถที่ต้องการเพิ่ม (สามารถส่งหลายคันได้)")

class UpdateCarRequest(BaseModel):
    """Schema สำหรับ request อัพเดทข้อมูลรถ"""
    chassis_number: Optional[str] = Field(None, description="เลขตัวรถ เช่น AAAAA12345A123456")
    brand: Optional[str] = Field(None, description="ยี่ห้อรถ เช่น Toyota")
    model: Optional[str] = Field(None, description="แบบรถ เช่น Camry")
    year: Optional[int] = Field(None, description="ปี ค.ศ.")
    license_plate: Optional[str] = Field(None, description="เลขทะเบียน เช่น กย 1234 กรุงเทพมหานคร")
    
    @validator('year')
    def validate_year(cls, v):
        if v is not None and (v < 1900 or v > 2100):
            raise ValueError('ปีไม่ถูกต้อง')
        return v
    
    @validator('chassis_number')
    def validate_chassis_number(cls, v):
        if v is not None and (not v or len(v) < 10):
            raise ValueError('เลขตัวรถไม่ถูกต้อง')
        return v.upper() if v else v

class UpdateCarResponse(BaseModel):
    """Schema สำหรับ response การอัพเดทรถ"""
    message: str
    car: CarResponse

class DeleteCarResponse(BaseModel):
    """Schema สำหรับ response การลบรถ"""
    message: str
    license_plate: str

class ErrorResponse(BaseModel):
    """Schema สำหรับ response เมื่อเกิด error"""
    error: str
    detail: Optional[str] = None
