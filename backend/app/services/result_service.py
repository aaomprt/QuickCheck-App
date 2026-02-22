from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.history import History, HistoryItem
from app.models.part_master import PartMaster
from app.models.car import CarModel
from app.models.user import UserModel

from app.schemas.history_result import HistoryResultResponse, ResultItemOut

CHARGEABLE_LEVELS = {"Moderate", "Severe"}

PART_TYPE_TH = {
    "front_bumper": "กันชนหน้า",
    "rear_bumper": "กันชนหลัง",
    "grille": "กระจังหน้า",
    "door": "ประตู",
    "mirror": "กระจก",
    "headlight": "ไฟหน้า",
    "taillight": "ไฟท้าย",
}

def get_history_result(db: Session, history_id: int) -> HistoryResultResponse:
    history = db.get(History, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="ไม่พบ history_id")
    
    # ดึงข้อมูลรถจากตาราง car
    car = db.get(CarModel, history.license_plate)
    car_brand = car.brand if car else None
    car_model = car.model if car else None
    car_year = car.year if car else None
    
    # ดึงข้อมูล user
    user = db.get(UserModel, car.user_id)
    user_name = user.first_name if user else None

    # ดึงรายการ item + price จาก part_master
    rows = (
        db.query(
            HistoryItem.part_number,
            PartMaster.part_type,
            HistoryItem.damage_level,
            PartMaster.price,
            HistoryItem.image_path,
        )
        .join(PartMaster, PartMaster.part_number == HistoryItem.part_number)
        .filter(HistoryItem.history_id == history_id)
        .all()
    )

    if not rows:
        # history มี แต่ไม่มี items
        return HistoryResultResponse(
            history_id=history_id,
            license_plate=history.license_plate,
            items=[],
            total_cost=0.0,
        )

    items: list[ResultItemOut] = []
    total_cost = 0.0

    for part_number, part_type, damage_level, price, image_path in rows:
        price_val = float(price or 0)
        part_name_th = PART_TYPE_TH.get(part_type, part_type)

        items.append(
            ResultItemOut(
                part_number=part_number,
                part_type=part_type,
                part_name_th=part_name_th,
                damage_level=damage_level,
                price=price_val,
                image_path=image_path,
            )
        )

        if (damage_level or "").strip() in CHARGEABLE_LEVELS:
            total_cost += price_val

    return HistoryResultResponse(
        history_id=history_id,
        user_name=user_name,
        license_plate=history.license_plate,
        car_brand=car_brand,
        car_model=car_model,
        car_year=car_year,
        items=items,
        total_cost=total_cost,
    )
