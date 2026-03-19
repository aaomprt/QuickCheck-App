import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from 'react-hot-toast';

import liff from '@line/liff';
import { select_part } from '../assets/Data.jsx';
import { API_BASE_URL } from '../config.js';

import { TbPhotoPlus } from "react-icons/tb";
import { IoTrashBin } from "react-icons/io5";

const MAX_IMAGES = 7;

const makeEmptyItem = () => ({
    id: Date.now() + Math.random(),
    part: '',
    file: null,
    previewUrl: '',
});

const revokePreviewUrl = (url) => { if (url) URL.revokeObjectURL(url); };

const getErrorMessage = (e) => {
    if (!e) return "เกิดข้อผิดพลาด";
    if (typeof e === "string") return e;
    return e.message || "เกิดข้อผิดพลาด";
};

const getPartObj = (value) => select_part.find(p => p.value === value) || select_part[0];

// ดึง LIFF profile + fetch user
function useUserCars() {
    const [user, setUser] = useState(null);
    const [cars, setCars] = useState([]);
    const [loadingCars, setLoadingCars] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
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

        init();
        return () => { cancelled = true; };
    }, []);

    return { user, cars, loadingCars };
}

// phase/progress/interval/timeout
function useSubmitProgress() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [phase, setPhase] = useState('indeterminate');
    const [progress, setProgress] = useState(0);

    const startProgress = () => {
        setIsSubmitting(true);
        setPhase("indeterminate");
        setProgress(0);

        const indeterminateMs = 1000 + Math.floor(Math.random() * 2000);
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

        const stop = () => {
            clearTimeout(phaseTimeout);
            if (progressInterval) clearInterval(progressInterval);
            setIsSubmitting(false);
        };

        return stop;
    };

    return { isSubmitting, phase, progress, setProgress, setPhase, startProgress };
}

// loading progress circle
function CircleProgress({ value = 0, size = 90, stroke = 10 }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <svg width={size} height={size} className="block">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-200" />
            <circle
                cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke}
                className="text-[#FF4F0F]" stroke="currentColor" fill="none"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 300ms linear" }}
            />
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-gray-800 font-semibold">
                {Math.round(value)}%
            </text>
        </svg>
    );
}

// loading submitting
function SubmittingOverlay({ phase, progress }) {
    return (
        <div className="fixed inset-0 z-50 bg-gray-500/70 backdrop-blur-sm flex items-center justify-center">
            <div className="w-75 rounded-2xl bg-white shadow-lg p-4 flex flex-col items-center gap-4">
                <div className="text-center">
                    <div className="font-semibold text-lg">กำลังประเมินความเสียหาย</div>
                    <div className="text-sm text-gray-500">โปรดรอสักครู่…</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    {phase === "indeterminate"
                        ? <div className="h-14 w-14 rounded-full border-4 border-gray-200 border-t-[#9ACBD0] animate-spin" />
                        : <CircleProgress value={progress} />
                    }
                </div>
                <div className="text-xs text-gray-400 text-center">
                    ระบบกำลังวิเคราะห์รูปภาพและคำนวณความเสียหาย
                </div>
            </div>
        </div>
    );
}

// user เลือกรถยนต์
function UserCarSelector({ user, cars, loadingCars, selectedCar, onCarChange }) {
    return (
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
                    <select name="user-car" value={selectedCar} onChange={e => onCarChange(e.target.value)} className='w-full'>
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
    );
}

// แถวรูปภาพ + เลือกอะไหล่
function DamageItemRow({ item, selectedParts, onPartChange, onFileChange, onRemoveImage, onRemoveRow, showRemove }) {
    const partObj = getPartObj(item.part);

    return (
        <div className='mt-2'>
            {/* Part selector */}
            <div className='flex justify-between'>
                <div className='flex items-center w-2/3 px-4 py-1 my-2 h-8 bg-white rounded-xl drop-shadow-sm gap-2'>
                    <img src={partObj.img} alt={partObj.label} className={partObj.className} />
                    <select name="car-part" value={item.part} onChange={e => onPartChange(item.id, e)} className='w-full'>
                        {select_part.map((part, index) => {
                            const isTaken = selectedParts.has(part.value) && part.value !== item.part;
                            return (
                                <option value={part.value} key={part.value ?? index} disabled={isTaken}>
                                    {part.label}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {/* Upload area */}
            <div className="relative bg-white rounded-xl h-70 flex flex-col items-center border-2 border-dashed border-gray-300">
                <button
                    type="button"
                    onClick={() => onRemoveRow(item.id)}
                    hidden={!showRemove}
                    className="absolute right-3 text-gray-500 border-gray-500 text-sm border rounded-lg mt-3 px-2 z-10"
                >
                    ยกเลิก
                </button>

                <label htmlFor={`dropzone-file-${item.id}`} className='w-full cursor-pointer'>
                    {item.previewUrl ? (
                        <div className="px-4 pt-10 h-65 flex flex-col justify-center gap-3">
                            <div className="m-auto">
                                <img src={item.previewUrl} alt="preview" className="max-h-48 object-contain rounded-lg" />
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveImage(item.id); }}
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
                        onChange={e => onFileChange(item.id, e)}
                    />
                </label>
            </div>
        </div>
    );
}

export default function AssessCarDamage() {
    const navigate = useNavigate();
    const [selectedCar, setSelectedCar] = useState('');
    const [damageItems, setDamageItems] = useState([makeEmptyItem()]);

    const { user, cars, loadingCars } = useUserCars();
    const { isSubmitting, phase, progress, setProgress, setPhase, startProgress } = useSubmitProgress();

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => { damageItems.forEach(item => revokePreviewUrl(item.previewUrl)); };
    }, []);

    const selectedParts = useMemo(
        () => new Set(damageItems.map(i => i.part).filter(Boolean)),
        [damageItems]
    );

    // Damage item handlers
    const handlePartChange = (id, event) => {
        const value = event.target.value;
        if (damageItems.some(i => i.id !== id && i.part === value)) {
            toast.error('อะไหล่นี้ถูกเลือกไปแล้ว กรุณาเลือกอะไหล่อื่น');
            return;
        }
        setDamageItems(items => items.map(item => item.id === id ? { ...item, part: value } : item));
    };

    const handleFileChange = (id, event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setDamageItems(items => items.map(item => {
            if (item.id !== id) return item;
            revokePreviewUrl(item.previewUrl);
            return { ...item, file, previewUrl };
        }));
    };

    const handleRemoveImage = (id) => {
        setDamageItems(items => items.map(item => {
            if (item.id !== id) return item;
            revokePreviewUrl(item.previewUrl);
            return { ...item, file: null, previewUrl: '' };
        }));
    };

    const handleRemoveRow = (id) => {
        setDamageItems(items => {
            revokePreviewUrl(items.find(i => i.id === id)?.previewUrl);
            return items.filter(i => i.id !== id);
        });
    };

    const handleAddImage = (e) => {
        e.preventDefault();
        const available = select_part.map(p => p.value).filter(v => v !== '' && !selectedParts.has(v));
        if (available.length === 0) { toast.error('ไม่สามารถเพิ่มได้: ไม่มีอะไหล่ให้เลือกแล้ว'); return; }
        setDamageItems(items => [...items, makeEmptyItem()]);
    };

    // Validation
    const validateForm = () => {
        if (!selectedCar) {
            toast.error('กรุณาเลือกรถยนต์');
            return false;
        }

        if (damageItems.some(item => !item.part)) {
            toast.error('กรุณาเลือกอะไหล่ให้ครบทุกภาพ');
            return false;
        }

        if (damageItems.some(item => !item.file)) {
            toast.error('กรุณาอัปโหลดรูปภาพให้ครบทุกอะไหล่');
            return false;
        }

        return true;
    };

    // Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const stopProgress = startProgress();

        try {
            const fd = new FormData();
            fd.append("license_plate", selectedCar);
            fd.append("items", JSON.stringify(damageItems.map(i => ({ part_type: i.part }))));
            damageItems.forEach(i => fd.append("images", i.file));

            const res = await fetch(`${API_BASE_URL}/assess_damage`, {
                method: "POST",
                body: fd
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || "ส่งข้อมูลไม่สำเร็จ");
                return;
            }

            const data = await res.json();
            setPhase("determinate");
            setProgress(100);
            setTimeout(() => navigate(`/assess-car-damage/result/${data.history_id}`), 350);

        } catch (error) {
            toast.error(getErrorMessage(error) || "เกิดข้อผิดพลาดระหว่างประเมินความเสียหาย");
        } finally {
            stopProgress();
        }
    };

    return (
        <>
            {/* notification */}
            <Toaster />

            {/* loading page */}
            {isSubmitting && <SubmittingOverlay phase={phase} progress={progress} />}

            {/* head */}
            <div className='flex items-center justify-center bg-white/60 h-20'>
                <h1 className='font-bold text-xl'>การประเมินความเสียหาย</h1>
            </div>

            {/* user car info */}
            <UserCarSelector
                user={user}
                cars={cars}
                loadingCars={loadingCars}
                selectedCar={selectedCar}
                onCarChange={setSelectedCar}
            />

            {/* select part & upload area */}
            <div className='bg-white/60 rounded-md p-4'>
                <h3 className='font-semibold text-lg text-center'>ถ่าย/อัปโหลดรูปความเสียหาย</h3>

                <form onSubmit={handleSubmit}>
                    {damageItems.map((item) => (
                        <DamageItemRow
                            key={item.id}
                            item={item}
                            selectedParts={selectedParts}
                            onPartChange={handlePartChange}
                            onFileChange={handleFileChange}
                            onRemoveImage={handleRemoveImage}
                            onRemoveRow={handleRemoveRow}
                            showRemove={damageItems.length > 1}
                        />
                    ))}

                    <div className='flex flex-col items-center mt-3 gap-4'>
                        <button
                            type="button"
                            onClick={handleAddImage}
                            hidden={damageItems.length >= MAX_IMAGES}
                            className='bg-white opacity-40 text-center py-0.5 px-3 rounded-full w-fit text-sm active:scale-90 cursor-pointer select-none'
                        >
                            + เพิ่มรูปภาพ
                        </button>

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
    );
}