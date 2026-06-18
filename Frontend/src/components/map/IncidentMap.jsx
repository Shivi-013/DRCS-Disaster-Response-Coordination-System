import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import { PriorityBadge, StatusBadge } from '../common/Badge'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const priorityColors = {
  Critical: '#EF4444',
  High: '#F59E0B',
  Medium: '#3B82F6',
  Low: '#22C55E',
}

function createCustomIcon(priority) {
  const color = priorityColors[priority] || '#6B7280'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0 C7.163 0 0 7.163 0 16 C0 28 16 42 16 42 C16 42 32 28 32 16 C32 7.163 24.837 0 16 0 Z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  })
}

function campIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="14" fill="#7C3AED" stroke="white" stroke-width="2"/>
      <text x="15" y="20" text-anchor="middle" fill="white" font-size="14">⛺</text>
    </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
}

function MapBounds({ incidents }) {
  const map = useMap()
  useEffect(() => {
    if (incidents.length > 0) {
      const bounds = incidents
        .filter(i => i.lat && i.lng)
        .map(i => [i.lat, i.lng])
      if (bounds.length > 0) {
        try { map.fitBounds(bounds, { padding: [40, 40] }) } catch {}
      }
    }
  }, [incidents, map])
  return null
}

export default function IncidentMap({ incidents = [], camps = [], height = '500px', showCamps = true }) {
  const center = [25.0961, 85.3131]

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
      <MapContainer
        center={center}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {incidents.filter(i => i.lat && i.lng).map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.lat, incident.lng]}
            icon={createCustomIcon(incident.priority)}
          >
            <Popup className="custom-popup" maxWidth={320}>
              <div className="p-1 min-w-64">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{incident.disaster_type}</h3>
                    <p className="text-xs text-gray-500">{incident.village}, {incident.district}</p>
                  </div>
                  <PriorityBadge priority={incident.priority} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">People Trapped</span>
                    <span className="font-semibold text-gray-900">{incident.people_trapped}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Status</span>
                    <StatusBadge status={incident.status} />
                  </div>
                  {incident.medical_emergency && (
                    <div className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                      <span>⚕️</span> Medical Emergency
                    </div>
                  )}
                  {incident.children_present && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 font-semibold">
                      <span>👶</span> Children Present
                    </div>
                  )}
                  {incident.image_url && (
                    <div className="mt-2">
                      <img src={incident.image_url} alt="Incident" className="w-full h-24 object-cover rounded-lg" />
                    </div>
                  )}
                  {incident.description && (
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-3">{incident.description}</p>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Reporter: {incident.name} • {incident.phone}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {showCamps && camps.filter(c => c.lat && c.lng).map((camp) => (
          <Marker
            key={camp.id}
            position={[camp.lat, camp.lng]}
            icon={campIcon()}
          >
            <Popup>
              <div className="p-1 min-w-52">
                <h3 className="font-bold text-purple-800 text-sm mb-2">⛺ {camp.name}</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">District</span>
                    <span className="font-medium">{camp.district}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-medium">{camp.occupied}/{camp.capacity}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (camp.occupied / camp.capacity) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-semibold ${camp.status === 'Full' ? 'text-red-600' : 'text-green-600'}`}>{camp.status}</span>
                  </div>
                  <p className="text-gray-400">Contact: {camp.contact_phone}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapBounds incidents={incidents} />
      </MapContainer>
    </div>
  )
}
