# 🚗 Quickcheck Project 
ระบบประเมินความเสียหายรถยนต์อัตโนมัติผ่าน LINE OA สำหรับรถยนต์ Toyota โดยช่วยประเมินระดับความเสียหายและประมาณราคาซ่อม

## 🌟 Key Features
- AI Damage Analysis: วิเคราะห์ความเสียหาย 3 ระดับ (ชนเบา, ชนปานกลาง, ชนหนัก) ด้วย TensorFlow
- Cost Estimation: ประเมินค่าซ่อมเบื้องต้นแยกตามรายการอะไหล่
- Service Center Locator: ค้นหาศูนย์ซ่อมบริการบนแผนที่
- Seamless Integration: ใช้งานผ่าน LINE แอปพลิเคชัน

## 🏗️ System Architecture & Tech Stack
- **Frontend:** React + Vite + Tailwind CSS (Hosted on Vercel)
- **Backend API:** Python FastAPI (Hosted on Render)
- **AI Model:** TensorFlow
- **Database:** PostgreSQL (Managed by Supabase)
- **Platform:** LINE LIFF

## 🔐 Access Control
| Feature  | Guest (ทั่วไป) | Member (สมาชิก) |
| -------- | ------------ | -------------- |
| ค้นหาศูนย์บริการบนแผนที่  | ✅ | ✅ |
| ถ่ายรูปประเมินความเสียหาย  | ❌  | ✅ |
| ประเมินค่าใช้จ่ายเบื้องต้น | ❌ | 	✅ |


## 🛠️ Installation & Setup (Local Development)

### Backend (FastAPI)
1. ไปที่โฟลเดอร์ backend: 
```
cd backend
```

2. สร้าง Virtual Environment: 
```
python -m venv venv
```

3. ติดตั้ง Dependencies: 
```
pip install -r requirements.txt
```

4. สร้างไฟล์ `.env` สำหรับเชื่อมต่อ Supabase

5. รันเซิร์ฟเวอร์: 
```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React)

1. ไปที่โฟลเดอร์ frontend: 
```
cd frontend
```

2. ติดตั้ง Dependencies: 
```
npm install
```

3. รันโปรเจกต์: 
```
npm run dev
```
