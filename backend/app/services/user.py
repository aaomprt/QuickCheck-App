from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from app.models.user import UserModel
from app.models.car import CarModel
from app.schemas.user import UserRegisterRequest, CarCreate, UpdateCarRequest
from app.core.security import line_id_to_hash

class UserService:
    @staticmethod
    def register_user_with_cars(db: Session, request: UserRegisterRequest) -> tuple[UserModel, List[CarModel]]:
        """
        ลงทะเบียนผู้ใช้พร้อมรถหลายคัน
        
        Args:
            db: Database session
            request: ข้อมูล user และรถที่ต้องการลงทะเบียน
            
        Returns:
            tuple ของ (UserModel, List[CarModel])
            
        Raises:
            ValueError: เมื่อ line_id ซ้ำหรือเลขตัวรถซ้ำ
        """
        try:
            lid_hash = line_id_to_hash(request.line_id)
            
            # ตรวจสอบว่า line_id มีอยู่แล้วหรือไม่
            existing_user = db.query(UserModel).filter(UserModel.line_id_hash == lid_hash).first()
            if existing_user:
                raise ValueError("LINE ID มีในระบบแล้ว")
            
            # ตรวจสอบว่าเลขตัวรถซ้ำหรือไม่ (เฉพาะที่มีค่า)
            chassis_numbers = [car.chassis_number for car in request.cars if car.chassis_number]
            if chassis_numbers:
                existing_cars = db.query(CarModel).filter(CarModel.chassis_number.in_(chassis_numbers)).all()
                if existing_cars:
                    dup = [c.chassis_number for c in existing_cars]
                    raise ValueError(f"เลขตัวรถซ้ำในระบบ: {', '.join(dup)}")
            
            # สร้าง User
            new_user = UserModel(
                line_id_hash=lid_hash,
                first_name=request.first_name,
                last_name=request.last_name
            )
            
            db.add(new_user)
            db.flush()
            
            # สร้างรถหลายคัน
            new_cars = []
            for car_data in request.cars:
                new_car = CarModel(
                    chassis_number=car_data.chassis_number,
                    user_id=new_user.id,
                    brand=car_data.brand,
                    model=car_data.model,
                    year=car_data.year,
                    license_plate=car_data.license_plate,
                    province=car_data.province
                )
                db.add(new_car)
                new_cars.append(new_car)

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
        """ดึงรถทั้งหมดของ user"""
        return db.query(CarModel).filter(CarModel.user_id == user_id).all()
    
    @staticmethod
    def add_cars_to_user(db: Session, line_id: str, cars: List[CarCreate]) -> tuple[UserModel, List[CarModel]]:
        """
        เพิ่มรถให้กับ user ที่มีอยู่แล้ว
        
        Args:
            db: Database session
            line_id: LINE ID ของ user
            cars: รายการรถที่ต้องการเพิ่ม
            
        Returns:
            tuple ของ (UserModel, List[CarModel])
            
        Raises:
            ValueError: เมื่อไม่พบ user หรือเลขตัวรถซ้ำ
        """
        try:
            lid_hash = line_id_to_hash(line_id)
            
            # ตรวจสอบว่า user มีอยู่จริง
            user = db.query(UserModel).filter(UserModel.line_id_hash == lid_hash).first()
            if not user:
                raise ValueError(f"ไม่พบผู้ใช้")
            
            # ตรวจสอบว่าเลขตัวรถซ้ำหรือไม่ (เฉพาะที่มีค่า)
            chassis_numbers = [car.chassis_number for car in cars if car.chassis_number]
            if chassis_numbers:
                existing_cars = db.query(CarModel).filter(CarModel.chassis_number.in_(chassis_numbers)).all()
                if existing_cars:
                    duplicate_chassis = [car.chassis_number for car in existing_cars]
                    raise ValueError(f"เลขตัวรถซ้ำในระบบ: {', '.join(duplicate_chassis)}")
            
            # สร้างรถหลายคัน
            new_cars = []
            for car_data in cars:
                new_car = CarModel(
                    chassis_number=car_data.chassis_number,
                    user_id=user.id,
                    brand=car_data.brand,
                    model=car_data.model,
                    year=car_data.year,
                    license_plate=car_data.license_plate,
                    province=car_data.province
                )
                db.add(new_car)
                new_cars.append(new_car)
            
            # Commit transaction
            db.commit()
            for car in new_cars:
                db.refresh(car)
            
            return user, new_cars
            
        except IntegrityError as e:
            db.rollback()
            raise ValueError(f"ข้อมูลซ้ำในระบบ")
        except Exception as e:
            db.rollback()
            raise e
    
    @staticmethod
    def delete_car(db: Session, license_plate: str) -> str:
        """
        ลบรถตามเลขทะเบียน
        
        Args:
            db: Database session
            license_plate: เลขทะเบียนที่ต้องการลบ
            
        Returns:
            เลขทะเบียนที่ถูกลบ
            
        Raises:
            ValueError: เมื่อไม่พบรถที่ต้องการลบ
        """
        try:
            car = db.query(CarModel).filter(CarModel.license_plate == license_plate).first()
            if not car:
                raise ValueError(f"ไม่พบรถที่มีเลขทะเบียน: {license_plate}")
            
            db.delete(car)
            db.commit()
            return license_plate
            
        except Exception as e:
            db.rollback()
            raise e
    
    @staticmethod
    def update_car(db: Session, license_plate: str, update_data: UpdateCarRequest) -> CarModel:
        """
        อัพเดทข้อมูลรถ
        
        Args:
            db: Database session
            license_plate: เลขทะเบียนที่ต้องการอัพเดท
            update_data: ข้อมูลที่ต้องการอัพเดท
            
        Returns:
            CarModel ที่ถูกอัพเดท
            
        Raises:
            ValueError: เมื่อไม่พบรถที่ต้องการอัพเดท หรือเลขตัวรถ/ทะเบียนซ้ำ
        """
        try:
            plate = license_plate.strip()
            car = db.query(CarModel).filter(CarModel.license_plate == plate).first()
            if not car:
                raise ValueError(f"ไม่พบรถที่มีเลขทะเบียน: {plate}")
            
            # เตรียมข้อมูลสำหรับการอัพเดท
            target_plate = update_data.license_plate.strip() if update_data.license_plate else car.license_plate
            target_chassis = update_data.chassis_number.upper() if update_data.chassis_number else car.chassis_number
            target_brand = update_data.brand if update_data.brand is not None else car.brand
            target_model = update_data.model if update_data.model is not None else car.model
            target_year = update_data.year if update_data.year is not None else car.year
            
            # ตรวจซ้ำ chassis
            if target_chassis:
                dup = db.query(CarModel).filter(
                    CarModel.chassis_number == target_chassis,
                    CarModel.license_plate != car.license_plate
                ).first()
                if dup:
                    raise ValueError(f"เลขตัวรถ {target_chassis} มีในระบบแล้ว")
                         
            # ถ้าเปลี่ยนทะเบียน ตรวจซ้ำทะเบียนก่อน
            if target_plate != car.license_plate:
                dup_plate = db.query(CarModel).filter(CarModel.license_plate == target_plate).first()
                if dup_plate:
                    raise ValueError(f"เลขทะเบียน {target_plate} มีในระบบแล้ว")

                db.delete(car)
                db.flush()

                new_car = CarModel(
                    license_plate=target_plate,
                    chassis_number=target_chassis,
                    user_id=car.user_id,
                    brand=target_brand,
                    model=target_model,
                    year=target_year,
                    service_center_id=car.service_center_id
                )
                
                db.add(new_car)
                db.commit()
                db.refresh(new_car)
                return new_car
            
            # ไม่เปลี่ยนทะเบียน -> update ปกติ
            car.chassis_number = target_chassis
            car.brand = target_brand
            car.model = target_model
            car.year = target_year

            db.commit()
            db.refresh(car)
            
            return car
            
        except IntegrityError:
            db.rollback()
            raise ValueError("ข้อมูลซ้ำในระบบ")
        except Exception:
            db.rollback()
            raise