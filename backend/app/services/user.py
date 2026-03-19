from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.models.user import UserModel
from app.models.car import CarModel
from app.schemas.user import UserRegisterRequest, CarCreate, UpdateCarRequest
from app.core.security import line_id_to_hash

def _check_duplicate_chassis(db: Session, chassis_numbers: list[str], exclude_plate: str | None = None) -> None:
    """ ตรวจ chassis ซ้ำ """
    
    if not chassis_numbers:
        return
    
    q = db.query(CarModel).filter(CarModel.chassis_number.in_(chassis_numbers))
    
    if exclude_plate:
        q = q.filter(CarModel.license_plate != exclude_plate)
    dups = [c.chassis_number for c in q.all()]
    
    if dups:
        raise ValueError(f"เลขตัวรถซ้ำในระบบ: {', '.join(dups)}")


def _check_duplicate_plate(db: Session, license_plate: str, province: str) -> None:
    """ ตรวจป้ายทะเบียน + จังหวัดซ้ำ """
    exists = db.query(CarModel).filter(
        CarModel.license_plate == license_plate,
        CarModel.province == province,
    ).first()
    
    if exists:
        raise ValueError(f"เลขทะเบียน {license_plate} มีในระบบแล้ว")


def _build_car(data: CarCreate, user_id: int) -> CarModel:
    return CarModel(
        chassis_number=data.chassis_number,
        user_id=user_id,
        brand=data.brand,
        model=data.model,
        year=data.year,
        license_plate=data.license_plate,
        province=data.province,
    )

def _resolve_update_fields(car: CarModel, update_data: UpdateCarRequest) -> dict:
    """ Merge update_data กับ current car values → คืน dict ของ target fields """
    
    return {
        "license_plate": update_data.license_plate.strip() if update_data.license_plate else car.license_plate,
        "chassis_number": update_data.chassis_number.upper() if update_data.chassis_number else car.chassis_number,
        "brand": update_data.brand if update_data.brand is not None else car.brand,
        "model": update_data.model if update_data.model is not None else car.model,
        "year": update_data.year if update_data.year is not None else car.year,
        "province": update_data.province if update_data.province is not None else car.province,
    }

class UserService:

    @staticmethod
    def register_user_with_cars(db: Session, request: UserRegisterRequest) -> tuple[UserModel, List[CarModel]]:
        try:
            lid_hash = line_id_to_hash(request.line_id)

            if db.query(UserModel).filter(UserModel.line_id_hash == lid_hash).first():
                raise ValueError("LINE ID มีในระบบแล้ว")

            _check_duplicate_chassis(db, [c.chassis_number for c in request.cars if c.chassis_number])

            new_user = UserModel(line_id_hash=lid_hash, first_name=request.first_name, last_name=request.last_name)
            db.add(new_user)
            db.flush()

            new_cars = [_build_car(car_data, new_user.id) for car_data in request.cars]
            db.add_all(new_cars)
            db.commit()

            db.refresh(new_user)
            for car in new_cars:
                db.refresh(car)

            return new_user, new_cars

        except IntegrityError:
            db.rollback()
            raise ValueError("ข้อมูลซ้ำในระบบ")
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get_user_by_line_id(db: Session, line_id: str) -> UserModel | None:
        lid_hash = line_id_to_hash(line_id)
        return db.query(UserModel).filter(UserModel.line_id_hash == lid_hash).first()

    @staticmethod
    def get_user_cars(db: Session, user_id: int) -> List[CarModel]:
        return db.query(CarModel).filter(CarModel.user_id == user_id).all()

    @staticmethod
    def add_cars_to_user(db: Session, line_id: str, cars: List[CarCreate]) -> tuple[UserModel, List[CarModel]]:
        try:
            lid_hash = line_id_to_hash(line_id)

            user = db.query(UserModel).filter(UserModel.line_id_hash == lid_hash).first()
            if not user:
                raise ValueError("ไม่พบผู้ใช้")

            _check_duplicate_chassis(db, [c.chassis_number for c in cars if c.chassis_number])

            for car_data in cars:
                if car_data.license_plate and car_data.province:
                    _check_duplicate_plate(db, car_data.license_plate, car_data.province)

            new_cars = [_build_car(car_data, user.id) for car_data in cars]
            db.add_all(new_cars)
            db.commit()
            for car in new_cars:
                db.refresh(car)

            return user, new_cars

        except IntegrityError:
            db.rollback()
            raise ValueError("ข้อมูลซ้ำในระบบ")
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def delete_car(db: Session, license_plate: str) -> str:
        try:
            car = db.query(CarModel).filter(CarModel.license_plate == license_plate).first()
            if not car:
                raise ValueError(f"ไม่พบรถที่มีเลขทะเบียน: {license_plate}")
            db.delete(car)
            db.commit()
            return license_plate
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def update_car(db: Session, license_plate: str, update_data: UpdateCarRequest) -> CarModel:
        try:
            plate = license_plate.strip()
            car = db.query(CarModel).filter(CarModel.license_plate == plate).first()
            if not car:
                raise ValueError(f"ไม่พบรถที่มีเลขทะเบียน: {plate}")

            f = _resolve_update_fields(car, update_data)

            _check_duplicate_chassis(db, [f["chassis_number"]] if f["chassis_number"] else [], exclude_plate=plate)

            plate_changed = f["license_plate"] != car.license_plate
            province_changed = f["province"] != car.province

            if plate_changed or province_changed:
                _check_duplicate_plate(db, f["license_plate"], f["province"])

                # license_plate เป็น PK → ต้อง delete + insert
                db.delete(car)
                db.flush()
                new_car = CarModel(**f, user_id=car.user_id, service_center_id=car.service_center_id)
                db.add(new_car)
                db.commit()
                db.refresh(new_car)
                return new_car

            # update in-place
            for field, value in f.items():
                setattr(car, field, value)
            db.commit()
            db.refresh(car)
            return car

        except IntegrityError:
            db.rollback()
            raise ValueError("ข้อมูลซ้ำในระบบ")
        except Exception:
            db.rollback()
            raise