import React, { useState, useEffect } from "react";
import liff from "@line/liff";
import { API_BASE_URL } from '../config.js';
import LoadingPage from "../components/LoadingPage";
import { car_model_year } from "../assets/Data.jsx";

const CAR_MODELS = Object.keys(car_model_year);

// Accordion component for car details (with edit feature)
function CarAccordion({ car, idx, onEditCar, onDeleteCar }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editCar, setEditCar] = useState({ ...car });
    const [editErrors, setEditErrors] = useState({
        brand: '',
        model: '',
        year: '',
        license_plate: '',
        chassis_number: '',
    });

    // handle input change for editCar (except model, year)
    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditCar((prev) => ({ ...prev, [name]: value }));
    };

    // handle model and year change for editCar
    const handleEditCarChange = (e) => {
        const { name, value } = e.target;

        if (name === 'brand') {
            setEditCar((prev) => ({ ...prev, brand: value }));
        }
        else if (name === 'model') {
            if (!value) {
                setEditCar((prev) => ({ ...prev, model: '', year: '' }));
            } else {
                const years = car_model_year[value];
                setEditCar((prev) => ({
                    ...prev,
                    model: value,
                    year: years[0].toString()
                }));
            }
        }
        else if (name === 'year') {
            setEditCar((prev) => ({ ...prev, year: value }));
        }
    };

    // handle save edit with validation
    const handleSaveEdit = (e) => {
        e.preventDefault();
        let errors = {
            brand: '',
            model: '',
            year: '',
            license_plate: '',
            chassis_number: '',
        };
        let hasError = false;
        if (!editCar.brand || !editCar.brand.trim()) {
            errors.brand = 'กรุณาเลือกยี่ห้อรถ';
            hasError = true;
        }
        if (!editCar.model || !editCar.model.trim()) {
            errors.model = 'กรุณาเลือกแบบรถ';
            hasError = true;
        }
        if (!editCar.year || !editCar.year.toString().trim()) {
            errors.year = 'กรุณาเลือกรุ่นปี';
            hasError = true;
        }
        if (!editCar.license_plate || !editCar.license_plate.trim()) {
            errors.license_plate = 'กรุณากรอกเลขทะเบียน';
            hasError = true;
        }
        if (editCar.chassis_number && editCar.chassis_number.trim()) {
            if (editCar.chassis_number.trim().length !== 17) {
                errors.chassis_number = 'เลขตัวรถต้องมี 17 ตัวอักษร';
                hasError = true;
            }
        }
        setEditErrors(errors);
        if (hasError) return;
        onEditCar(idx, editCar);
        setEditMode(false);
    };

    // handle cancel edit
    const handleCancelEdit = () => {
        setEditCar({ ...car });
        setEditMode(false);
    };

    // handle delete car
    const handleDeleteCar = (e) => {
        e.preventDefault();
        if (window.confirm("คุณต้องการลบข้อมูลรถยนต์นี้หรือไม่?")) {
            onDeleteCar(idx);
        }
    };

    return (
        <div className="mb-4 border rounded-lg bg-white/80 shadow">
            <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => setOpen((v) => !v)}
            >
                <span className="font-semibold text-base text-left">
                    {car.brand}  {car.model}  {car.license_plate}
                </span>
                <span className="flex items-center gap-2">
                    {/* Edit icon */}
                    <img
                        src="icon/edit-car.png"
                        alt="edit_car"
                        className="w-5 h-5 cursor-pointer hover:scale-110"
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditMode(true);
                            setOpen(true);
                        }}
                    />
                    <span className="text-gray-500">{open ? "▲" : "▼"}</span>
                </span>
            </button>
            {open && (
                <div className="px-4 pb-5">
                    {editMode ? (
                        <form onSubmit={handleSaveEdit} className="mb-2">
                            <div className="flex justify-center mb-3">
                                {editCar.carImage && (
                                    <img src={editCar.carImage} alt="preview" className="w-48 h-28 object-contain mb-5" />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-y-2 text-sm font-medium mb-4">
                                <div className="text-gray-600 col-span-1">เลขทะเบียน</div>
                                <div className="col-span-1">
                                    <input
                                        type="text"
                                        name="license_plate"
                                        value={editCar.license_plate}
                                        onChange={handleEditInputChange}
                                        className="border rounded p-1 w-full"
                                        readOnly
                                    />
                                    {editErrors.license_plate && <div className="text-red-500 text-xs mt-1">{editErrors.license_plate}</div>}
                                </div>

                                <div className="text-gray-600 col-span-1">ยี่ห้อรถ</div>
                                <div className="col-span-1">
                                    <select
                                        name="brand"
                                        value={editCar.brand}
                                        onChange={handleEditCarChange}
                                        className="border rounded p-1 w-full"
                                        required
                                    >
                                        <option value="" disabled>- เลือกยี่ห้อรถ -</option>
                                        <option value="Toyota">Toyota</option>
                                    </select>
                                    {editErrors.brand && <div className="text-red-500 text-xs mt-1">{editErrors.brand}</div>}
                                </div>

                                <div className="text-gray-600 col-span-1">แบบรถ</div>
                                <div className="col-span-1">
                                    <select
                                        name="model"
                                        value={editCar.model}
                                        onChange={handleEditCarChange}
                                        className="border rounded p-1 w-full"
                                        required
                                    >
                                        <option value="" disabled>- เลือกแบบรถ -</option>
                                        {CAR_MODELS.map((model) => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                    {editErrors.model && <div className="text-red-500 text-xs mt-1">{editErrors.model}</div>}
                                </div>

                                <div className="text-gray-600 col-span-1">รุ่นปี ค.ศ.</div>
                                <div className="col-span-1">
                                    <select
                                        name="year"
                                        value={editCar.year}
                                        onChange={handleEditCarChange}
                                        className="border rounded p-1 w-full"
                                        required
                                        disabled={!editCar.model}
                                    >
                                        <option value="" disabled>- เลือกรุ่นปี ค.ศ. -</option>
                                        {editCar.model && car_model_year[editCar.model].map((year) => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    {editErrors.year && <div className="text-red-500 text-xs mt-1">{editErrors.year}</div>}
                                </div>

                                <div className="text-gray-600 col-span-1">เลขตัวรถ</div>
                                <div className="col-span-1">
                                    <input
                                        type="text"
                                        name="chassis_number"
                                        value={editCar.chassis_number}
                                        onChange={handleEditInputChange}
                                        className="border rounded p-1 w-full"
                                    />
                                    {editErrors.chassis_number && <div className="text-red-500 text-xs mt-1">{editErrors.chassis_number}</div>}
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={handleDeleteCar} className="bg-red-500 text-white py-1 px-4 rounded-full">ลบข้อมูล</button>
                                <button type="submit" className="bg-[#FF5F25]/80 text-white text-center py-0.5 px-3 rounded-full drop-shadow-lg w-fit">บันทึก</button>
                                <button type="button" onClick={handleCancelEdit} className="bg-gray-300 text-gray-700 py-1 px-4 rounded-full">ยกเลิก</button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <div className="flex justify-center  mb-3">
                                {car.carImage && (
                                    <img
                                        src={car.carImage}
                                        alt="car"
                                        className="w-48 h-28 object-contain  mb-5"
                                    />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-sm font-medium">
                                <div className="text-gray-600">เลขทะเบียน</div>
                                <div>{car.license_plate}</div>
                                <div className="text-gray-600">ยี่ห้อรถ</div>
                                <div>{car.brand}</div>
                                <div className="text-gray-600">แบบรถ</div>
                                <div>{car.model}</div>
                                <div className="text-gray-600">รุ่นปี ค.ศ.</div>
                                <div>{car.year}</div>
                                <div className="text-gray-600">เลขตัวรถ</div>
                                <div>{car.chassis_number}</div>
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

    const setEmptyState = () => {
        setDisplayFormData({ firstName: '', lastName: '' });
        setDisplayCars([]);
    };

    // Map car.model to exact image filename
    const getModelImage = (model) => {
        if (!model) return '';
        if (model === 'Camry') return '/model/Camry.png';
        if (model === 'Corolla cross') return '/model/Corolla cross.png';
        if (model === 'Yaris ativ') return '/model/Yaris ativ.png';
        if (model === 'Yaris sedan') return '/model/Yaris sedan.png';
        if (model === 'Yaris hatchback') return '/model/Yaris hatchback.png';
        if (model === 'Altis') return '/model/Altis.png';
        return '';
    };

    // ฟังก์ชันดึงข้อมูลผู้ใช้และรถจาก API
    const fetchUserData = async (lineIdParam) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/${lineIdParam}`);

            if (!response.ok) {
                console.error('Failed to fetch user data');
                setEmptyState();
                return;
            }

            const data = await response.json();

            setDisplayFormData({
                firstName: data.user?.first_name || '',
                lastName: data.user?.last_name || ''

            });

            const carsWithImages = (data.cars || []).map(car => ({
                brand: car.brand,
                model: car.model,
                year: car.year?.toString?.() || '',
                license_plate: car.license_plate,
                chassis_number: car.chassis_number || '',
                carImage: getModelImage(car.model)
            }));

            setDisplayCars(carsWithImages);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setEmptyState();
        } finally {
            setLoading(false);
        }
    };

    // ดึงข้อมูลผู้ใช้จาก LIFF
    useEffect(() => {
        const loadUser = async () => {
            try {
                const profile = await liff.getProfile();
                setLineId(profile.userId);
                await fetchUserData(profile.userId);
            } catch (err) {
                console.error("LIFF profile error:", err);
                setDisplayFormData(mockFormData);
                setDisplayCars(mockCars);
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const [newCar, setNewCar] = useState({
        brand: "",
        model: "",
        year: "",
        license_plate: "",
        chassis_number: ""
    });

    // handle input change for newCar (except model, year)
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCar((prev) => ({ ...prev, [name]: value }));
    };

    // handle model and year change for newCar
    const handleNewCarChange = (e) => {
        const { name, value } = e.target;

        if (name === 'brand') {
            setNewCar((prev) => ({ ...prev, brand: value }));
        }
        else if (name === 'model') {
            if (!value) {
                setNewCar((prev) => ({ ...prev, model: '', year: '' }));
            } else {
                const years = car_model_year[value];
                setNewCar((prev) => ({
                    ...prev,
                    model: value,
                    year: years[0].toString()
                }));
            }
        }
        else if (name === 'year') {
            setNewCar((prev) => ({ ...prev, year: value }));
        }
    };

    // handle add car
    const handleAddCar = async (e) => {
        e.preventDefault();

        if (!lineId) {
            alert("ไม่พบ LINE ID");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/add-cars`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    line_id: lineId,
                    cars: [{
                        brand: newCar.brand,
                        model: newCar.model,
                        year: parseInt(newCar.year),
                        license_plate: newCar.license_plate,
                        chassis_number: newCar.chassis_number.trim() || null
                    }]
                })
            });

            if (response.ok) {
                alert('เพิ่มรถสำเร็จ!');
                // รีเฟรชข้อมูลจาก API
                await fetchUserData(lineId);
            } else {
                const error = await response.json();
                alert(`เกิดข้อผิดพลาด: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error adding car:', error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        }

        setNewCar({
            brand: "",
            model: "",
            year: "",
            license_plate: "",
            chassis_number: ""
        });
        setShowAddCarForm(false);
    };

    // handle cancel
    const handleCancel = () => {
        setNewCar({
            brand: "",
            model: "",
            year: "",
            license_plate: "",
            chassis_number: ""
        });
        setShowAddCarForm(false);
    };

    // handle edit car (update car at idx)
    const handleEditCar = async (idx, updatedCar) => {
        const originalCar = displayCars[idx];
        try {
            const response = await fetch(`${API_BASE_URL}/cars/${encodeURIComponent(originalCar.license_plate)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    brand: updatedCar.brand,
                    model: updatedCar.model,
                    year: parseInt(updatedCar.year),
                    license_plate: updatedCar.license_plate,
                    chassis_number: updatedCar.chassis_number.trim() || null
                })
            });

            if (response.ok) {
                alert('แก้ไขข้อมูลรถสำเร็จ!');
                // รีเฟรชข้อมูลจาก API
                await fetchUserData(lineId);
            } else {
                const error = await response.json();
                alert(`เกิดข้อผิดพลาด: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error updating car:', error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        }
    };

    // handle delete car (remove car at idx)
    const handleDeleteCar = async (idx) => {
        const carToDelete = displayCars[idx];
        try {
            const response = await fetch(`${API_BASE_URL}/cars/${encodeURIComponent(carToDelete.license_plate)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('ลบรถสำเร็จ!');
                // รีเฟรชข้อมูลจาก API
                await fetchUserData(lineId);
            } else {
                const error = await response.json();
                alert(`เกิดข้อผิดพลาด: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error deleting car:', error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        }
    };

    if (loading) {
        return <LoadingPage
            title="กำลังโหลดข้อมูลสมาชิก"
            subtitle="โปรดรอสักครู่"
        />;
    }

    return (
        <div className="items-center justify-center">

            {/* Head */}
            <div className='flex items-center justify-center bg-white/60 h-20'>
                <h1 className='font-bold text-xl text-center text-balance'>QuickCheck member</h1>
            </div>

            <div className="bg-white/60 rounded-md my-2 p-4 items-center justify-center">

                {/* Logo Section */}
                <div className="flex items-center justify-center mt-7 mb-10">
                    <img src="icon/logo.png" alt="QuickCheck_Logo" />
                </div>

                <h2 className="text-xl font-bold text-center mb-2">ข้อมูลสมาชิก</h2>

                {/* User Info Section */}
                <div className="text-lg font-medium rounded-lg mb-1 p-4">
                    <form>
                        <div className="mb-3">
                            <label htmlFor="firstName" className="ml-3 text-gray-700">ชื่อ</label>
                            <input
                                type="text"
                                value={displayFormData.firstName}
                                readOnly
                                className="text-base w-full py-2 px-4 border border-gray-500 rounded-full transition duration-150 bg-gray-100"
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="lastName" className="ml-3 text-gray-700">นามสกุล</label>
                            <input
                                type="text"
                                value={displayFormData.lastName}
                                readOnly
                                className="text-base w-full py-2 px-4 border border-gray-500 rounded-full transition duration-150 bg-gray-100"
                            />
                        </div>
                    </form>
                </div>
            </div>

            {/* Car List Section */}
            <div className="text-lg font-medium bg-white/60 rounded-md my-2 p-4 items-center justify-center">
                <h3 className="text-lg font-semibold text-center mb-7">รายการรถยนต์</h3>
                {displayCars.map((car, idx) => (
                    <CarAccordion car={car} idx={idx} key={idx} onEditCar={handleEditCar} onDeleteCar={handleDeleteCar} />
                ))}

                {/* Add Car Form */}
                {showAddCarForm ? (
                    <form className="mb-4 border rounded-lg bg-white/80 shadow p-4" onSubmit={handleAddCar}>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-sm font-medium mb-4">
                            <div className="text-gray-600 col-span-1">เลขทะเบียน</div>
                            <input
                                type="text"
                                name="license_plate"
                                value={newCar.license_plate}
                                onChange={handleInputChange}
                                className="col-span-1 border rounded p-1"
                                placeholder="กข 1234 กรุงเทพมหานคร"
                                required
                            />

                            <div className="text-gray-600 col-span-1">ยี่ห้อรถ</div>
                            <select
                                name="brand"
                                value={newCar.brand}
                                onChange={handleNewCarChange}
                                className="col-span-1 border rounded p-1"
                                required
                            >
                                <option value="" disabled>- เลือกยี่ห้อรถ -</option>
                                <option value="Toyota">Toyota</option>
                            </select>
                            <div className="text-gray-600 col-span-1">แบบรถ</div>
                            <select
                                name="model"
                                value={newCar.model}
                                onChange={handleNewCarChange}
                                className="col-span-1 border rounded p-1"
                                required
                            >
                                <option value="" disabled>- เลือกแบบรถ -</option>
                                {CAR_MODELS.map((model) => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                            <div className="text-gray-600 col-span-1">รุ่นปี ค.ศ.</div>
                            <select
                                name="year"
                                value={newCar.year}
                                onChange={handleNewCarChange}
                                className="col-span-1 border rounded p-1"
                                required
                                disabled={!newCar.model}
                            >
                                <option value="" disabled>- เลือกรุ่นปี ค.ศ. -</option>
                                {newCar.model && car_model_year[newCar.model].map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <label htmlFor={`chassis_number`}>เลขตัวรถ <span className="text-gray-400 text-xs">(ถ้ามี)</span></label>
                            <input
                                type="text"
                                name="chassis_number"
                                value={newCar.chassis_number}
                                onChange={handleInputChange}
                                className="border rounded p-1"
                                placeholder="AAAAA12345A123456"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button type="submit" className="bg-[#FF5F25]/80 text-white text-center py-0.5 px-3 rounded-full drop-shadow-lg w-fit active:scale-90 transition">บันทึก</button>
                            <button type="button" onClick={handleCancel} className="bg-gray-300 text-gray-700 py-1 px-4 rounded-full active:scale-90 transition">ยกเลิก</button>
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