import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Select from 'react-select';
import liff from "@line/liff";
import { API_BASE_URL, LIFF_ID } from '../config.js';
import LoadingPage from "../components/LoadingPage";
import { select_province, car_model_year } from '../assets/Data.jsx';
import toast, { Toaster } from 'react-hot-toast';

export default function Register() {
    const CAR_MODELS = Object.keys(car_model_year);
    const [lineId, setLineId] = useState('');
    const navigate = useNavigate();
    const [showConsentPopup, setShowConsentPopup] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const provinceOptions = select_province.map((p) => ({
        value: p.value,
        label: p.name_th,
    }));

    const defaultCar = {
        brand: '',
        model: '',
        year: '',
        license_plate: '',
        chassis_number: '',
        province: '',
    };

    const [cars, setCars] = useState([{ ...defaultCar }]);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        agreeToTerms: false,
    });

    const [formErrors, setFormErrors] = useState({
        first_name: '',
        last_name: '',
        cars: [{ brand: '', model: '', year: '', license_plate: '', province: '' }],
        agreeToTerms: '',
    });

    // โหลด LINE ID จาก LIFF
    useEffect(() => {
        let cancelled = false;

        const initAndCheck = async () => {
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

                if (res.ok) {
                    navigate("/member", { replace: true });
                    return;
                }

                setIsLoading(false);
            } catch (err) {
                console.error("Initial error", err);
                setIsLoading(false);
            }
        };

        initAndCheck();

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    if (isLoading) {
        return <LoadingPage
            title="กำลังตรวจสอบข้อมูล"
            subtitle="กรุณารอสักครู่..."
        />;
    }

    // ป้องกันการเปลี่ยนแปลง checkbox โดยตรง
    const handleConsentCheckbox = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowConsentPopup(true);
    };

    // handle change for user info
    const handleUserChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // handle change for car info
    const handleCarChange = (idx, e) => {
        const { name, value } = e.target;
        setCars(prevCars => prevCars.map((car, i) => {
            if (i !== idx) return car;

            if (name === 'model') {
                // If user selects the placeholder, reset year
                if (!value) {
                    return {
                        ...car,
                        model: '',
                        year: '',
                    };
                }
                const years = car_model_year[value];
                return {
                    ...car,
                    model: value,
                    year: years[0].toString(),
                };
            }

            if (name === 'year' && !value) {
                return {
                    ...car,
                    year: '',
                };
            }
            return {
                ...car,
                [name]: value
            };
        }));
    };

    const handleAddCar = () => {
        setCars(prev => ([...prev, { ...defaultCar }]));
    };

    const handleRemoveCar = (idx) => {
        setCars(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation ฟอร์ม
        let errors = {
            first_name: '',
            last_name: '',
            cars: cars.map(() => ({ brand: '', model: '', year: '', license_plate: '' })),
        };

        // ตรวจสอบว่ากดยินยอมข้อมูลส่วนบุคคลหรือยัง
        if (!formData.agreeToTerms) {
            setShowConsentPopup(true);
            errors.agreeToTerms = 'กรุณากดยินยอมการใช้ข้อมูลส่วนบุคคลก่อนสมัครสมาชิก';
        }

        if (!formData.first_name.trim()) {
            errors.first_name = 'กรุณากรอกชื่อ';
        }
        if (!formData.last_name.trim()) {
            errors.last_name = 'กรุณากรอกนามสกุล';
        }

        cars.forEach((car, idx) => {
            if (!car.brand) {
                errors.cars[idx].brand = 'กรุณาเลือกยี่ห้อรถ';
            }
            if (!car.model) {
                errors.cars[idx].model = 'กรุณาเลือกแบบรถ';
            }
            if (!car.year) {
                errors.cars[idx].year = 'กรุณาเลือกรุ่นปี';
            }
            if (!car.license_plate.trim()) {
                errors.cars[idx].license_plate = 'กรุณากรอกเลขทะเบียน';
            }
            if (!car.province) {
                errors.cars[idx].province = 'กรุณาเลือกจังหวัดที่จดทะเบียน';
            }
        });

        setFormErrors(errors);

        const hasCarError = errors.cars.some(carError =>
            Object.values(carError).some(fieldError => fieldError !== '')
        );

        const hasError =
            !!errors.first_name ||
            !!errors.last_name ||
            !!errors.agreeToTerms ||
            hasCarError;

        if (hasError) return;

        try {
            setIsSubmitting(true);

            // เตรียมข้อมูลสำหรับส่งไปยัง API
            const submitData = {
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
                }))
            };

            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData)
            });

            const result = await response.json();

            if (response.ok) {
                toast.success('ลงทะเบียนสำเร็จ!');
                // Redirect to Member page
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

    return (
        <>

            {/* Notification */}
            <Toaster />

            {/* Loading page */}
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

                {/* Logo Section */}
                <div className="flex items-center justify-center mt-7 mb-10">
                    <img src="icon/logo.png" alt="Logo" />
                </div>

                <h2 className="text-xl font-bold text-center mb-2">ลงทะเบียนสมาชิก</h2>

                {/* Form Section */}
                <div className="text-lg p-2">
                    <form onSubmit={handleSubmit}>

                        {/* Name Field */}
                        <div className="my-2">
                            <label htmlFor="first_name" className='ml-4 font-semibold'>
                                ชื่อ <span className="text-[#FF5F25] text-sm font-normal">(ไม่ต้องระบุคำนำหน้าชื่อและอักษรพิเศษ)</span>
                            </label>

                            <input
                                type="text"
                                id="first_name"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleUserChange}
                                placeholder="XXXXXXXXXX"
                                className={`w-full py-2 px-4 border rounded-full transition duration-150 text-base
                                    ${formErrors.first_name ? 'border-red-500 shadow-sm shadow-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none' : 'border-gray-500'}`}
                            />

                            {formErrors.first_name && (
                                <div className="text-red-500 text-sm mt-1 ml-4">{formErrors.first_name}</div>
                            )}

                        </div>

                        {/* Last Name Field */}
                        <div className="my-2">
                            <label htmlFor="last_name" className='ml-4 font-semibold'>
                                นามสกุล
                            </label>

                            <input
                                type="text"
                                id="last_name"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleUserChange}
                                placeholder="XXXXXXXXXX"
                                className={`w-full py-2 px-4 border rounded-full transition duration-150 text-base
                                    ${formErrors.last_name ? 'border-red-500 shadow-sm shadow-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none' : 'border-gray-500'}`}
                            />

                            {formErrors.last_name && (
                                <div className="text-red-500 text-sm mt-1 ml-4">{formErrors.last_name}</div>
                            )}

                        </div>

                        {/* Car(s) Section */}
                        {cars.map((car, idx) => (
                            <div key={idx} className="relative">
                                <div className="ml-4 font-semibold flex items-center justify-between">
                                    <span>รถคันที่ {idx + 1}</span>
                                    {cars.length > 1 && (
                                        <button
                                            type="button"
                                            className="text-xs text-red-500 border border-red-500 rounded-full px-2 py-0.5 ml-2 hover:bg-red-50 transition"
                                            onClick={() => handleRemoveCar(idx)}
                                            aria-label={`ลบรถคันที่ ${idx + 1}`}
                                        >
                                            ยกเลิกการเพิ่มรถ
                                        </button>
                                    )}
                                </div>

                                <div className='border border-gray-500 rounded-3xl p-3 mb-4 shadow-lg'>
                                    {/* Car Brand Field */}
                                    <div className="mb-2">
                                        <label htmlFor={`brand-${idx}`} className='ml-4'>
                                            ยี่ห้อรถ
                                        </label>

                                        <select
                                            id={`brand-${idx}`}
                                            name="brand"
                                            value={car.brand}
                                            onChange={(e) => handleCarChange(idx, e)}
                                            className={`w-full py-2 px-4 border rounded-full appearance-none text-base
                                                ${formErrors.cars[idx]?.brand ? 'border-red-500 shadow-sm shadow-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none' : 'border-gray-500'}`}
                                        >
                                            <option value="" disabled>-- เลือกยี่ห้อรถ --</option>
                                            <option value="Toyota">Toyota</option>
                                        </select>

                                        {formErrors.cars[idx] && formErrors.cars[idx].brand && (
                                            <div className="text-red-500 text-sm mt-1 ml-4">{formErrors.cars[idx].brand}</div>
                                        )}
                                    </div>

                                    {/* Car Model and Year */}
                                    <div className="flex gap-3 mb-2">
                                        <div className="flex-1">
                                            <label htmlFor={`model-${idx}`} className='ml-4'>แบบรถ</label>

                                            <select
                                                id={`model-${idx}`}
                                                name="model"
                                                value={car.model}
                                                onChange={e => handleCarChange(idx, e)}
                                                className={`w-full py-2 px-4 border rounded-full appearance-none text-base
                                                    ${formErrors.cars[idx]?.model ? 'border-red-500 shadow-sm shadow-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none' : 'border-gray-500'}`}
                                            >
                                                <option value="" disabled>-- เลือกแบบรถ --</option>
                                                {CAR_MODELS.map((model) => (
                                                    <option key={model} value={model}>{model}</option>
                                                ))}
                                            </select>

                                            {formErrors.cars[idx] && formErrors.cars[idx].model && (
                                                <div className="text-red-500 text-sm mt-1 ml-4">{formErrors.cars[idx].model}</div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <label htmlFor={`year-${idx}`} className='ml-4'>รุ่นปี ค.ศ.</label>

                                            <select
                                                id={`year-${idx}`}
                                                name="year"
                                                value={car.year}
                                                onChange={e => handleCarChange(idx, e)}
                                                className={`w-full py-2 px-4 border rounded-full appearance-none text-base
                                                    ${formErrors.cars[idx]?.year ? 'border-red-500 shadow-sm shadow-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none' : 'border-gray-500'}`}
                                                disabled={!car.model}
                                            >
                                                <option value="" disabled>-- เลือกรุ่นปี ค.ศ. --</option>
                                                {car.model && car_model_year[car.model].map((year) => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </select>

                                            {formErrors.cars[idx] && formErrors.cars[idx].year && (
                                                <div className="text-red-500 text-sm mt-1 ml-4">{formErrors.cars[idx].year}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Numberplate Field */}
                                    <div className="mb-3">
                                        <label htmlFor={`license_plate-${idx}`} className='ml-4'>เลขทะเบียน</label>

                                        <input
                                            type="text"
                                            id={`license_plate-${idx}`}
                                            name="license_plate"
                                            value={car.license_plate}
                                            onChange={e => handleCarChange(idx, e)}
                                            placeholder="กข 1234"
                                            className={`w-full py-2 px-4 border rounded-full transition duration-150 text-base
                                                ${formErrors.cars[idx]?.license_plate ? 'border-red-500 shadow-sm shadow-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none' : 'border-gray-500'}`}
                                        />

                                        {formErrors.cars[idx] && formErrors.cars[idx].license_plate && (
                                            <div className="text-red-500 text-sm mt-1 ml-4">{formErrors.cars[idx].license_plate}</div>
                                        )}
                                    </div>

                                    {/* Province Field */}
                                    <div className="mb-2">
                                        <label htmlFor={`province-${idx}`} className='ml-4'>
                                            จังหวัดที่จดทะเบียน
                                        </label>

                                        <Select
                                            inputId={`province-${idx}`}
                                            instanceId={`province-${idx}`}
                                            options={provinceOptions}
                                            isSearchable
                                            openMenuOnFocus
                                            placeholder="-- พิมพ์เพื่อค้นหาจังหวัด --"
                                            value={provinceOptions.find((o) => o.value === car.province) || null}
                                            onChange={(opt) => {
                                                handleCarChange(idx, { target: { name: "province", value: opt?.value || "" } });
                                            }}
                                            unstyled
                                            components={{ DropdownIndicator: null }}
                                            classNames={{
                                                control: (state) =>
                                                    [
                                                        "w-full py-2 px-4 border rounded-full transition duration-150 text-base",
                                                        formErrors.cars[idx]?.province
                                                            ? "border-red-500 shadow-sm shadow-red-500 focus-within:ring-1 focus-within:ring-red-500"
                                                            : "border-gray-500",
                                                        state.isFocused ? "ring-1 ring-black" : "",
                                                    ].join(" "),
                                                placeholder: () => "text-gray-500/90",
                                                menu: () =>
                                                    "max-h-56 rounded-xl bg-white shadow-lg overflow-auto",
                                                option: (state) =>
                                                    [
                                                        "px-4 py-2",
                                                        state.isFocused ? "bg-gray-100" : "",
                                                        state.isSelected ? "bg-gray-200" : "",
                                                    ].join(" "),
                                                noOptionsMessage: () => "px-4 py-2 text-gray-500/90",
                                            }}
                                            menuPortalTarget={document.body}
                                        />

                                        {formErrors.cars[idx] && formErrors.cars[idx].province && (
                                            <div className="text-red-500 text-sm mt-1 ml-4">{formErrors.cars[idx].province}</div>
                                        )}
                                    </div>

                                    {/* Chassis Number Field (optional) */}
                                    <div className="mb-2">
                                        <label htmlFor={`chassis_number-${idx}`} className='ml-4'>
                                            เลขตัวรถ <span className="text-gray-500 text-sm">(ถ้ามี)</span>
                                        </label>

                                        <input
                                            type="text"
                                            id={`chassis_number-${idx}`}
                                            name="chassis_number"
                                            value={car.chassis_number}
                                            onChange={e => handleCarChange(idx, e)}
                                            placeholder="AAAAA12345A123456"
                                            className="w-full py-2 px-4 border rounded-full transition duration-150 text-base border-gray-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add Car Button */}
                        <div className="my-3">
                            <button
                                type="button"
                                className="bg-[#FF5F25]/80 text-white text-center py-0.5 px-3 rounded-full drop-shadow-lg w-fit active:scale-90 transition"
                                onClick={handleAddCar}
                            >
                                <span className="font-bold">+ </span>
                                เพิ่มรถ
                            </button>
                        </div>

                        {/* Privacy Consent Checkbox */}
                        <div className="items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="agreeToTerms"
                                name="agreeToTerms"
                                checked={formData.agreeToTerms}
                                onChange={handleUserChange}
                                className="hidden"
                            />

                            <label htmlFor="agreeToTerms" className="flex items-center cursor-pointer mb-1 text-sm w-fit" onClick={handleConsentCheckbox}>
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center mr-2 bg-white ${formErrors.agreeToTerms ? 'border-red-500' : 'border-gray-400'}`}>
                                    <span className={`w-2 h-2 rounded-full transition-opacity duration-150 ${formData.agreeToTerms ? 'bg-orange-500' : 'bg-white opacity-0'}`} />
                                </span>
                                ** อนุญาตการใช้ข้อมูลส่วนบุคคล **
                            </label>

                            {formErrors.agreeToTerms && (
                                <div className="text-red-500 text-sm">{formErrors.agreeToTerms}</div>
                            )}
                        </div>

                        {/* Consent Popup */}
                        {showConsentPopup && (
                            <div className="fixed inset-0 flex items-center justify-center z-50">
                                <div className="relative bg-white rounded-xl shadow-lg p-6 w-85 text-center z-10">
                                    <p className="text-base text-gray-800 font-medium mb-4">
                                        ข้าพเจ้ายินยอมให้ QuickCheck จัดเก็บและใช้ข้อมูลชื่อบัญชี LINE เพื่อวัตถุประสงค์ในการติดต่อประสานงานและแจ้งข้อมูลข่าวสารที่เกี่ยวข้อง
                                    </p>
                                    <button
                                        className="mt-2 px-4 py-1 bg-[#FF5F25] text-white rounded-full shadow active:scale-90 transition"
                                        onClick={() => {
                                            setShowConsentPopup(false);
                                            setFormData(prev => ({ ...prev, agreeToTerms: true }));
                                        }}
                                    >
                                        ยินยอม
                                    </button>
                                </div>
                                <div className="fixed inset-0 bg-black opacity-30 z-0" onClick={() => setShowConsentPopup(false)} />
                            </div>
                        )}

                        {/* Submit Button */}
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