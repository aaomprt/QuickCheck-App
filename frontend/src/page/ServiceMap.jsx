import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Sheet } from 'react-modal-sheet';
import Swal from 'sweetalert2';

import CenterItem from '../components/CenterItem';
import MapView from '../components/MapView.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import formatDuration from "../utils/formatDuration";
import { API_BASE_URL, MAPS_API_KEY } from '../config.js';

import { IoClose } from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa";
import { HiOutlineListBullet } from "react-icons/hi2";

const SHEET_CONTAINER_STYLE = {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#9ACBD0',
};

const UNKNOWN_ROUTE = {
    distanceText: "-",
    distanceValue: Number.MAX_SAFE_INTEGER,
    durationText: "-",
    durationValue: Number.MAX_SAFE_INTEGER,
};

function isCenterOpen(center, now) {
    const toDate = (timeStr) => {
        const [h, m] = timeStr.split(":").map(Number);
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        return d;
    };
    return now >= toDate(center.open_time) && now <= toDate(center.close_time);
}

function buildCenterKey(center) {
    return center.id ?? `${center.lat}-${center.lng}`;
}

function useUserLocation() {
    const [userLocation, setUserLocation] = useState(null);

    const requestLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => Swal.fire({ title: "กรุณาเปิด GPS", icon: "warning", confirmButtonColor: "#04364A" }),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 * 60 * 5 }
        );
    };

    return { userLocation, requestLocation };
}

function useSortedCenters(serviceCenter, appliedSearch, userLocation) {
    const [sortedCenters, setSortedCenters] = useState([]);

    const filtered = useMemo(() =>
        serviceCenter.filter((c) =>
            c.name.toLowerCase().includes(appliedSearch.toLowerCase())
        ),
        [serviceCenter, appliedSearch]
    );

    useEffect(() => {
        if (!filtered.length) { setSortedCenters([]); return; }

        if (!userLocation) {
            setSortedCenters(filtered.map((c) => ({ ...c, ...UNKNOWN_ROUTE })));
            return;
        }

        let cancelled = false;

        const fetchRouteMatrix = async () => {
            try {
                const response = await fetch(
                    'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': MAPS_API_KEY,
                            'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition',
                        },
                        body: JSON.stringify({
                            origins: [{
                                waypoint: { location: { latLng: { latitude: userLocation.lat, longitude: userLocation.lng } } },
                                routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: false },
                            }],
                            destinations: filtered.map((c) => ({
                                waypoint: { location: { latLng: { latitude: Number(c.lat), longitude: Number(c.lng) } } },
                            })),
                            travelMode: 'DRIVE',
                            routingPreference: 'TRAFFIC_AWARE',
                        }),
                    }
                );

                if (!response.ok) throw new Error('RouteMatrix API failed');
                const data = await response.json();
                if (cancelled) return;

                const mapped = filtered.map((center, index) => {
                    const result = data.find((d) => d.destinationIndex === index);
                    if (!result || result.status?.code) return { ...center, ...UNKNOWN_ROUTE };

                    const durationSec = parseInt(result.duration.replace('s', ''));
                    return {
                        ...center,
                        distanceText: `${(result.distanceMeters / 1000).toFixed(1)} กม.`,
                        distanceValue: result.distanceMeters,
                        durationText: formatDuration(durationSec),
                        durationValue: durationSec,
                    };
                });

                mapped.sort((a, b) => a.distanceValue - b.distanceValue);
                setSortedCenters(mapped);

            } catch (error) {
                console.error("RouteMatrix Error:", error);
                if (!cancelled) setSortedCenters(filtered.map((c) => ({ ...c, ...UNKNOWN_ROUTE })));
            }
        };

        fetchRouteMatrix();
        return () => { cancelled = true; };

    }, [filtered, userLocation]);

    return sortedCenters;
}

export default function ServiceMap() {
    const [isSheetOpen, setSheetOpen] = useState(true);
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [serviceCenter, setServiceCenter] = useState([]);
    const [routeTarget, setRouteTarget] = useState(null);
    const [isMapLoading, setIsMapLoading] = useState(true);

    const itemRefs = useRef({});
    const listRef = useRef(null);
    const sheetRef = useRef(null);

    const { userLocation, requestLocation } = useUserLocation();
    const sortedCenters = useSortedCenters(serviceCenter, appliedSearch, userLocation);
    const now = useMemo(() => new Date(), []);

    const displayedCenters = useMemo(() =>
        appliedSearch.trim() ? sortedCenters : sortedCenters.slice(0, 20),
        [sortedCenters, appliedSearch]
    );

    useEffect(() => { requestLocation(); }, []);

    useEffect(() => {
        fetch(`${API_BASE_URL}/service_center`)
            .then((res) => res.json())
            .then(setServiceCenter)
            .catch((err) => console.error('Error fetching center:', err));
    }, []);

    const scrollToCenter = (center) => {
        const el = itemRefs.current[buildCenterKey(center)];
        const listEl = listRef.current;
        if (!el || !listEl) return;
        listEl.scrollTo({ top: Math.max(0, el.offsetTop - 60), behavior: "smooth" });
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
            {isMapLoading && (
                <div className="fixed inset-0 z-99999 bg-[#9ACBD0]">
                    <LoadingPage title="กำลังโหลด Google Map" subtitle="โปรดรอสักครู่..." />
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
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={() => setSheetOpen(false)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    setAppliedSearch(search);
                                    setSheetOpen(true);
                                }
                            }}
                            className="bg-white w-full h-full rounded-2xl px-4 pr-12 focus:outline-[#04364A]"
                        />
                        {search.trim() && (
                            <button
                                type="button"
                                onClick={() => { setSearch(""); setAppliedSearch(""); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-black"
                                aria-label="ล้างข้อความค้นหา"
                            >
                                <IoClose size={24} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Location button */}
                <button
                    onClick={() => { setSelectedCenter(null); requestLocation(); }}
                    className={`absolute z-20 bottom-8 left-4 p-3 rounded-full drop-shadow-lg
                        ${userLocation ? 'bg-white text-[#04364A]' : 'bg-[#FF5F25] text-white'}`}
                >
                    <FaLocationArrow size={18} />
                </button>

                <button
                    onClick={() => { setSheetOpen(true); sheetRef.current?.snapTo(1); }}
                    className="absolute z-20 bottom-5 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg text-black flex items-center gap-2"
                >
                    <HiOutlineListBullet size={18} />
                    ดูรายการศูนย์
                </button>
            </div>

            <Sheet ref={sheetRef} isOpen={isSheetOpen} onClose={() => setSheetOpen(false)} snapPoints={[0, 0.25, 0.5, 1]} initialSnap={2}>
                <Sheet.Container style={SHEET_CONTAINER_STYLE}>
                    <Sheet.Header />
                    <Sheet.Content>
                        <div className="flex flex-col h-full">
                            <div className='flex justify-between items-center px-5 mb-4'>
                                <h2 className='text-lg'>{appliedSearch || 'ศูนย์ซ่อมใกล้ฉัน'}</h2>
                                <button
                                    className='bg-[#04364A] text-white p-0.5 rounded-full text-sm active:scale-90 cursor-pointer select-none'
                                    onClick={() => setSheetOpen(false)}
                                >
                                    <IoClose size={18} />
                                </button>
                            </div>

                            <div ref={listRef} className="overflow-y-auto">
                                {displayedCenters.map((center, index) => {
                                    const isSelected = selectedCenter && buildCenterKey(center) === buildCenterKey(selectedCenter);
                                    return (
                                        <div
                                            key={center.id ?? index}
                                            ref={(el) => { itemRefs.current[buildCenterKey(center)] = el; }}
                                            className={`mb-3 mx-3 p-3 rounded-xl drop-shadow-lg transition-all duration-300 border-2
                                                ${isSelected ? 'bg-[#E8F4F5] border-[#04364A] shadow-md' : 'bg-white border-transparent'}`}
                                        >
                                            <CenterItem
                                                name={center.name}
                                                openStatus={isCenterOpen(center, now)}
                                                distance={center.distanceText}
                                                duration={center.durationText}
                                                address={center.address}
                                                phone={center.phone}
                                                lat={center.lat}
                                                lng={center.lng}
                                                onSelectCenter={() => {
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
                                    );
                                })}
                            </div>
                        </div>
                    </Sheet.Content>
                </Sheet.Container>
            </Sheet>
        </>
    );
}