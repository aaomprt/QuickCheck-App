import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { userIcon, centerIcon } from '../utils/MapIcon';

function RecenterOnChange({ userLocation, selectedCenter }) {
    const map = useMap()

    useEffect(() => {
        // zoom to service center ที่เลื่อก
        if (selectedCenter && selectedCenter.lat && selectedCenter.lng) {
            map.flyTo([selectedCenter.lat, selectedCenter.lng], 15)
            return
        }

        // zoom to user location
        if (userLocation && userLocation.lat && userLocation.lng) {
            map.flyTo([userLocation.lat, userLocation.lng], 15)
        }

    }, [userLocation, selectedCenter, map])

    return null
}

export default function ViewMap({ centers, userLocation, selectedCenter, onSelectCenter, }) {

    const DEFAULT_CENTER = [13.736717, 100.523186] // Bangkok

    return (
        <MapContainer
            center={userLocation
                ? [userLocation.lat, userLocation.lng]
                : DEFAULT_CENTER}
            zoom={15}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
            />

            {/* Marker ศูนย์บริการทุกอัน */}
            {centers.map((c, i) => (
                <Marker
                    key={i}
                    position={[c.lat, c.lng]}
                    icon={centerIcon}
                    eventHandlers={{
                        click: () => onSelectCenter && onSelectCenter(c),
                    }}
                >
                    <Popup>{c.name}</Popup>
                </Marker>
            ))}

            {/* Marker ตำแหน่งผู้ใช้ */}
            {userLocation && (
                <Marker
                    position={[userLocation.lat, userLocation.lng]}
                    icon={userIcon}
                    eventHandlers={{
                        click: () => onSelectCenter && onSelectCenter(userLocation),
                    }}
                >
                    <Popup>ตำแหน่งของคุณ</Popup>
                </Marker>
            )}

            <RecenterOnChange
                userLocation={userLocation}
                selectedCenter={selectedCenter}
            />
        </MapContainer>
    )
}
