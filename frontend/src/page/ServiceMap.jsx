import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Sheet } from 'react-modal-sheet';

import CenterItem from '../components/CenterItem';
import ViewMap from '../components/ViewMap';
import { getDistance } from '../utils/Distance';
import { API_BASE_URL } from '../config.js';

import { IoClose } from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa";

// คำนวณเวลาเปิด-ปิดของศูนย์บริการ
function isCenterOpen(center, now) {
    const [openH, openM] = center.open_time.split(":");
    const [closeH, closeM] = center.close_time.split(":");

    const openTime = new Date(now);
    openTime.setHours(Number(openH), Number(openM), 0, 0);

    const closeTime = new Date(now);
    closeTime.setHours(Number(closeH), Number(closeM), 0, 0);

    return now >= openTime && now <= closeTime;
}

export default function ServiceMap() {
    const [isSheetOpen, setSheetOpen] = useState(true);
    const [Search, setSearch] = useState("");
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [serviceCenter, setServiceCenter] = useState([]);
    const sheetRef = useRef(null);
    const now = new Date();

    const filteredCenters = serviceCenter.filter(c =>
        c.name.toLowerCase().includes(Search.toLowerCase())
    );

    const sortedCenters = useMemo(() => {
        if (!userLocation) return filteredCenters;

        return [...filteredCenters]
            .map(center => ({
                ...center,
                distance: getDistance(
                    userLocation.lat,
                    userLocation.lng,
                    center.lat,
                    center.lng
                )
            }))
            .sort((a, b) => a.distance - b.distance);
    }, [filteredCenters, userLocation]);

    // รับตำแหน่งผู้ใช้
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                }
                setUserLocation(loc);
                setSelectedCenter(loc);
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );

        fetch(`${API_BASE_URL}/service_center`)
            .then((res) => res.json())
            .then((data) => setServiceCenter(data))
            .catch((err) => console.error('Error fetching user:', err));
    }, []);

    return (
        <>

            <div className="relative w-full h-screen">

                {/* MAP */}
                <div className='absolute inset-0 z-0 "'>
                    <ViewMap
                        centers={serviceCenter}
                        userLocation={userLocation}
                        selectedCenter={selectedCenter}
                        onSelectCenter={(center) => {
                            setSelectedCenter(center);
                            setSheetOpen(true);
                            sheetRef.current?.snapTo(2);
                        }}
                    />
                </div>

                {/* Search input */}
                <div className='absolute z-20 w-5/6 h-10 top-5 left-1/2 -translate-x-1/2 drop-shadow-lg flex items-center'>
                    <input
                        type="text"
                        placeholder='ค้นหาศูนย์ซ่อม'
                        value={Search}
                        onChange={e => setSearch(e.target.value)}
                        onClick={() => setSheetOpen(false)}
                        onKeyDown={(e) => e.key === "Enter" && setSheetOpen(true)}
                        className='bg-white w-full h-full rounded-2xl px-4 focus:outline-[#04364A]'
                    />
                </div>

                {/* ปุ่มกลับไปตำแหน่งผู้ใช้ */}
                <button
                    disabled={!userLocation}
                    onClick={() => userLocation && setSelectedCenter(userLocation)}
                    className={`
                        absolute z-20 bottom-8 right-4 p-3 rounded-full
                        ${userLocation
                            ? 'bg-white text-[#04364A] drop-shadow-lg'
                            : 'bg-gray-300 text-gray-400 cursor-not-allowed'}
                    `}
                >
                    <FaLocationArrow size={18} />
                </button>
            </div>

            <Sheet
                ref={sheetRef}
                isOpen={isSheetOpen}
                onClose={() => setSheetOpen(false)}
                snapPoints={[0, 0.25, 0.5, 1]}
                initialSnap={2}
            >
                <Sheet.Container style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#9ACBD0' }}>
                    <Sheet.Header />
                    <Sheet.Content>
                        <div className="flex flex-col h-full">
                            {/* Head */}
                            <div className='flex justify-between items-center px-5 mb-4'>
                                <h2 className='text-lg'>
                                    {Search !== '' ? Search : 'ศูนย์ซ่อมใกล้ฉัน'}
                                </h2>
                                <button
                                    className='bg-[#04364A] text-white p-0.5 rounded-full text-sm active:scale-90 cursor-pointer select-none'
                                    onClick={() => setSheetOpen(false)}
                                >
                                    <IoClose size={18} />
                                </button>
                            </div>

                            {/* Service Center */}
                            <div className="overflow-y-auto">
                                {sortedCenters.map((center, index) => (
                                    <div
                                        key={center.id ?? index}
                                        className='bg-white mb-3 mx-3 p-3 rounded-xl drop-shadow-lg'
                                    >
                                        <CenterItem
                                            name={center.name}
                                            openStatus={isCenterOpen(center, now)}
                                            distance={Number(center.distance ?? 0)}
                                            address={center.address}
                                            phone={center.phone}
                                            lat={center.lat}
                                            lng={center.lng}
                                            onSelectCenter={() => {
                                                setSelectedCenter({ lat: center.lat, lng: center.lng });
                                                sheetRef.current?.snapTo(1);
                                            }}
                                        />
                                    </div>
                                ))
                                }
                            </div>
                        </div>
                    </Sheet.Content>
                </Sheet.Container>
                {/* <Sheet.Backdrop /> */}
            </Sheet>
        </>
    )
}