import json, os
from uuid import uuid4
from typing import List
from supabase import create_client, Client
from app.core.config import settings

from fastapi import UploadFile, HTTPException, Request
from sqlalchemy.orm import Session

from app.models.car import CarModel
from app.models.part_master import PartMaster
from app.models.history import History, HistoryItem
from app.schemas.assess_damage import AssessDamageItemIn, AssessDamageResponse, HistoryItemOut

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

CONFIDENCE_THRESHOLD = 0.75
DAMAGE_UNASSESSABLE = "Unassessable"

def _upload_image(history_id: int, idx: int, filename: str, content_type: str, data: bytes) -> str:
    """ อัปโหลดรูปไป Supabase และคืน public URL """
    
    ext = os.path.splitext(filename or "")[1] or ".jpg"
    storage_path = f"history/{history_id}/{idx:02d}_{uuid4().hex}{ext}"
    
    supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
        path=storage_path,
        file=data,
        file_options={"content-type": content_type},
    )
    
    return supabase.storage.from_(settings.SUPABASE_BUCKET).get_public_url(storage_path)

def _find_part(db: Session, part_type: str, car: CarModel) -> PartMaster:
    """ ค้นหา PartMaster ที่ตรงกับรถ โดย prefer year ที่ระบุก่อน แล้ว fallback ไป year = NULL """
    
    part = (
        db.query(PartMaster)
        .filter(
            PartMaster.part_type == part_type,
            PartMaster.model == car.model,
            (PartMaster.year == car.year) | (PartMaster.year.is_(None)) if car.year else True,
        )
        .first()
    )
    
    if not part:
        raise HTTPException(
            status_code=404,
            detail=f"ไม่พบอะไหล่ใน part_master สำหรับ part_type='{part_type}' (model/year ของรถไม่ตรง)",
        )
        
    return part

async def create_assess_history(
    request: Request,
    db: Session,
    license_plate: str,
    items_json: str,
    images: List[UploadFile],
) -> AssessDamageResponse:

    # parse & validate items
    try:
        items = [AssessDamageItemIn(**x) for x in json.loads(items_json)]
    except Exception:
        raise HTTPException(status_code=400, detail="รูปแบบ items ไม่ถูกต้อง (ต้องเป็น JSON array)")

    if not items:
        raise HTTPException(status_code=400, detail="items ต้องมีอย่างน้อย 1 รายการ")

    if len(images) != len(items):
        raise HTTPException(
            status_code=400,
            detail=f"จำนวน images ({len(images)}) ต้องเท่ากับจำนวน items ({len(items)})",
        )

    # ตรวจสอบ dependencies
    car = db.get(CarModel, license_plate)
    if not car:
        raise HTTPException(status_code=404, detail="ไม่พบรถ (license_plate) ในระบบ")

    svc = getattr(request.app.state, "model_predict", None)
    if svc is None:
        raise HTTPException(status_code=500, detail="Model service not initialized")

    # สร้าง History + items
    history = History(license_plate=license_plate)
    db.add(history)
    db.flush()

    out_items: list[HistoryItemOut] = []

    try:
        for idx, (it, img) in enumerate(zip(items, images), start=1):
            if not img.content_type or not img.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail=f"ไฟล์ที่ {idx} ไม่ใช่รูปภาพ")

            image_bytes = await img.read()

            # predict
            damage_level, confidence = svc.predict(image_bytes)
            if confidence is None or float(confidence) < CONFIDENCE_THRESHOLD:
                damage_level = DAMAGE_UNASSESSABLE
            print(f"item: {it.part_type}, conf: {confidence}, predict: {damage_level}")

            part = _find_part(db, it.part_type, car)
            image_url = _upload_image(history.id, idx, img.filename, img.content_type, image_bytes)

            db.add(HistoryItem(
                history_id=history.id,
                part_number=part.part_number,
                damage_level=damage_level,
                image_path=image_url,
            ))
            
            out_items.append(HistoryItemOut(
                part_number=part.part_number,
                part_type=part.part_type,
                damage_level=damage_level,
                image_path=image_url,
            ))

        db.commit()
    except Exception:
        db.rollback()
        raise

    return AssessDamageResponse(
        history_id=history.id,
        license_plate=license_plate,
        items=out_items,
    )