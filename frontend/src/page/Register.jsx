import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Select from 'react-select';
import toast, { Toaster } from 'react-hot-toast';

import liff from '@line/liff';
import { API_BASE_URL, LIFF_ID } from '../config.js';
import LoadingPage from "../components/LoadingPage";
import { select_province, car_model_year } from '../assets/Data.jsx';

const CAR_MODELS = Object.keys(car_model_year);

const DEFAULT_CAR = {
    brand: '',
    model: '',
    year: '',
    license_plate: '',
    chassis_number: '',
    province: '',
};

const DEFAULT_CAR_ERROR = {
    brand: '',
    model: '',
    year: '',
    license_plate: '',
    province: '',
};

const provinceOptions = select_province.map((p) => ({
    value: p.value,
    label: p.name_th,
}));

function validateForm(formData, cars) {
    const errors = {
        first_name: '',
        last_name: '',
        agreeToTerms: '',
        cars: cars.map(() => ({ ...DEFAULT_CAR_ERROR })),
    };

    if (!formData.agreeToTerms) {
        errors.agreeToTerms = 'กรุณากดยินยอมการใช้ข้อมูลส่วนบุคคลก่อนสมัครสมาชิก';
    }
    if (!formData.first_name.trim()) {
        errors.first_name = 'กรุณากรอกชื่อ';
    }
    if (!formData.last_name.trim()) {
        errors.last_name = 'กรุณากรอกนามสกุล';
    }

    cars.forEach((car, idx) => {
        if (!car.brand) errors.cars[idx].brand = 'กรุณาเลือกยี่ห้อรถ';
        if (!car.model) errors.cars[idx].model = 'กรุณาเลือกแบบรถ';
        if (!car.year) errors.cars[idx].year = 'กรุณาเลือกรุ่นปี';
        if (!car.license_plate.trim()) errors.cars[idx].license_plate = 'กรุณากรอกเลขทะเบียน';
        if (!car.province) errors.cars[idx].province = 'กรุณาเลือกจังหวัดที่จดทะเบียน';
    });

    const hasError =
        !!errors.first_name ||
        !!errors.last_name ||
        !!errors.agreeToTerms ||
        errors.cars.some(e => Object.values(e).some(Boolean));

    return { errors, hasError };
}

function buildSubmitData(lineId, formData, cars) {
    return {
        line_id: lineId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        consent: formData.agreeToTerms,
        cars: cars.map(car => ({
            brand: car.brand,
            model: car.model,
            year: parseInt(car.year),
            license_plate: car.license_plate,
            chassis_number: car.chassis_number.trim() || null,
            province: car.province,
        })),
    };
}

function ErrorMessage({ message }) {
    if (!message) return null;
    return <div className="text-red-500 text-sm mt-1 ml-4">{message}</div>;
}

function TextInput({ id, name, value, onChange, placeholder, hasError }) {
    return (
        <input
            type="text"
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full py-2 px-4 border rounded-full transition duration-150 text-base
                ${hasError
                    ? 'border-red-500 shadow-sm shadow-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none'
                    : 'border-gray-500'}`}
        />
    );
}

function SelectInput({ id, name, value, onChange, disabled, hasError, children }) {
    return (
        <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full py-2 px-4 border rounded-full appearance-none text-base
                ${hasError
                    ? 'border-red-500 shadow-sm shadow-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none'
                    : 'border-gray-500'}`}
        >
            {children}
        </select>
    );
}

function CarForm({ car, idx, errors, onChange, onRemove, showRemove }) {
    const carErrors = errors.cars[idx] || {};

    return (
        <div className="relative">
            <div className="ml-4 font-semibold flex items-center justify-between">
                <span>รถคันที่ {idx + 1}</span>
                {showRemove && (
                    <button
                        type="button"
                        className="text-xs text-red-500 border border-red-500 rounded-full px-2 py-0.5 ml-2 hover:bg-red-50 transition"
                        onClick={() => onRemove(idx)}
                        aria-label={`ลบรถคันที่ ${idx + 1}`}
                    >
                        ยกเลิกการเพิ่มรถ
                    </button>
                )}
            </div>

            <div className='border border-gray-500 rounded-3xl p-3 mb-4 shadow-lg'>

                {/* Brand */}
                <div className="mb-2">
                    <label htmlFor={`brand-${idx}`} className='ml-4'>ยี่ห้อรถ</label>

                    <SelectInput
                        id={`brand-${idx}`}
                        name="brand"
                        value={car.brand}
                        onChange={e => onChange(idx, e)}
                        hasError={!!carErrors.brand}
                    >
                        <option value="" disabled>-- เลือกยี่ห้อรถ --</option>
                        <option value="Toyota">Toyota</option>
                    </SelectInput>

                    <ErrorMessage message={carErrors.brand} />
                </div>

                {/* Model + Year */}
                <div className="flex gap-3 mb-2">
                    <div className="flex-1">
                        <label htmlFor={`model-${idx}`} className='ml-4'>แบบรถ</label>
                        <SelectInput
                            id={`model-${idx}`}
                            name="model"
                            value={car.model}
                            onChange={e => onChange(idx, e)}
                            hasError={!!carErrors.model}
                        >
                            <option value="" disabled>-- เลือกแบบรถ --</option>
                            {CAR_MODELS.map((model) => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </SelectInput>

                        <ErrorMessage message={carErrors.model} />
                    </div>

                    <div className="flex-1">
                        <label htmlFor={`year-${idx}`} className='ml-4'>รุ่นปี ค.ศ.</label>

                        <SelectInput
                            id={`year-${idx}`}
                            name="year"
                            value={car.year}
                            onChange={e => onChange(idx, e)}
                            disabled={!car.model}
                            hasError={!!carErrors.year}
                        >
                            <option value="" disabled>-- เลือกรุ่นปี ค.ศ. --</option>
                            {car.model && car_model_year[car.model].map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </SelectInput>

                        <ErrorMessage message={carErrors.year} />
                    </div>
                </div>

                {/* License Plate */}
                <div className="mb-3">
                    <label htmlFor={`license_plate-${idx}`} className='ml-4'>เลขทะเบียน</label>

                    <TextInput
                        id={`license_plate-${idx}`}
                        name="license_plate"
                        value={car.license_plate}
                        onChange={e => onChange(idx, e)}
                        placeholder="กข 1234"
                        hasError={!!carErrors.license_plate}
                    />

                    <ErrorMessage message={carErrors.license_plate} />
                </div>

                {/* Province */}
                <div className="mb-2">
                    <label htmlFor={`province-${idx}`} className='ml-4'>จังหวัดที่จดทะเบียน</label>

                    <Select
                        inputId={`province-${idx}`}
                        instanceId={`province-${idx}`}
                        options={provinceOptions}
                        isSearchable
                        openMenuOnFocus
                        placeholder="-- พิมพ์เพื่อค้นหาจังหวัด --"
                        value={provinceOptions.find((o) => o.value === car.province) || null}
                        onChange={(opt) => onChange(idx, { target: { name: "province", value: opt?.value || "" } })}
                        unstyled
                        components={{ DropdownIndicator: null }}
                        classNames={{
                            control: (state) => [
                                "w-full py-2 px-4 border rounded-full transition duration-150 text-base",
                                carErrors.province ? "border-red-500 shadow-sm shadow-red-500 focus-within:ring-1 focus-within:ring-red-500" : "border-gray-500",
                                state.isFocused ? "ring-1 ring-black" : "",
                            ].join(" "),
                            placeholder: () => "text-gray-500/90",
                            menu: () => "max-h-56 rounded-xl bg-white shadow-lg overflow-auto",
                            option: (state) => ["px-4 py-2", state.isFocused ? "bg-gray-100" : "", state.isSelected ? "bg-gray-200" : ""].join(" "),
                            noOptionsMessage: () => "px-4 py-2 text-gray-500/90",
                        }}
                        menuPortalTarget={document.body}
                    />

                    <ErrorMessage message={carErrors.province} />
                </div>

                {/* Chassis Number */}
                <div className="mb-2">
                    <label htmlFor={`chassis_number-${idx}`} className='ml-4'>
                        เลขตัวรถ <span className="text-gray-500 text-sm">(ถ้ามี)</span>
                    </label>

                    <input
                        type="text"
                        id={`chassis_number-${idx}`}
                        name="chassis_number"
                        value={car.chassis_number}
                        onChange={e => onChange(idx, e)}
                        placeholder="AAAAA12345A123456"
                        className="w-full py-2 px-4 border rounded-full transition duration-150 text-base border-gray-500"
                    />

                </div>
            </div>
        </div>
    );
}

function ConsentPopup({ onAccept, onClose }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="relative bg-white rounded-xl shadow-lg p-6 w-85 text-center z-10">
                <p className="text-base text-gray-800 font-medium mb-4">
                    ข้าพเจ้ายินยอมให้ QuickCheck จัดเก็บและใช้ข้อมูลชื่อบัญชี LINE เพื่อวัตถุประสงค์ในการติดต่อประสานงานและแจ้งข้อมูลข่าวสารที่เกี่ยวข้อง
                </p>
                <button
                    className="mt-2 px-4 py-1 bg-[#FF5F25] text-white rounded-full shadow active:scale-90 transition"
                    onClick={onAccept}
                >
                    ยินยอม
                </button>
            </div>
            <div className="fixed inset-0 bg-black opacity-30 z-0" onClick={onClose} />
        </div>
    );
}

export default function Register() {
    const navigate = useNavigate();
    const [lineId, setLineId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConsentPopup, setShowConsentPopup] = useState(false);

    const [cars, setCars] = useState([{ ...DEFAULT_CAR }]);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        agreeToTerms: false
    });

    const [formErrors, setFormErrors] = useState({
        first_name: '',
        last_name: '',
        agreeToTerms: '',
        cars: [{ ...DEFAULT_CAR_ERROR }],
    });

    // Init LIFF + check user
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true });

                if (!liff.isLoggedIn()) {
                    liff.login({ redirectUri: window.location.href });
                    return;
                }

                const profile = await liff.getProfile();
                if (cancelled) return;

                setLineId(profile.userId);

                const res = await fetch(`${API_BASE_URL}/check_user/${profile.userId}`);
                if (cancelled) return;

                if (res.ok) { navigate("/member", { replace: true }); return; }
            } catch (err) {
                console.error("Initial error", err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        init();
        return () => { cancelled = true; };
    }, [navigate]);

    const handleUserChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCarChange = (idx, e) => {
        const { name, value } = e.target;
        setCars(prev => prev.map((car, i) => {
            if (i !== idx) return car;
            if (name === 'model') {
                if (!value) return { ...car, model: '', year: '' };
                return { ...car, model: value, year: car_model_year[value][0].toString() };
            }
            if (name === 'year' && !value) return { ...car, year: '' };
            return { ...car, [name]: value };
        }));
    };

    const handleAddCar = () => setCars(prev => [...prev, { ...DEFAULT_CAR }]);

    const handleRemoveCar = (idx) => {
        setCars(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
    };

    const handleConsentCheckbox = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowConsentPopup(true);
    };

    const handleConsentAccept = () => {
        setShowConsentPopup(false);
        setFormData(prev => ({ ...prev, agreeToTerms: true }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { errors, hasError } = validateForm(formData, cars);
        setFormErrors(errors);

        if (errors.agreeToTerms) setShowConsentPopup(true);
        if (hasError) return;

        try {
            setIsSubmitting(true);
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildSubmitData(lineId, formData, cars)),
            });

            const result = await response.json();

            if (response.ok) {
                toast.success('ลงทะเบียนสำเร็จ!');
                window.location.href = '/member';
            } else {
                toast.error(`เกิดข้อผิดพลาด: ${result.detail || 'ไม่สามารถลงทะเบียนได้'}`);
                console.error('Registration error:', result);
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
            console.error('Network error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <LoadingPage title="กำลังตรวจสอบข้อมูล" subtitle="กรุณารอสักครู่..." />;

    return (
        <>
            {/* Notification */}
            <Toaster />

            {/* Loading page for submit */}
            {isSubmitting && (
                <div className='fixed inset-0 z-50 bg-gray-500/70 backdrop-blur-sm'>
                    <LoadingPage title='กำลังลงทะเบียน' subtitle='โปรดรอสักครู่...' />
                </div>
            )}

            {/* Head */}
            <div className='flex items-center justify-center bg-white/60 h-20'>
                <h1 className='font-bold text-xl text-center text-balance'>QuickCheck member</h1>
            </div>

            <div className="bg-white/60 rounded-md my-2 p-4 items-center justify-center">
                <div className="flex items-center justify-center mt-7 mb-10">
                    <img src="icon/logo.png" alt="Logo" />
                </div>

                <h2 className="text-xl font-bold text-center mb-2">ลงทะเบียนสมาชิก</h2>

                {/* Form */}
                <div className="text-lg p-2">
                    <form onSubmit={handleSubmit}>

                        {/* First Name */}
                        <div className="my-2">
                            <label htmlFor="first_name" className='ml-4 font-semibold'>
                                ชื่อ <span className="text-[#FF5F25] text-sm font-normal">(ไม่ต้องระบุคำนำหน้าชื่อและอักษรพิเศษ)</span>
                            </label>

                            <TextInput
                                id="first_name"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleUserChange}
                                placeholder="XXXXXXXXXX"
                                hasError={!!formErrors.first_name}
                            />

                            <ErrorMessage message={formErrors.first_name} />
                        </div>

                        {/* Last Name */}
                        <div className="my-2">
                            <label htmlFor="last_name" className='ml-4 font-semibold'>นามสกุล</label>

                            <TextInput
                                id="last_name"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleUserChange}
                                placeholder="XXXXXXXXXX"
                                hasError={!!formErrors.last_name}
                            />

                            <ErrorMessage message={formErrors.last_name} />
                        </div>

                        {/* Cars */}
                        {cars.map((car, idx) => (
                            <CarForm
                                key={idx}
                                car={car}
                                idx={idx}
                                errors={formErrors}
                                onChange={handleCarChange}
                                onRemove={handleRemoveCar}
                                showRemove={cars.length > 1}
                            />
                        ))}

                        {/* Add Car */}
                        <div className="my-3">
                            <button
                                type="button"
                                className="bg-[#FF5F25]/80 text-white text-center py-0.5 px-3 rounded-full drop-shadow-lg w-fit active:scale-90 transition"
                                onClick={handleAddCar}
                            >
                                <span className="font-bold">+ </span>เพิ่มรถ
                            </button>
                        </div>

                        {/* Consent Checkbox */}
                        <div className="items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="agreeToTerms"
                                name="agreeToTerms"
                                checked={formData.agreeToTerms}
                                onChange={handleUserChange}
                                className="hidden"
                            />

                            <label
                                htmlFor="agreeToTerms"
                                className="flex items-center cursor-pointer mb-1 text-sm w-fit"
                                onClick={handleConsentCheckbox}
                            >
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 bg-white ${formErrors.agreeToTerms ? 'border-red-500' : 'border-gray-400'}`}>
                                    <span className={`w-2 h-2 rounded-full transition-opacity duration-150 ${formData.agreeToTerms ? 'bg-orange-500' : 'bg-white opacity-0'}`} />
                                </span>
                                ** อนุญาตการใช้ข้อมูลส่วนบุคคล **
                            </label>
                            
                            <ErrorMessage message={formErrors.agreeToTerms} />
                        </div>

                        {showConsentPopup && (
                            <ConsentPopup onAccept={handleConsentAccept} onClose={() => setShowConsentPopup(false)} />
                        )}

                        {/* Submit */}
                        <div className="m-auto w-fit">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-[#FF5F25]/80 text-white text-center py-0.5 px-3 rounded-full drop-shadow-lg active:scale-90 transition"
                            >
                                สมัครสมาชิก
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}