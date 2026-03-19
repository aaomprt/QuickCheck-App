import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Sheet } from 'react-modal-sheet';
import Swal from 'sweetalert2';

import CenterItem from '../components/CenterItem';
import MapView from '../components/MapView.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import { getDistance } from '../utils/Distance';
import { API_BASE_URL } from '../config.js';

import { IoClose } from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa";
import { HiOutlineListBullet } from "react-icons/hi2";

function isCenterOpen(center, now) {
    const [openH, openM] = center.open_time.split(":");
    const [closeH, closeM] = center.close_time.split(":");

    const openTime = new Date(now);
    openTime.setHours(Number(openH), Number(openM), 0, 0);

    const closeTime = new Date(now);
    closeTime.setHours(Number(closeH), Number(closeM), 0, 0);

    return now >= openTime && now <= closeTime;
}

function buildCenterKey(center) {
    return center.id ?? `${center.lat}-${center.lng}`;
}

function useUserLocation() {
    const [userLocation, setUserLocation] = useState(null);

    const fetch = () => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {
                Swal.fire({
                    title: "กรุณาเปิด GPS",
                    icon: "warning",
                    confirmButtonColor: "#04364A"
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 * 60 * 5 }
        );
    };

    return { userLocation, fetchUserLocation: fetch };
}

function useSortedCenters(serviceCenter, Search, userLocation) {
    const filtered = serviceCenter.filter(c =>
        c.name.toLowerCase().includes(Search.toLowerCase())
    );

    return useMemo(() => {
        if (!userLocation) return filtered;

        return [...filtered]
            .map(center => ({
                ...center,
                distance: getDistance(userLocation.lat, userLocation.lng, center.lat, center.lng)
            }))
            .sort((a, b) => a.distance - b.distance);
    }, [filtered, userLocation]);
}

export default function ServiceMap() {
    const [isSheetOpen, setSheetOpen] = useState(true);
    const [Search, setSearch] = useState("");
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [serviceCenter, setServiceCenter] = useState([]);
    const [routeTarget, setRouteTarget] = useState(null);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const itemRefs = useRef({});
    const listRef = useRef(null);
    const skipAutoScrollRef = useRef(false);

    const { userLocation, fetchUserLocation } = useUserLocation();
    const sortedCenters = useSortedCenters(serviceCenter, Search, userLocation);

    const sheetRef = useRef(null);
    const now = new Date();

    useEffect(() => { fetchUserLocation(); }, []);

    // service center data api
    useEffect(() => {
        fetch(`${API_BASE_URL}/service_center`)
            .then((res) => res.json())
            .then((data) => setServiceCenter(data))
            .catch((err) => console.error('Error fetching center:', err));
    }, []);

    // scroll service list
    const scrollToCenter = (center) => {
        const key = buildCenterKey(center);
        const el = itemRefs.current[key];
        const listEl = listRef.current;
        if (!el || !listEl) return;

        listEl.scrollTo({
            top: Math.max(0, el.offsetTop - 60),
            behavior: "smooth",
        });
    };

    const handleMapPopupSelect = (center) => {
        setSelectedCenter(center);
        setSheetOpen(true);

        setTimeout(() => {
            sheetRef.current?.snapTo(2);
            scrollToCenter(center);
        }, 250);
    };

    return (
        <>
            {/* Loading page */}
            {isMapLoading && (
                <div className="fixed inset-0 z-99999 bg-[#9ACBD0]">
                    <LoadingPage
                        title="กำลังโหลด Google Map"
                        subtitle="โปรดรอสักครู่..."
                    />
                </div>
            )}

            <div className="relative w-full h-screen">
                <div className='absolute inset-0 z-0'>
                    <MapView
                        centers={serviceCenter}
                        userLocation={userLocation}
                        selectedCenter={selectedCenter}
                        routeTarget={routeTarget}
                        onClearRoute={() => setRouteTarget(null)}
                        onLoadingChange={setIsMapLoading}
                        onPopupSelectCenter={handleMapPopupSelect}
                    />
                </div>

                {/* Search bar */}
                <div className="absolute z-20 w-5/6 h-10 top-5 left-1/2 -translate-x-1/2 drop-shadow-lg">
                    <div className="relative w-full h-full">
                        <input
                            type="text"
                            placeholder="ค้นหาศูนย์ซ่อม"
                            value={Search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={() => setSheetOpen(false)}
                            onKeyDown={(e) => e.key === "Enter" && setSheetOpen(true)}
                            className="bg-white w-full h-full rounded-2xl px-4 pr-12 focus:outline-[#04364A]"
                        />

                        {Search.trim() !== "" && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-black"
                                aria-label="ล้างข้อความค้นหา"
                            >
                                <IoClose size={24} />
                            </button>
                        )}
                    </div>
                </div>

                {/* current location btn */}
                <button
                    onClick={() => {
                        setSelectedCenter(null);
                        fetchUserLocation();
                    }}
                    className={`
                        absolute z-20 bottom-8 left-4 p-3 rounded-full drop-shadow-lg
                        ${userLocation
                            ? 'bg-white text-[#04364A]'
                            : 'bg-[#FF5F25] text-white'}
                    `}
                >
                    <FaLocationArrow size={18} />
                </button>

                <button
                    onClick={() => {
                        setSheetOpen(true);
                        sheetRef.current?.snapTo(1);
                    }}
                    className="absolute z-20 bottom-5 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg text-black flex items-center gap-2"
                >
                    <HiOutlineListBullet size={18} />
                    ดูรายการศูนย์
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

                            {/* Service list */}
                            <div ref={listRef} className="overflow-y-auto">
                                {sortedCenters.map((center, index) => (
                                    <div
                                        key={center.id ?? index}
                                        ref={(el) => {
                                            const key = center.id ?? `${center.lat}-${center.lng}`;
                                            itemRefs.current[key] = el;
                                        }}
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
                                                skipAutoScrollRef.current = true;
                                                setSelectedCenter(center);
                                                sheetRef.current?.snapTo(1);
                                            }}
                                            onRoute={(target) => {
                                                setSelectedCenter(center);
                                                setRouteTarget(target);
                                                setSheetOpen(false);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Sheet.Content>
                </Sheet.Container>
            </Sheet>
        </>
    );
}