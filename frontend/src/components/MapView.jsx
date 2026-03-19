import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Circle, useGoogleMap } from "@react-google-maps/api";

import formatDuration from "../utils/formatDuration";
import { MAPS_API_KEY, MAP_ID } from "../config";

import { IoClose } from "react-icons/io5";

const GOOGLE_MAP_LIBRARIES = ["routes", "marker", "geometry"];

const CONTAINER_STYLE = { 
    width: "100%", 
    height: "100%" 
};

const DEFAULT_CENTER = { 
    lat: 13.736717, 
    lng: 100.523186 
};

const CIRCLE_OPTIONS = {
    fillColor: "#4285F4",
    fillOpacity: 0.12,
    strokeColor: "#4285F4",
    strokeOpacity: 0.35,
    strokeWeight: 2,
    clickable: false,
    zIndex: 1,
};

const MAP_OPTIONS = {
    disableDefaultUI: true,
    zoomControl: true,
    mapId: MAP_ID,
};

const POLYLINE_OPTIONS = {
    strokeColor: "#04364A",
    strokeWeight: 6,
    strokeOpacity: 0.8,
    zIndex: 50,
};

function toLatLng(obj) {
    const lat = Number(obj?.lat);
    const lng = Number(obj?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function createUserDotElement() {
    const dot = document.createElement("div");
    Object.assign(dot.style, {
        width: "18px",
        height: "18px",
        backgroundColor: "#4285F4",
        border: "3px solid #FFFFFF",
        borderRadius: "50%",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
    });
    return dot;
}

function createPinElement(isSelected) {
    const { PinElement } = window.google.maps.marker;
    return isSelected
        ? new PinElement({ background: '#EA4335', borderColor: '#C5221F', scale: 1.2 })
        : new PinElement({ background: '#04364A', borderColor: '#FFFFFF', glyphSrc: 'icon/car-marker.png', scale: 1.1 });
}

function useDirections(map, userPosition, routeDestination) {
    const [routeData, setRouteData] = useState(null);
    const polylineRef = useRef(null);

    // สร้าง Polyline ครั้งเดียวตอน map พร้อม
    useEffect(() => {
        if (!map) return;
        polylineRef.current = new window.google.maps.Polyline({ map, ...POLYLINE_OPTIONS });
        return () => { polylineRef.current?.setMap(null); };
    }, [map]);

    useEffect(() => {
        if (!routeDestination || !userPosition || !map || !polylineRef.current) {
            setRouteData(null);
            polylineRef.current?.setPath([]);
            return;
        }

        let cancelled = false;

        const fetchRoute = async () => {
            try {
                const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': MAPS_API_KEY,
                        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport',
                    },
                    body: JSON.stringify({
                        origin: { location: { latLng: { latitude: userPosition.lat, longitude: userPosition.lng } } },
                        destination: { location: { latLng: { latitude: routeDestination.lat, longitude: routeDestination.lng } } },
                        travelMode: 'DRIVE',
                        routingPreference: 'TRAFFIC_AWARE',
                    }),
                });

                const data = await res.json();
                if (cancelled || !data.routes?.length) return;

                const route = data.routes[0];
                const { low, high } = route.viewport;

                polylineRef.current.setPath(
                    window.google.maps.geometry.encoding.decodePath(route.polyline.encodedPolyline)
                );

                setRouteData({
                    bounds: new window.google.maps.LatLngBounds(
                        { lat: low.latitude, lng: low.longitude },
                        { lat: high.latitude, lng: high.longitude }
                    ),
                    distanceText: `${(route.distanceMeters / 1000).toFixed(1)} กม.`,
                    durationText: formatDuration(parseInt(route.duration.replace('s', ''))),
                });

            } catch (err) {
                console.error("Fetch route failed", err);
            }
        };

        fetchRoute();
        return () => { cancelled = true; };
    }, [map, userPosition, routeDestination]);

    return routeData;
}

function useMapCamera(map, targetPosition, routeData) {
    useEffect(() => {
        if (!map) return;
        if (routeData?.bounds) { map.fitBounds(routeData.bounds); return; }
        if (!targetPosition) return;
        map.panTo(targetPosition);
        map.setZoom(13);
    }, [map, targetPosition, routeData]);
}

function RouteInfoBanner({ routeInfo }) {
    if (!routeInfo) return null;
    return (
        <div className="absolute z-20 top-20 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-2xl shadow-lg text-sm whitespace-nowrap">
            <div className="font-semibold text-[#04364A]">
                {routeInfo.durationText} • {routeInfo.distanceText}
            </div>
        </div>
    );
}

function RouteControls({ routeTarget, onClearRoute }) {
    if (!routeTarget) return null;
    return (
        <div className="absolute z-20 bottom-18 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap">
            <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${routeTarget.lat},${routeTarget.lng}`, "_blank")}
                className="bg-[#04364A] text-white px-4 py-2 rounded-full shadow-lg"
            >
                เริ่มนำทาง
            </button>
            <button type="button" onClick={() => onClearRoute?.()} className="bg-white text-[#04364A] px-2 py-2 rounded-full shadow-lg">
                <IoClose size={18} />
            </button>
        </div>
    );
}

// Center marker
function CustomAdvancedMarker({ position, title, isSelected, onClick }) {
    const map = useGoogleMap();
    const markerRef = useRef(null);
    const onClickRef = useRef(onClick);

    useEffect(() => { onClickRef.current = onClick; }, [onClick]);

    useEffect(() => {
        if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            title,
            content: createPinElement(isSelected),
            zIndex: isSelected ? 999 : 1,
        });

        const listener = markerRef.current.addListener("gmp-click", () => onClickRef.current?.());
        return () => {
            window.google.maps.event.removeListener(listener);
            markerRef.current.map = null;
        };
    }, [map, position.lat, position.lng, title, isSelected]);

    return null;
}

// User marker
function CustomUserAdvancedMarker({ position }) {
    const map = useGoogleMap();
    const markerRef = useRef(null);

    useEffect(() => {
        if (!map || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            title: "ตำแหน่งของคุณ",
            content: createUserDotElement(),
            zIndex: 9999,
        });

        return () => { markerRef.current.map = null; };
    }, [map, position.lat, position.lng]);

    return null;
}

function CenterMarkers({ centers, selectedCenter, routeDestination, onMarkerClick }) {
    return (centers || []).map((c) => {
        const pos = toLatLng(c);
        if (!pos) return null;
        if (routeDestination && (pos.lat !== routeDestination.lat || pos.lng !== routeDestination.lng)) return null;

        const isSelected = !!selectedCenter && (
            c.id === selectedCenter.id ||
            (pos.lat === Number(selectedCenter.lat) && pos.lng === Number(selectedCenter.lng))
        );

        return (
            <CustomAdvancedMarker
                key={c.id ?? `${pos.lat},${pos.lng}`}
                position={pos}
                title={c.name}
                isSelected={isSelected}
                onClick={() => onMarkerClick(c)}
            />
        );
    });
}

function UserLocationMarker({ position }) {
    if (!position) return null;
    return (
        <>
            <Circle center={position} radius={5000} options={CIRCLE_OPTIONS} />
            <CustomUserAdvancedMarker position={position} />
        </>
    );
}

export default function MapView({ centers, userLocation, selectedCenter, routeTarget, onClearRoute, onLoadingChange, onPopupSelectCenter }) {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: MAPS_API_KEY,
        libraries: GOOGLE_MAP_LIBRARIES,
        language: "th",
    });

    useEffect(() => { onLoadingChange?.(!isLoaded); }, [isLoaded, onLoadingChange]);

    const [map, setMap] = useState(null);
    const onLoad = useCallback((m) => setMap(m), []);
    const onUnmount = useCallback(() => setMap(null), []);

    const userPosition = useMemo(() => toLatLng(userLocation), [userLocation]);
    const routeDestination = useMemo(() => toLatLng(routeTarget), [routeTarget]);
    const targetPosition = useMemo(() => toLatLng(selectedCenter) ?? userPosition, [selectedCenter, userPosition]);

    const directions = useDirections(map, userPosition, routeDestination);
    useMapCamera(map, targetPosition, directions);

    if (!isLoaded) return null;

    return (
        <>
            <RouteInfoBanner routeInfo={routeDestination ? directions : null} />
            <RouteControls routeTarget={routeTarget} onClearRoute={onClearRoute} />

            <GoogleMap
                mapContainerStyle={CONTAINER_STYLE}
                center={userPosition || DEFAULT_CENTER}
                zoom={15}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={MAP_OPTIONS}
            >
                <CenterMarkers
                    centers={centers}
                    selectedCenter={selectedCenter}
                    routeDestination={routeDestination}
                    onMarkerClick={onPopupSelectCenter}
                />
                <UserLocationMarker position={userPosition} />
            </GoogleMap>
        </>
    );
}