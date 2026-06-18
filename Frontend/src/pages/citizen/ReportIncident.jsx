import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  MapPin, Upload, X, CheckCircle, AlertTriangle, Loader,
  Users, Phone, Home, CloudRain, Heart, Baby, UserCheck
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { PriorityBadge } from '../../components/common/Badge'
import { api } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const DISTRICTS = ['Patna', 'Muzaffarpur', 'Darbhanga', 'Sitamarhi', 'Supaul', 'Katihar', 'Samastipur', 'Vaishali', 'Gaya', 'Bhagalpur', 'Munger', 'Begusarai', 'Nalanda', 'Araria', 'Madhubani']
const DISASTER_TYPES = ['Flood', 'Cyclone', 'Earthquake', 'Fire', 'Landslide', 'Lightning Strike', 'Building Collapse', 'Boat Capsize', 'Chemical Leak', 'Other']
const WATER_LEVELS = ['None', 'Low (< 1 ft)', 'Medium (1-3 ft)', 'High (3-6 ft)', 'Very High (> 6 ft)', 'Severe (Roof Level)']

const defaultForm = {
  name: '', phone: '', district: '', village: '',
  lat: '', lng: '', disaster_type: '',
  people_trapped: 0, children_present: false, senior_citizens_present: false,
  medical_emergency: false, pregnant_woman_present: false,
  water_level: 'None', description: '',
}

export default function ReportIncident() {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(null)
  const [locating, setLocating] = useState(false)

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const getLocation = () => {
    setLocating(true)
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        setForm(p => ({ ...p, lat: coords.latitude.toFixed(6), lng: coords.longitude.toFixed(6) }))
        setLocating(false)
        toast.success('Location captured!')
      },
      () => {
        setLocating(false)
        toast.error('Could not get location. Enter manually.')
      }
    )
  }

  const onDrop = useCallback((accepted) => {
    const file = accepted[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1, maxSize: 10 * 1024 * 1024
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.district || !form.disaster_type) return toast.error('Please fill all required fields')

    setLoading(true)
    const formData = new FormData()
    Object.entries(form).forEach(([k, v]) => formData.append(k, v))
    if (image) formData.append('image', image)

    try {
      const res = await api.post('/incidents/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSubmitted(res.data)
      toast.success('Incident reported successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit report')
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <DashboardLayout>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto">
          <div className="card p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
            <p className="text-gray-500 mb-6">Your incident has been received and is being reviewed by our team.</p>

            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Priority Assigned</span>
                <PriorityBadge priority={submitted.priority} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Disaster Type</span>
                <span className="font-semibold">{submitted.disaster_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">District</span>
                <span className="font-semibold">{submitted.district}</span>
              </div>
              {submitted.estimated_response_time && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Est. Response Time</span>
                  <span className="font-semibold text-primary-600">{submitted.estimated_response_time}</span>
                </div>
              )}
            </div>

            {submitted.priority_reasoning && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-left mb-6">
                <p className="text-xs font-semibold text-blue-700 mb-1">AI Priority Analysis</p>
                <p className="text-xs text-blue-600 leading-relaxed">{submitted.priority_reasoning}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setSubmitted(null); setForm(defaultForm); setImage(null); setImagePreview(null) }} className="btn-secondary flex-1 justify-center">
                Report Another
              </button>
              <button onClick={() => navigate('/citizen/track')} className="btn-primary flex-1 justify-center">
                Track Status
              </button>
            </div>
          </div>
        </motion.div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="page-header">
          <div>
            <h1 className="page-title">Report Emergency Incident</h1>
            <p className="text-gray-500 text-sm mt-1">Provide accurate details for faster response</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
              {s < 3 && <div className={`flex-1 h-1 w-16 rounded-full ${step > s ? 'bg-primary-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <div className="ml-4 flex gap-4 text-xs text-gray-500">
            <span className={step >= 1 ? 'text-primary-600 font-semibold' : ''}>Personal Info</span>
            <span className={step >= 2 ? 'text-primary-600 font-semibold' : ''}>Incident Details</span>
            <span className={step >= 3 ? 'text-primary-600 font-semibold' : ''}>Vulnerability</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card p-6 space-y-5">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2"><Users size={20} className="text-primary-600" /> Personal Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Your Name *</label>
                    <input required value={form.name} onChange={set('name')} className="input" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="label">Phone Number *</label>
                    <input required value={form.phone} onChange={set('phone')} className="input" placeholder="10-digit number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">District *</label>
                    <select required value={form.district} onChange={set('district')} className="input">
                      <option value="">Select district</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Village / Area *</label>
                    <input required value={form.village} onChange={set('village')} className="input" placeholder="Village or locality name" />
                  </div>
                </div>
                <div>
                  <label className="label">GPS Coordinates</label>
                  <div className="flex gap-2">
                    <input value={form.lat} onChange={set('lat')} className="input" placeholder="Latitude (e.g. 25.5941)" />
                    <input value={form.lng} onChange={set('lng')} className="input" placeholder="Longitude (e.g. 85.1376)" />
                    <button type="button" onClick={getLocation} disabled={locating} className="btn-secondary flex-shrink-0 py-2 px-3 text-sm whitespace-nowrap">
                      {locating ? <Loader size={16} className="animate-spin" /> : <MapPin size={16} />}
                      {locating ? 'Locating...' : 'Get GPS'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2"><AlertTriangle size={20} className="text-primary-600" /> Incident Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Disaster Type *</label>
                    <select required value={form.disaster_type} onChange={set('disaster_type')} className="input">
                      <option value="">Select type</option>
                      {DISASTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">People Trapped *</label>
                    <input type="number" min={0} max={9999} value={form.people_trapped} onChange={set('people_trapped')} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Water Level</label>
                  <select value={form.water_level} onChange={set('water_level')} className="input">
                    {WATER_LEVELS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Describe the Situation *</label>
                  <textarea required value={form.description} onChange={set('description')} className="input min-h-32 resize-none" placeholder="Provide as much detail as possible about the disaster, location, conditions, and immediate needs..." />
                </div>
                <div>
                  <label className="label">Upload Photo (Optional)</label>
                  <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}>
                    <input {...getInputProps()} />
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview" className="max-h-40 rounded-xl mx-auto" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setImage(null); setImagePreview(null) }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload size={28} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Drag photo here or <span className="text-primary-600 font-medium">browse</span></p>
                        <p className="text-xs text-gray-400 mt-1">Max 10MB — JPG, PNG, WEBP</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2"><Heart size={20} className="text-primary-600" /> Vulnerability Factors</h2>
                <p className="text-sm text-gray-500">This information helps AI determine rescue priority. Please be accurate.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { field: 'medical_emergency', icon: '⚕️', label: 'Medical Emergency', desc: 'Someone needs immediate medical attention', color: 'border-red-200 bg-red-50', active: 'border-red-400 bg-red-100 ring-2 ring-red-200' },
                    { field: 'pregnant_woman_present', icon: '🤱', label: 'Pregnant Woman', desc: 'A pregnant woman is among the trapped', color: 'border-pink-200 bg-pink-50', active: 'border-pink-400 bg-pink-100 ring-2 ring-pink-200' },
                    { field: 'children_present', icon: '👶', label: 'Children Present', desc: 'Children under 14 are among the trapped', color: 'border-orange-200 bg-orange-50', active: 'border-orange-400 bg-orange-100 ring-2 ring-orange-200' },
                    { field: 'senior_citizens_present', icon: '👴', label: 'Senior Citizens', desc: 'Elderly persons (60+) among the trapped', color: 'border-yellow-200 bg-yellow-50', active: 'border-yellow-400 bg-yellow-100 ring-2 ring-yellow-200' },
                  ].map(({ field, icon, label, desc, color, active }) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, [field]: !p[field] }))}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${form[field] ? active : color} hover:opacity-90`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${form[field] ? 'bg-current border-current' : 'border-gray-300'}`}>
                          {form[field] && <CheckCircle size={12} className="text-white" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-1">🤖 AI Priority Analysis</p>
                  <p className="text-xs text-blue-600 leading-relaxed">After submission, our AI system will analyze all factors and assign an appropriate priority level (Critical/High/Medium/Low) to ensure the fastest possible response.</p>
                </div>
              </motion.div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1 justify-center">
                  Back
                </button>
              )}
              {step < 3 ? (
                <button type="button" onClick={() => setStep(s => s + 1)} className="btn-primary flex-1 justify-center">
                  Continue
                </button>
              ) : (
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <AlertTriangle size={18} />}
                  {loading ? 'Submitting...' : 'Submit Emergency Report'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
