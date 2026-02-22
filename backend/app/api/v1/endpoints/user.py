from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import (
    UserRegisterRequest, RegisterResponse, ErrorResponse,
    UserResponse, CarResponse, AddCarRequest, DeleteCarResponse,
    UpdateCarRequest, UpdateCarResponse
)
from app.services.user import UserService

router = APIRouter()

@router.get("/check_user/{line_id}")
def check_user(line_id: str, db: Session = Depends(get_db)):
    user = UserService.get_user_by_line_id(db, line_id.strip())
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้ที่มี LINE ID นี้")
    return {"exists": True, "user_id": user.id}

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="ลงทะเบียนผู้ใช้และรถ",
    description="ลงทะเบียนผู้ใช้ใหม่พร้อมข้อมูลรถหลายคัน (flexible สามารถส่งหลายคันได้)",
    responses={
        201: {"description": "ลงทะเบียนสำเร็จ"},
        400: {"model": ErrorResponse, "description": "ข้อมูลไม่ถูกต้องหรือซ้ำในระบบ"},
        500: {"model": ErrorResponse, "description": "เกิดข้อผิดพลาดในระบบ"}
    }
)
async def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
    try:
        user, cars = UserService.register_user_with_cars(db, request)

        return RegisterResponse(
            message="ลงทะเบียนสำเร็จ",
            user=UserResponse(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name
            ),
            cars=[
                CarResponse(
                    chassis_number=car.chassis_number,
                    brand=car.brand,
                    model=car.model,
                    year=car.year,
                    license_plate=car.license_plate,
                    province=car.province,
                )
                for car in cars
            ],
            cars_count=len(cars)
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="เกิดข้อผิดพลาดในระบบ"
        )

@router.get(
    "/user/{line_id}",
    summary="ดึงข้อมูลผู้ใช้และรถจาก LINE ID",
    description="ค้นหาข้อมูลผู้ใช้และรถทั้งหมดจาก LINE ID"
)
async def get_user_by_line_id(line_id: str, db: Session = Depends(get_db)):
    try:
        user = UserService.get_user_by_line_id(db, line_id.strip())
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ไม่พบผู้ใช้"
            )

        cars = UserService.get_user_cars(db, user.id)

        return RegisterResponse(
            message="ดึงข้อมูลสำเร็จ",
            user=UserResponse(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name
            ),
            cars=[
                CarResponse(
                    chassis_number=car.chassis_number,
                    brand=car.brand,
                    model=car.model,
                    year=car.year,
                    license_plate=car.license_plate,
                    province=car.province,
                )
                for car in cars
            ],
            cars_count=len(cars)
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="เกิดข้อผิดพลาดในระบบ"
        )

@router.post(
    "/add-cars",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="เพิ่มรถให้กับผู้ใช้",
    description="เพิ่มรถหลายคันให้กับผู้ใช้ที่มีอยู่แล้ว (ระบุ LINE ID)",
    responses={
        201: {"description": "เพิ่มรถสำเร็จ"},
        400: {"model": ErrorResponse, "description": "ข้อมูลไม่ถูกต้องหรือซ้ำในระบบ"},
        404: {"model": ErrorResponse, "description": "ไม่พบผู้ใช้"},
        500: {"model": ErrorResponse, "description": "เกิดข้อผิดพลาดในระบบ"}
    }
)
async def add_cars_to_user(request: AddCarRequest, db: Session = Depends(get_db)):
    try:
        user, cars = UserService.add_cars_to_user(db, request.line_id, request.cars)

        return RegisterResponse(
            message=f"เพิ่มรถสำเร็จ {len(cars)} คัน",
            user=UserResponse(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name
            ),
            cars=[
                CarResponse(
                    chassis_number=car.chassis_number,
                    brand=car.brand,
                    model=car.model,
                    year=car.year,
                    license_plate=car.license_plate,
                    province=car.province,
                )
                for car in cars
            ],
            cars_count=len(cars)
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="เกิดข้อผิดพลาดในระบบ"
        )

@router.delete(
    "/cars/{license_plate}",
    response_model=DeleteCarResponse,
    status_code=status.HTTP_200_OK,
    summary="ลบรถ",
    description="ลบรถตามเลขทะเบียน",
    responses={
        200: {"description": "ลบรถสำเร็จ"},
        404: {"model": ErrorResponse, "description": "ไม่พบรถ"},
        500: {"model": ErrorResponse, "description": "เกิดข้อผิดพลาดในระบบ"}
    }
)
async def delete_car(license_plate: str, db: Session = Depends(get_db)):
    try:
        deleted_plate = UserService.delete_car(db, license_plate.strip())
        return DeleteCarResponse(message="ลบรถสำเร็จ", license_plate=deleted_plate)

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="เกิดข้อผิดพลาดในระบบ"
        )

@router.put(
    "/cars/{license_plate}",
    response_model=UpdateCarResponse,
    status_code=status.HTTP_200_OK,
    summary="อัพเดทข้อมูลรถ",
    description="อัพเดทข้อมูลรถตามเลขทะเบียน (สามารถอัพเดทได้ทุกฟิลด์รวมถึงเลขตัวรถ)",
    responses={
        200: {"description": "อัพเดทข้อมูลสำเร็จ"},
        400: {"model": ErrorResponse, "description": "ข้อมูลไม่ถูกต้อง"},
        404: {"model": ErrorResponse, "description": "ไม่พบรถ"},
        500: {"model": ErrorResponse, "description": "เกิดข้อผิดพลาดในระบบ"}
    }
)
async def update_car(license_plate: str, request: UpdateCarRequest, db: Session = Depends(get_db)):
    try:
        car = UserService.update_car(db, license_plate.strip(), request)

        return UpdateCarResponse(
            message="อัพเดทข้อมูลรถสำเร็จ",
            car=CarResponse(
                chassis_number=car.chassis_number,
                brand=car.brand,
                model=car.model,
                year=car.year,
                license_plate=car.license_plate,
            )
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="เกิดข้อผิดพลาดในระบบ"
        )