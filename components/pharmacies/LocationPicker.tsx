'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useState } from 'react'
import L, { type LatLngLiteral } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Bundlers don't resolve Leaflet's default marker image paths — point at CDN instead.
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface LocationPickerProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const [position, setPosition] = useState<LatLngLiteral>({ lat, lng })

  function handleChange(newLat: number, newLng: number) {
    setPosition({ lat: newLat, lng: newLng })
    onChange(newLat, newLng)
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-300" style={{ height: 280 }}>
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Marker position={[position.lat, position.lng]} icon={markerIcon} />
        <ClickHandler onChange={handleChange} />
      </MapContainer>
    </div>
  )
}
