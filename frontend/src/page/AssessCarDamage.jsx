import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from "react-router-dom";
import liff from '@line/liff';
import { select_part } from '../assets/Data.jsx';
import { API_BASE_URL } from '../config.js';
import toast, { Toaster } from 'react-hot-toast';

import { TbPhotoPlus } from "react-icons/tb";
import { IoTrashBin } from "react-icons/io5";

const MAX_IMAGES = 7;

// Loading Page with circle progress
function CircleProgress({ value = 0, size = 90, stroke = 10 }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <svg width={size} height={size} className="block">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                className="text-gray-200"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={stroke}
                className="text-[#FF4F0F]"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 300ms linear" }}
            />
            <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                className="fill-gray-800 font-semibold"
            >
                {Math.round(value)}%
            </text>
        </svg>
    )
}

const makeEmptyItem = () => ({
    id: Date.now() + Math.random(),
    part: '',
    file: null,
    previewUrl: ''
});

const revokePreviewUrl = (url) => {
    if (url) URL.revokeObjectURL(url);
};

const getErrorMessage = (e) => {
    if (!e) return "เกิดข้อผิดพลาด";
    if (typeof e === "string") return e;
    if (e instanceof Error) return e.message;
    return e.message || "เกิดข้อผิดพลาด";
};

export default function AssessCarDamage() {
    const [selectedCar, setSelectedCar] = useState('')
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [cars, setCars] = useState([]);
    const [loadingCars, setLoadingCars] = useState(true);

    const [damageItems, setDamageItems] = useState([
        {
            id: Date.now(),
            part: '',
            file: null,
            previewUrl: ''
        }
    ])

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [phase, setPhase] = useState('indeterminate'); // "indeterminate" | "determinate"
    const [progress, setProgress] = useState(0);

    // เก็บชุดอะไหล่ที่ถูกเลือกแล้ว
    const selectedParts = useMemo(
        () => new Set(damageItems.map(i => i.part).filter(Boolean)),
        [damageItems]
    );

    const getPartObj = (value) => {
        return select_part.find(p => p.value === value) || select_part[0];
    };

    // ดึงข้อมูลผู้ใช้และรถยนต์
    useEffect(() => {
        let cancelled = false;

        const initApp = async () => {
            try {
                setLoadingCars(true);

                const profile = await liff.getProfile();

                const res = await fetch(`${API_BASE_URL}/user/${profile.userId}`);
                if (!res.ok) throw new Error("ไม่พบข้อมูลผู้ใช้");

                const data = await res.json();
                if (cancelled) return;

                setUser(data.user || null);
                setCars(Array.isArray(data.cars) ? data.cars : []);
            } catch (e) {
                console.error("Initialization error:", e);
                toast.error(getErrorMessage(e) || "โหลดข้อมูลไม่สำเร็จ");
            } finally {
                if (!cancelled) setLoadingCars(false);
            }
        };

        initApp();

        return () => {
            cancelled = true;
        };
    }, []);

    // ล้าง Memory สำหรับ Blob URL
    useEffect(() => {
        return () => {
            damageItems.forEach(item => revokePreviewUrl(item.previewUrl));
        };
    }, []);

    // สำหรับเปลี่ยนรูปอะไหล่ที่เลือก
    const handlePartChange = (id, event) => {
        const value = event.target.value

        // ถ้าอะไหล่นี้ถูกเลือกในแถวอื่นแล้ว
        const duplicated = damageItems.some(i => i.id !== id && i.part === value)
        if (duplicated) {
            toast.error('อะไหล่นี้ถูกเลือกไปแล้ว กรุณาเลือกอะไหล่อื่น');
            return
        }

        setDamageItems(items =>
            items.map(item =>
                item.id === id ? { ...item, part: value } : item
            )
        )
    }

    // อัปโหลดรูปภาพ
    const handleFileChange = (id, event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const previewUrl = URL.createObjectURL(file)

        setDamageItems(items =>
            items.map(item => {
                if (item.id !== id) return item;
                revokePreviewUrl(item.previewUrl);
                return { ...item, file, previewUrl };
            })
        )
    }

    // เพิ่มรูปภาพ
    const handleAddImage = (event) => {
        event.preventDefault()

        const availableParts = select_part
            .map(p => p.value)
            .filter(v => v !== '' && !selectedParts.has(v))

        if (availableParts.length === 0) {
            toast.error('ไม่สามารถเพิ่มได้: ไม่มีอะไหล่ให้เลือกแล้ว')
            return
        }

        setDamageItems(items => [...items, makeEmptyItem()])
    }

    // ลบรูปภาพ
    const handleRemoveImage = (id) => {
        setDamageItems(items =>
            items.map(item => {
                if (item.id !== id) return item
                revokePreviewUrl(item.previewUrl)
                return { ...item, file: null, previewUrl: '' }
            })
        )
    }

    // ลบ box upload
    const handleRemoveRow = (id) => {
        setDamageItems((items) => {
            const target = items.find((i) => i.id === id)
            revokePreviewUrl(target?.previewUrl)
            return items.filter((i) => i.id !== id)
        })
    }

    // ตรวจสอบความถูกต้องของฟอร์ม
    const validateForm = () => {
        // ต้องเลือกรถ
        if (!selectedCar) {
            toast.error('กรุณาเลือกรถยนต์');
            return false
        }

        // ต้องเลือกอะไหล่
        const missingPart = damageItems.some(item => !item.part)
        if (missingPart) {
            toast.error('กรุณาเลือกอะไหล่ให้ครบทุกภาพ');
            return false
        }

        // ต้องมีรูป
        const missingImage = damageItems.some(item => !item.file)
        if (missingImage) {
            toast.error('กรุณาอัปโหลดรูปภาพให้ครบทุกอะไหล่');
            return false
        }

        return true
    }

    // Submit form send to backend
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateForm()) return

        setIsSubmitting(true);
        setPhase("indeterminate");
        setProgress(0);

        // phase 1: indeterminate 1-3s
        const indeterminateMs = 1000 + Math.floor(Math.random() * 2000);

        // phase 2: determinate
        let progressInterval = null;
        const phaseTimeout = setTimeout(() => {
            setPhase("determinate");
            setProgress(8);

            progressInterval = setInterval(() => {
                setProgress((p) => {
                    const cap = 92;
                    if (p >= cap) return p;
                    const step = p < 40 ? 6 : p < 70 ? 3 : 1;
                    return Math.min(cap, p + step);
                });
            }, 450);
        }, indeterminateMs);

        try {
            const fd = new FormData()

            // car
            fd.append("license_plate", selectedCar)

            // part_type
            fd.append(
                "items",
                JSON.stringify(
                    damageItems.map((i) => ({
                        part_type: i.part,
                    }))
                )
            )

            // image car
            damageItems.forEach((i) => {
                fd.append("images", i.file)
            })

            const res = await fetch(`${API_BASE_URL}/assess_damage`, {
                method: "POST",
                body: fd,
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                toast.error(err.detail || "ส่งข้อมูลไม่สำเร็จ");
                return
            }

            const data = await res.json()

            setPhase("determinate");
            setProgress(100);

            setTimeout(() => {
                navigate(`/assess-car-damage/result/${data.history_id}`)
            }, 350);

        } catch (error) {
            toast.error(getErrorMessage(error) || "เกิดข้อผิดพลาดระหว่างประเมินความเสียหาย");
        } finally {
            clearTimeout(phaseTimeout);
            if (progressInterval) clearInterval(progressInterval);
            setIsSubmitting(false);
        }
    }

    return (
        <>
            {/* Notification */}
            <Toaster />

            {/* Loading page */}
            {isSubmitting && (
                <div className="fixed inset-0 z-50 bg-gray-500/70 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-75 rounded-2xl bg-white shadow-lg p-4 flex flex-col items-center gap-4">
                        <div className="text-center">
                            <div className="font-semibold text-lg">กำลังประเมินความเสียหาย</div>
                            <div className="text-sm text-gray-500">โปรดรอสักครู่…</div>
                        </div>

                        {phase === "indeterminate" ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="h-14 w-14 rounded-full border-4 border-gray-200 border-t-[#9ACBD0] animate-spin" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <CircleProgress value={progress} />
                            </div>
                        )}

                        <div className="text-xs text-gray-400 text-center">
                            ระบบกำลังวิเคราะห์รูปภาพและคำนวณความเสียหาย
                        </div>
                    </div>
                </div>
            )}

            {/* Head */}
            <div className='flex items-center justify-center bg-white/60 h-20'>
                <h1 className='font-bold text-xl'>การประเมินความเสียหาย</h1>
            </div>

            {/* User car info */}
            <div className='bg-white/60 my-2 rounded-md p-4'>
                <div className='flex items-center gap-5 ml-1'>
                    <img src="icon/user.png" alt="user" className='w-6' />
                    <p className='font-semibold text-lg'>
                        คุณ {loadingCars ? "กำลังโหลด..." : (user?.first_name ?? "-")}
                    </p>
                </div>
                <div className='flex mt-3 gap-4'>
                    <img src="icon/car.png" alt="car" className='w-8' />
                    <div className='flex items-center px-2 bg-white rounded-xl drop-shadow-sm w-full'>
                        <select
                            name="user-car"
                            value={selectedCar}
                            onChange={(e) => setSelectedCar(e.target.value)}
                            className='w-full'
                        >
                            <option value="" disabled>-- เลือกรถยนต์ --</option>
                            {cars.map((c) => (
                                <option key={c.license_plate} value={c.license_plate}>
                                    {c.brand || ""} {c.model || ""} ({c.license_plate})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Select part and Upload car image */}
            <div className='bg-white/60 rounded-md p-4'>
                <h3 className='font-semibold text-lg text-center'>ถ่าย/อัปโหลดรูปความเสียหาย</h3>

                <form onSubmit={handleSubmit}>
                    {damageItems.map((item) => {
                        const partObj = getPartObj(item.part);
                        return (
                            <div key={item.id} className='mt-2'>
                                {/* Select car part */}
                                <div className='flex justify-between'>
                                    <div className='flex items-center w-2/3 px-4 py-1 my-2 h-8 bg-white rounded-xl drop-shadow-sm gap-2'>
                                        <img
                                            src={partObj.img}
                                            alt={partObj.label}
                                            className={partObj.className}
                                        />

                                        <select
                                            name="car-part"
                                            value={item.part}
                                            onChange={(e) => handlePartChange(item.id, e)}
                                            className='w-full'
                                        >
                                            {select_part.map((part, index) => {
                                                const isTaken = selectedParts.has(part.value) && part.value !== item.part
                                                return (
                                                    <option value={part.value} key={part.value ?? index} disabled={isTaken}>
                                                        {part.label}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                    </div>
                                </div>

                                {/* Upload area + preview */}
                                <div className="relative bg-white rounded-xl h-70 flex flex-col items-center border-2 border-dashed border-gray-300">
                                    {/* ปุ่มลบกล่อง upload */}
                                    <button
                                        type="button"
                                        onClick={() => { handleRemoveRow(item.id) }}
                                        hidden={damageItems.length <= 1}
                                        className="absolute right-3 text-gray-500 border-gray-500 text-sm border rounded-lg mt-3 px-2 z-10"
                                    >
                                        ยกเลิก
                                    </button>

                                    <label htmlFor={`dropzone-file-${item.id}`} className='w-full cursor-pointer'>
                                        {item.previewUrl ? (
                                            <div className="px-4 pt-10 h-65 flex flex-col justify-center gap-3">
                                                {/* preview image */}
                                                <div className="m-auto">
                                                    <img
                                                        src={item.previewUrl}
                                                        alt="preview"
                                                        className="max-h-48 object-contain rounded-lg"
                                                    />
                                                </div>

                                                {/* ปุ่มลบรูป */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleRemoveImage(item.id)
                                                    }}
                                                    className="text-red-600 m-auto"
                                                >
                                                    <IoTrashBin size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="h-70 flex flex-col items-center justify-center opacity-40">
                                                <TbPhotoPlus size={25} className='mb-4' />
                                                <p className="mb-2">Click to upload or take photo</p>
                                            </div>
                                        )}

                                        <input
                                            id={`dropzone-file-${item.id}`}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleFileChange(item.id, e)}
                                        />
                                    </label>
                                </div>
                            </div>
                        )
                    })}

                    <div className='flex flex-col items-center mt-3 gap-4'>
                        {/* ปุ่มเพิ่มรูป */}
                        <button
                            type="button"
                            onClick={handleAddImage}
                            hidden={damageItems.length >= MAX_IMAGES}
                            className='bg-white opacity-40 text-center py-0.5 px-3 rounded-full w-fit text-sm active:scale-90 cursor-pointer select-none'
                        >
                            + เพิ่มรูปภาพ
                        </button>

                        {/* ปุ่ม submit */}
                        <button
                            type="submit"
                            className={`bg-[#FF5F25]/80 text-white text-center py-0.5 px-3 rounded-full drop-shadow-lg w-fit active:scale-90 cursor-pointer select-none 
                                ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            ประเมินความเสียหาย
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}