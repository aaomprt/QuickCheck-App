import L from 'leaflet'

export const userIcon = new L.Icon({
    iconUrl: 'icon/user-pin.png',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
})

export const centerIcon = new L.Icon({
    iconUrl: 'icon/center-pin.png',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
})
