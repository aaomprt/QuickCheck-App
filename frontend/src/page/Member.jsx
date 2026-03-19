import React, { useState, useEffect } from "react";
import Select from "react-select";
import toast, { Toaster } from 'react-hot-toast';
import Swal from 'sweetalert2';

import liff from '@line/liff';

import { API_BASE_URL } from '../config.js';
import LoadingPage from "../components/LoadingPage";
import { car_model_year, select_province } from "../assets/Data.jsx";

const CAR_MODELS = Object.keys(car_model_year);

const DEFAULT_CAR = {
    brand: "",
    model: "",
    year: "",
    license_plate: "",
    chassis_number: "",
    province: "",
};

const provinceOptions = select_province.map((p) => ({
    value: p.value,
    label: p.name_th
}));

const brandOptions = [{
    value: "Toyota",
    label: "Toyota"
}];

const modelOptions = CAR_MODELS.map((m) => ({
    value: m,
    label: m
}));

const selectStyle = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#fff',
        minHeight: '32px',
        borderColor: state.isFocused ? '#a3a3a3' : '#d1d5db',
        boxShadow: 'none',
    }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
};

function getModelImage(model) {
    const map = {
        'Camry': '/model/Camry.png',
        'Corolla cross': '/model/Corolla cross.png',
        'Yaris ativ': '/model/Yaris ativ.png',
        'Yaris sedan': '/model/Yaris sedan.png',
        'Yaris hatchback': '/model/Yaris hatchback.png',
        'Altis': '/model/Altis.png',
    };
    return map[model] ?? '';
}

function getYearOptions(model) {
    return model ? car_model_year[model].map((y) => ({ value: y.toString(), label: y.toString() })) : [];
}

function validateCar(car) {
    const errors = [];

    if (!car.brand?.trim()) errors.push('กรุณาเลือกยี่ห้อรถ');
    if (!car.model?.trim()) errors.push('กรุณาเลือกแบบรถ');
    if (!car.year?.toString().trim()) errors.push('กรุณาเลือกรุ่นปี');
    if (!car.license_plate?.trim()) errors.push('กรุณากรอกเลขทะเบียน');
    if (!car.province?.trim()) errors.push('กรุณาเลือกจังหวัดที่จดทะเบียน');
    if (car.chassis_number?.trim() && car.chassis_number.trim().length !== 17) {
        errors.push('เลขตัวรถต้องมี 17 ตัวอักษร');
    }

    return errors;
}

function buildCarPayload(car) {
    return {
        brand: car.brand,
        model: car.model,
        year: parseInt(car.year),
        license_plate: car.license_plate,
        chassis_number: car.chassis_number?.trim() || null,
        province: car.province,
    };
}

function CarSelectField({ label, id, options, value, onChange, isDisabled }) {
    return (
        <>
            <div className="text-gray-600 col-span-1">{label}</div>
            <div className="col-span-1">
                <Select
                    inputId={id}
                    instanceId={id}
                    options={options}
                    placeholder={`-- เลือก${label} --`}
                    value={options.find((o) => o.value === value) || null}
                    onChange={onChange}
                    isDisabled={isDisabled}
                    classNamePrefix="react-select"
                    className="w-full"
                    styles={selectStyle}
                />
            </div>
        </>
    );
}

function CarFormFields({ car, suffix, onInputChange, onBrandChange, onModelChange, onYearChange, onProvinceChange, readOnlyPlate }) {
    const yearOptions = getYearOptions(car.model);

    return (
        <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-sm font-medium mb-4">
            <div className="text-gray-600 col-span-1">เลขทะเบียน</div>
            <input
                type="text"
                name="license_plate"
                value={car.license_plate}
                onChange={onInputChange}
                readOnly={readOnlyPlate}
                className="w-full p-1 border border-gray-300 rounded transition text-sm"
                placeholder="กข 1234"
            />

            <CarSelectField
                label="จังหวัดที่จดทะเบียน"
                id={`province-${suffix}`}
                options={provinceOptions}
                value={car.province}
                onChange={onProvinceChange}
            />

            <CarSelectField
                label="ยี่ห้อรถ"
                id={`brand-${suffix}`}
                options={brandOptions}
                value={car.brand}
                onChange={onBrandChange}
            />

            <CarSelectField
                label="แบบรถ"
                id={`model-${suffix}`}
                options={modelOptions}
                value={car.model}
                onChange={onModelChange}
            />

            <CarSelectField
                label="รุ่นปี ค.ศ."
                id={`year-${suffix}`}
                options={yearOptions}
                value={car.year}
                onChange={onYearChange}
                isDisabled={!car.model}
            />

            <div className="text-gray-600 col-span-1">เลขตัวรถ</div>
            <input
                type="text"
                name="chassis_number"
                value={car.chassis_number}
                onChange={onInputChange}
                className="w-full p-1 border border-gray-300 rounded transition text-sm"
                placeholder="AAAAA12345A123456"
            />
        </div>
    );
}

// Car Accordion
function CarAccordion({ car, idx, onEditCar, onDeleteCar }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editCar, setEditCar] = useState({ ...car });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditCar(prev => ({ ...prev, [name]: value }));
    };

    const handleBrandChange = (opt) => setEditCar(prev => ({ ...prev, brand: opt?.value || "" }));
    const handleModelChange = (opt) => {
        if (!opt?.value) {
            setEditCar(prev => ({ ...prev, model: '', year: '' }));
        } else {
            setEditCar(prev => ({ ...prev, model: opt.value, year: car_model_year[opt.value][0].toString() }));
        }
    };
    const handleYearChange = (opt) => setEditCar(prev => ({ ...prev, year: opt?.value || "" }));
    const handleProvinceChange = (opt) => setEditCar(prev => ({ ...prev, province: opt?.value || "" }));

    const handleSaveEdit = (e) => {
        e.preventDefault();
        const errors = validateCar(editCar);

        if (errors.length > 0) {
            errors.forEach(msg => toast.error(msg));
            return;
        }

        onEditCar(idx, editCar);
        setEditMode(false);
    };

    const handleCancelEdit = () => {
        setEditCar({ ...car });
        setEditMode(false);
    };

    const handleDelete = (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "คุณต้องการลบข้อมูลรถยนต์นี้หรือไม่?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ตกลง',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                onDeleteCar(idx);
                Swal.fire('ลบสำเร็จ!', 'ข้อมูลรถยนต์ถูกลบออกแล้ว', 'success');
            }
        });
    };

    const provinceName = select_province.find((p) => p.value === car.province)?.name_th || car.province;

    return (
        <div className="mb-4 border rounded-lg bg-white/80 shadow">

            {/* car info box */}
            <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => setOpen(v => !v)}
            >
                <span className="font-semibold text-base text-left">
                    {car.brand} {car.model} {car.license_plate} {car.province ? `(${provinceName})` : ''}
                </span>
                <span className="flex items-center gap-2">
                    <img
                        src="icon/edit-car.png"
                        alt="edit_car"
                        className="w-5 h-5 cursor-pointer hover:scale-110"
                        onClick={(e) => { e.stopPropagation(); setEditMode(true); setOpen(true); }}
                    />
                    <span className="text-gray-500">{open ? "▲" : "▼"}</span>
                </span>
            </button>

            {/* form car */}
            {open && (
                <div className="px-4 pb-5">
                    {editMode ? (
                        <form onSubmit={handleSaveEdit} className="mb-2">
                            {/* model image */}
                            {editCar.carImage && (
                                <div className="flex justify-center mb-3">
                                    <img src={editCar.carImage} alt="preview" className="w-48 h-28 object-contain mb-5" />
                                </div>
                            )}

                            {/* form field */}
                            <CarFormFields
                                car={editCar}
                                suffix={`edit-${idx}`}
                                onInputChange={handleInputChange}
                                onBrandChange={handleBrandChange}
                                onModelChange={handleModelChange}
                                onYearChange={handleYearChange}
                                onProvinceChange={handleProvinceChange}
                                readOnlyPlate
                            />

                            {/* form btn */}
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={handleDelete} className="bg-red-500 text-white py-1 px-4 rounded-full">ลบข้อมูล</button>
                                <button type="submit" className="bg-[#FF5F25]/80 text-white text-center py-0.5 px-3 rounded-full drop-shadow-lg w-fit">บันทึก</button>
                                <button type="button" onClick={handleCancelEdit} className="bg-gray-300 text-gray-700 py-1 px-4 rounded-full">ยกเลิก</button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            {/* model image */}
                            {car.carImage && (
                                <div className="flex justify-center mb-3">
                                    <img src={car.carImage} alt="car" className="w-48 h-28 object-contain mb-5" />
                                </div>
                            )}

                            {/* car info */}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-sm font-medium">
                                <div className="text-gray-600">เลขทะเบียน</div><div>{car.license_plate}</div>
                                <div className="text-gray-600">จังหวัดที่จดทะเบียน</div><div>{select_province.find((p) => p.value === car.province)?.name_th || '-'}</div>
                                <div className="text-gray-600">ยี่ห้อรถ</div><div>{car.brand}</div>
                                <div className="text-gray-600">แบบรถ</div><div>{car.model}</div>
                                <div className="text-gray-600">รุ่นปี ค.ศ.</div><div>{car.year}</div>
                                <div className="text-gray-600">เลขตัวรถ</div><div>{car.chassis_number}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Member() {
    const [displayFormData, setDisplayFormData] = useState({ firstName: '', lastName: '' });
    const [displayCars, setDisplayCars] = useState([]);
    const [showAddCarForm, setShowAddCarForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [lineId, setLineId] = useState(null);
    const [newCar, setNewCar] = useState({ ...DEFAULT_CAR });

    const fetchUserData = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/${id}`);
            if (!response.ok) {
                setDisplayFormData({ firstName: '', lastName: '' });
                setDisplayCars([]);
                return;
            }

            const data = await response.json();
            setDisplayFormData({ firstName: data.user?.first_name || '', lastName: data.user?.last_name || '' });
            setDisplayCars((data.cars || []).map(car => ({
                brand: car.brand,
                model: car.model,
                province: car.province,
                year: car.year?.toString?.() || '',
                license_plate: car.license_plate,
                chassis_number: car.chassis_number || '',
                carImage: getModelImage(car.model),
            })));
        } catch (error) {
            console.error('Error fetching user data:', error);
            setDisplayFormData({ firstName: '', lastName: '' });
            setDisplayCars([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadUser = async () => {
            try {
                const profile = await liff.getProfile();
                setLineId(profile.userId);
                await fetchUserData(profile.userId);
            } catch (err) {
                console.error("LIFF profile error:", err);
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    // ── New car handlers ──
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCar(prev => ({ ...prev, [name]: value }));
    };

    const handleNewCarBrandChange = (opt) => setNewCar(prev => ({ ...prev, brand: opt?.value || "" }));

    const handleNewCarModelChange = (opt) => {
        if (!opt?.value) { setNewCar(prev => ({ ...prev, model: '', year: '' })); return; }
        setNewCar(prev => ({ ...prev, model: opt.value, year: car_model_year[opt.value][0].toString() }));
    };

    const handleNewCarYearChange = (opt) => setNewCar(prev => ({ ...prev, year: opt?.value || "" }));
    const handleNewCarProvinceChange = (opt) => setNewCar(prev => ({ ...prev, province: opt?.value || "" }));

    const resetNewCar = () => { setNewCar({ ...DEFAULT_CAR }); setShowAddCarForm(false); };

    const handleAddCar = async (e) => {
        e.preventDefault();
        const errors = validateCar(newCar);

        if (errors.length > 0) {
            errors.forEach(msg => toast.error(msg));
            return;
        }

        if (!lineId) {
            toast.error("ไม่พบ LINE ID");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/add-cars`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ line_id: lineId, cars: [buildCarPayload(newCar)] }),
            });

            if (response.ok) {
                toast.success('เพิ่มรถสำเร็จ!');
                await fetchUserData(lineId);
            } else {
                try {
                    const contentType = response.headers.get("content-type");
                    const error = contentType?.includes("application/json") ? await response.json() : null;
                    const detail = error?.detail;
                    toast.error(detail && (detail.includes('เลขทะเบียน') || detail.includes('ซ้ำ'))
                        ? detail
                        : 'เกิดข้อผิดพลาดไม่สามารถเพิ่มรถได้');
                } catch {
                    toast.error('เกิดข้อผิดพลาด ไม่สามารถอ่านข้อมูล error ได้');
                }
            }
        } catch (error) {
            console.error('Error adding car:', error);
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        }

        resetNewCar();
    };

    // handle edit car 
    const handleEditCar = async (idx, updatedCar) => {
        const original = displayCars[idx];
        try {
            const response = await fetch(`${API_BASE_URL}/cars/${encodeURIComponent(original.license_plate)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildCarPayload(updatedCar)),
            });

            if (response.ok) {
                toast.success('แก้ไขข้อมูลรถสำเร็จ!');
                await fetchUserData(lineId);
            } else {
                const error = await response.json();
                toast.error(`เกิดข้อผิดพลาด: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error updating car:', error);
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        }
    };

    // handle delete car
    const handleDeleteCar = async (idx) => {
        const car = displayCars[idx];
        try {
            const response = await fetch(`${API_BASE_URL}/cars/${encodeURIComponent(car.license_plate)}`, { method: 'DELETE' });

            if (response.ok) {
                toast.success('ลบข้อมูลรถสำเร็จ!');
                await fetchUserData(lineId);
            } else {
                const error = await response.json();
                toast.error(`เกิดข้อผิดพลาดไม่สามารถลบรถได้: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error deleting car:', error);
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        }
    };

    if (loading) return <LoadingPage title="กำลังโหลดข้อมูลสมาชิก" subtitle="โปรดรอสักครู่..." />;

    return (
        <div className="items-center justify-center">

            {/* notification */}
            <Toaster />


            {/* head */}
            <div className='flex items-center justify-center bg-white/60 h-20'>
                <h1 className='font-bold text-xl text-center text-balance'>QuickCheck member</h1>
            </div>

            {/* user info */}
            <div className="bg-white/60 rounded-md my-2 p-4 items-center justify-center">
                <div className="flex items-center justify-center mt-7 mb-10">
                    <img src="icon/logo.png" alt="QuickCheck_Logo" />
                </div>

                <h2 className="text-xl font-bold text-center mb-2">ข้อมูลสมาชิก</h2>

                <div className="text-lg font-medium rounded-lg mb-1 p-4">
                    <form>
                        <div className="mb-3">
                            <label htmlFor="firstName" className="ml-3 text-gray-700">ชื่อ</label>
                            <input type="text" value={displayFormData.firstName} readOnly className="text-base w-full py-2 px-4 border border-gray-500 rounded-full transition duration-150 bg-gray-100" />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="lastName" className="ml-3 text-gray-700">นามสกุล</label>
                            <input type="text" value={displayFormData.lastName} readOnly className="text-base w-full py-2 px-4 border border-gray-500 rounded-full transition duration-150 bg-gray-100" />
                        </div>
                    </form>
                </div>
            </div>

            {/* car info */}
            <div className="text-lg font-medium bg-white/60 rounded-md my-2 p-4 items-center justify-center">
                <h3 className="text-lg font-semibold text-center mb-7">รายการรถยนต์</h3>

                {displayCars.map((car, idx) => (
                    <CarAccordion
                        key={idx}
                        car={car}
                        idx={idx}
                        onEditCar={handleEditCar}
                        onDeleteCar={handleDeleteCar}
                    />
                ))}

                {showAddCarForm ? (
                    <form className="mb-4 border rounded-lg bg-white/80 shadow p-4" onSubmit={handleAddCar}>
                        <CarFormFields
                            car={newCar}
                            suffix="add"
                            onInputChange={handleInputChange}
                            onBrandChange={handleNewCarBrandChange}
                            onModelChange={handleNewCarModelChange}
                            onYearChange={handleNewCarYearChange}
                            onProvinceChange={handleNewCarProvinceChange}
                        />
                        <div className="flex gap-2 justify-end">
                            <button type="submit" className="bg-[#FF5F25]/80 text-white text-center py-0.5 px-3 rounded-full drop-shadow-lg w-fit active:scale-90 transition">บันทึก</button>
                            <button type="button" onClick={resetNewCar} className="bg-gray-300 text-gray-700 py-1 px-4 rounded-full active:scale-90 transition">ยกเลิก</button>
                        </div>
                    </form>
                ) : (
                    <button
                        type="button"
                        className="bg-[#FF5F25]/80 text-white text-center py-0.5 px-3 rounded-full drop-shadow-lg w-fit active:scale-90 transition"
                        onClick={() => setShowAddCarForm(true)}
                    >
                        เพิ่มรถ +
                    </button>
                )}
            </div>
        </div>
    );
}