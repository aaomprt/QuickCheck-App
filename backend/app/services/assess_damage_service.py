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

async def create_assess_history(
    request: Request,
    db: Session,
    license_plate: str,
    items_json: str,
    images: List[UploadFile],
) -> AssessDamageResponse:

    # 1) parse items
    try:
        raw = json.loads(items_json)
        items = [AssessDamageItemIn(**x) for x in raw]
    except Exception:
        raise HTTPException(status_code=400, detail="รูปแบบ items ไม่ถูกต้อง (ต้องเป็น JSON array)")

    if len(items) == 0:
        raise HTTPException(status_code=400, detail="items ต้องมีอย่างน้อย 1 รายการ")

    # 2) validate images count
    if len(images) != len(items):
        raise HTTPException(
            status_code=400,
            detail=f"จำนวน images ({len(images)}) ต้องเท่ากับจำนวน items ({len(items)})",
        )

    # 3) find car
    car = db.get(CarModel, license_plate)
    if not car:
        raise HTTPException(status_code=404, detail="ไม่พบรถ (license_plate) ในระบบ")

    # 4) create history
    history = History(license_plate=license_plate)
    db.add(history)
    db.flush()  # เพื่อให้ได้ history.id

    out_items: list[HistoryItemOut] = []

    # 6) create history_items + save files
    svc = getattr(request.app.state, "model_predict", None)
    if svc is None:
        raise HTTPException(status_code=500, detail="Model service not initialized")

    try:
        for idx, (it, img) in enumerate(zip(items, images), start=1):

            # validate content-type
            if not img.content_type or not img.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail=f"ไฟล์ที่ {idx} ไม่ใช่รูปภาพ")

            image_bytes = await img.read()
            
            # predict damage level
            damage_level, confidence, probs = svc.predict(image_bytes)

            # --- หา part_master ---
            q = (
                db.query(PartMaster)
                .filter(PartMaster.part_type == it.part_type)
                .filter(PartMaster.model == (car.model or PartMaster.model))
            )

            if car.year is not None:
                part = (
                    db.query(PartMaster)
                    .filter(PartMaster.part_type == it.part_type)
                    .filter(PartMaster.model == (car.model or PartMaster.model))
                    .filter((PartMaster.year == car.year) | (PartMaster.year.is_(None)))
                    .first()
                )
            else:
                part = q.first()

            if not part:
                raise HTTPException(
                    status_code=404,
                    detail=f"ไม่พบอะไหล่ใน part_master สำหรับ part_type='{it.part_type}' (model/year ของรถไม่ตรง)",
                )
            
            # จัดการไฟล์บน Supabase
            ext = os.path.splitext(img.filename or "")[1] or ".jpg"
            fname = f"{idx:02d}_{uuid4().hex}{ext}"
            
            # กำหนดเส้นทางใน Storage
            storage_path = f"history/{history.id}/{fname}"
            
            # อัปโหลดไฟล์ไปที่ Supabase
            supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
                path=storage_path,
                file=image_bytes,
                file_options={"content-type": img.content_type}
            )
            
            # ดึง Public URL มาบันทึกลง Database
            image_url = supabase.storage.from_(settings.SUPABASE_BUCKET).get_public_url(storage_path)

            # insert history item with predicted level
            hi = HistoryItem(
                history_id=history.id,
                part_number=part.part_number,
                damage_level=damage_level,
                image_path=image_url,
            )
            db.add(hi)

            out_items.append(
                HistoryItemOut(
                    part_number=part.part_number,
                    part_type=part.part_type,
                    damage_level=damage_level,
                    image_path=image_url,
                )
            )

        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    return AssessDamageResponse(
        history_id=history.id,
        license_plate=license_plate,
        items=out_items,
    )