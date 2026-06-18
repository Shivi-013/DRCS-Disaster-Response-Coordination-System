import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Shield, MapPin, Users, Zap, FileText,
  BarChart3, Bell, Phone, Mail, ChevronRight, CheckCircle,
  ArrowRight, Star, Globe, Cpu, Clock, Heart
} from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

function Section({ children, className = '', id }) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  )
}

const features = [
  { icon: MapPin, title: 'Live Incident Map', desc: 'Interactive Leaflet map with real-time incident markers color-coded by priority. Click any pin for full details, assigned teams, and photos.', color: 'text-blue-600 bg-blue-50' },
  { icon: Cpu, title: 'AI Priority Engine', desc: 'Gemini AI analyzes each report — people trapped, medical urgency, vulnerable groups — and assigns Critical/High/Medium/Low priority in seconds.', color: 'text-purple-600 bg-purple-50' },
  { icon: Users, title: 'Volunteer Management', desc: 'Register, approve, assign, and track volunteers with skills-based matching. Authority can activate or deactivate with one click.', color: 'text-green-600 bg-green-50' },
  { icon: Shield, title: 'Resource Tracking', desc: 'Real-time inventory of boats, ambulances, fire trucks, medical kits, generators, and more — with availability status across all districts.', color: 'text-orange-600 bg-orange-50' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Citizens receive automatic notifications for incident acceptance, team assignment, ETA updates, and rescue completion.', color: 'text-pink-600 bg-pink-50' },
  { icon: FileText, title: 'PDF Report Generation', desc: 'One-click professional PDF reports — Incident Reports for citizens, Situation Reports for authority — powered by ReportLab.', color: 'text-cyan-600 bg-cyan-50' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Beautiful Chart.js visualizations — incidents by district, disaster categories, priority distribution, and trend timelines.', color: 'text-indigo-600 bg-indigo-50' },
  { icon: Heart, title: 'Relief Camp Management', desc: 'Track camp capacity, occupancy, medical staff, food and water stocks. Map integration shows camp locations alongside incidents.', color: 'text-red-600 bg-red-50' },
]

const timelineSteps = [
  { step: '01', label: 'Intake', title: 'Citizen Reports', icon: FileText, short: 'Report with location, disaster type, trapped count, and photo upload.', desc: 'Citizen submits an incident report with location, disaster type, number trapped, and uploads a photo from the disaster site.', dot: 'bg-blue-500', border: 'border-blue-400', badge: 'bg-blue-50 text-blue-700' },
  { step: '02', label: 'Analysis', title: 'AI Prioritizes', icon: Cpu, short: 'Gemini AI assigns Critical/High/Medium/Low priority with reasoning.', desc: 'Gemini AI instantly analyzes vulnerability factors and assigns a priority level with detailed reasoning and resource recommendations.', dot: 'bg-violet-500', border: 'border-violet-400', badge: 'bg-violet-50 text-violet-700' },
  { step: '03', label: 'Assessment', title: 'Authority Reviews', icon: Shield, short: 'Live map view with all critical incident data for fast decisions.', desc: 'Authority sees the incident on the live map and dashboard with all critical information for rapid decision making.', dot: 'bg-indigo-500', border: 'border-indigo-400', badge: 'bg-indigo-50 text-indigo-700' },
  { step: '04', label: 'Response', title: 'Team Dispatched', icon: Zap, short: 'Right rescue team assigned with ETA. Resources auto-marked assigned.', desc: 'Authority assigns the right rescue team — Boat, Medical, Fire, NDRF — with ETA and notes. Resources are automatically marked assigned.', dot: 'bg-orange-500', border: 'border-orange-400', badge: 'bg-orange-50 text-orange-700' },
  { step: '05', label: 'Update', title: 'Citizen Notified', icon: Bell, short: 'Instant notification with team type and ETA. Auto status updates.', desc: 'Citizen immediately receives a notification with team type and estimated arrival time. Status updates flow automatically.', dot: 'bg-green-500', border: 'border-green-400', badge: 'bg-green-50 text-green-700' },
  { step: '06', label: 'Resolved', title: 'Rescue Complete', icon: CheckCircle, short: 'PDF report generated. Analytics updated. Full audit trail stored.', desc: 'Authority marks rescue complete. PDF report generated. Analytics updated. Full audit trail maintained in JSON files.', dot: 'bg-emerald-600', border: 'border-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
]

const stats = [
  { value: '< 60s', label: 'AI Priority Assessment', icon: Zap },
  { value: '100%', label: 'Local Storage — No DB Setup', icon: Shield },
  { value: '3 Roles', label: 'Citizen, Volunteer, Authority', icon: Users },
  { value: '24/7', label: 'Always-On Coordination', icon: Clock },
]

const faqs = [
  { q: 'What database does DRCS use?', a: 'DRCS uses no database at all. All data is stored in local JSON files (incidents.json, volunteers.json, resources.json, etc.). The system runs immediately after cloning with no database setup required.' },
  { q: 'How does the AI prioritization work?', a: 'DRCS uses Google Gemini API to analyze each incident report. It considers people trapped, medical emergencies, presence of children, pregnant women, senior citizens, water levels, and the description to assign Critical/High/Medium/Low priority with reasoning.' },
  { q: 'Can citizens download their incident reports?', a: 'Yes. Citizens can download a professional PDF report for any of their incidents from the Track Reports page. The PDF includes all incident details, AI analysis, and assignment information.' },
  { q: 'What happens if the Gemini API is unavailable?', a: "DRCS includes a rule-based priority fallback that works without the API. If Gemini is unavailable, the system automatically calculates priority based on vulnerability factors using a scoring algorithm." },
  { q: 'How does the map work?', a: 'The interactive map uses Leaflet.js with free OpenStreetMap tiles — no API key required. Incidents appear as color-coded pins (red=Critical, yellow=High, blue=Medium, green=Low). Click any pin for full details.' },
  { q: 'How do I run this project?', a: 'Run `python setup.py` in the Backend folder to initialize sample data, then start with `uvicorn main:app --reload`. In the Frontend folder, run `npm install` then `npm run dev`. Full instructions in README.md.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#0d1b2e] border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg">DRCS</span>
              <span className="text-slate-400 text-xs ml-2 hidden sm:inline">Disaster Response Coordination</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1 text-sm font-medium">
            {['#features:Features', '#workflow:Workflow', '#stats:Stats', '#faq:FAQ'].map(item => {
              const [href, label] = item.split(':')
              return (
                <a key={href} href={href} className="text-slate-300 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all duration-150">
                  {label}
                </a>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-slate-300 hover:text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">Sign In</Link>
            <Link to="/register" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/30">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <Section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-full px-4 py-1.5 text-sm font-semibold text-primary-700 mb-6">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              State Disaster Management Authority — Powered by AI
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Coordinating Rescues{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-500">
                When Every Second
              </span>{' '}
              Counts
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
              DRCS is a production-ready disaster coordination platform used by state emergency authorities.
              AI-powered prioritization, live maps, volunteer coordination, and instant PDF reports — all running locally on JSON files.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" className="inline-flex items-center gap-2 justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold text-base px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30">
                Start Coordinating <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 justify-center bg-[#0d1b2e] hover:bg-slate-800 text-white font-bold text-base px-8 py-3.5 rounded-xl border border-slate-600 hover:border-slate-500 transition-all duration-200">
                Sign In to Dashboard
              </Link>
            </motion.div>

          </div>

          {/* Hero Image */}
          <motion.div variants={fadeUp} className="mt-16 max-w-5xl mx-auto">
            <div className="rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              <img src="/dashboard_pic.png" alt="DRCS Dashboard Preview" className="w-full h-auto object-cover" />
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Stats */}
      <Section id="stats" className="py-14 bg-[#0d1b2e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(({ value, label, icon: Icon }) => (
              <motion.div key={label} variants={fadeUp} className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Icon size={22} className="text-blue-400" />
                </div>
                <p className="text-3xl font-extrabold text-white">{value}</p>
                <p className="text-slate-400 text-sm mt-1 font-medium">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Features */}
      <Section id="features" className="py-20 bg-[#0d1b2e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-16 pb-10 border-b border-white/10">
            <div>
              <span className="text-blue-400 font-semibold text-sm uppercase tracking-widest">Platform Features</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3">Everything for Disaster Response</h2>
            </div>
            <p className="text-slate-500 text-sm max-w-xs md:text-right">8 core capabilities built for state emergency authorities</p>
          </motion.div>

          <div>
            {features.map(({ icon: Icon, title, desc, color }, index) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="group grid grid-cols-[32px_1fr] md:grid-cols-[40px_280px_1fr] items-start gap-4 md:gap-8 py-6 border-b border-white/[0.07] hover:border-white/20 transition-all duration-200"
              >
                <span className="text-xs font-mono text-slate-700 pt-1 group-hover:text-slate-500 transition-colors">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={17} />
                  </div>
                  <h3 className="font-bold text-white text-base group-hover:text-blue-300 transition-colors leading-snug">{title}</h3>
                </div>

                <p className="text-slate-500 text-sm leading-relaxed col-span-2 md:col-span-1 pl-10 md:pl-0 group-hover:text-slate-300 transition-colors">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Workflow */}
      <Section id="workflow" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <span className="text-secondary-600 font-semibold text-sm uppercase tracking-wider">Emergency Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-3">From Report to Rescue in 6 Steps</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">A streamlined process that gets rescue teams to victims as fast as possible.</p>
          </motion.div>

          <div className="relative">
            {/* Horizontal connecting line — desktop */}
            <div className="hidden md:block absolute top-5 left-[8.33%] right-[8.33%] h-px bg-gradient-to-r from-blue-300 via-violet-400 via-orange-300 to-emerald-400" />

            <div className="grid grid-cols-2 md:grid-cols-6 gap-x-3 gap-y-8">
              {timelineSteps.map((item) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.step}
                    variants={fadeUp}
                    className="flex flex-col items-center text-center"
                  >
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md ring-4 ring-white mb-3 ${item.dot}`}>
                      <Icon size={15} className="text-white" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${item.badge}`}>{item.label}</span>
                    <h3 className="font-bold text-gray-900 text-sm mb-1.5">{item.title}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">{item.short}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* Roles */}
      <Section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">User Roles</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 mb-4">Three Portals, One System</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Every stakeholder in disaster response has a dedicated portal with tools built for their role.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {[
              {
                role: 'Citizen', icon: Users, featured: false,
                accent: 'bg-blue-600', accentLight: 'bg-blue-50', accentText: 'text-blue-600', accentBorder: 'border-blue-100',
                tagline: 'Report & Track',
                features: ['Report disaster incidents', 'Upload photos from site', 'Track rescue status live', 'View assigned team & ETA', 'Receive real-time notifications', 'Download PDF report'],
                cta: 'Register as Citizen', link: '/register',
              },
              {
                role: 'Authority', icon: Shield, featured: true,
                accent: 'bg-[#0d1b2e]', accentLight: 'bg-slate-900', accentText: 'text-white', accentBorder: 'border-slate-700',
                tagline: 'Command & Coordinate',
                features: ['Live incident map view', 'AI priority analysis', 'Assign rescue teams', 'Manage all resources', 'Manage volunteers', 'Analytics & PDF reports', 'Relief camp management', 'AI situation summary'],
                cta: 'Authority Portal', link: '/login',
              },
              {
                role: 'Volunteer', icon: Heart, featured: false,
                accent: 'bg-emerald-600', accentLight: 'bg-emerald-50', accentText: 'text-emerald-600', accentBorder: 'border-emerald-100',
                tagline: 'Serve & Support',
                features: ['Skill-matched to incidents (medical, swimming, logistics)', 'Set availability — Full Time / On Call / Weekends', 'Blood group registered for emergency medical use', 'GPS check-in to confirm arrival at rescue site', 'Upload real-time field photos & status updates', 'View co-assigned team members on same incident', 'Receive district-specific incident alerts', 'Download service participation certificate'],
                cta: 'Become a Volunteer', link: '/register',
              },
            ].map(({ role, icon: Icon, featured, accent, accentLight, accentText, accentBorder, tagline, features, cta, link }) => (
              <motion.div
                key={role}
                variants={fadeUp}
                className={`rounded-2xl overflow-hidden border flex flex-col ${featured ? 'border-slate-700 shadow-2xl shadow-slate-900/20' : 'border-gray-200 shadow-sm'}`}
              >
                {/* Header */}
                <div className={`${featured ? 'bg-[#0d1b2e]' : 'bg-white'} p-6 border-b ${featured ? 'border-slate-700' : 'border-gray-100'}`}>
                  {featured && (
                    <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full mb-4 border border-blue-500/30">
                      <Star size={10} className="fill-current" /> Most Powerful
                    </div>
                  )}
                  <div className={`w-11 h-11 ${accent} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <h3 className={`text-xl font-bold mb-1 ${featured ? 'text-white' : 'text-gray-900'}`}>{role}</h3>
                  <p className={`text-sm font-semibold ${featured ? 'text-blue-400' : accentText}`}>{tagline}</p>
                </div>
                {/* Features */}
                <div className={`${featured ? 'bg-slate-900' : 'bg-white'} p-6 flex flex-col flex-1`}>
                  <ul className="space-y-2.5 mb-6">
                    {features.map(f => (
                      <li key={f} className={`flex items-center gap-2.5 text-sm ${featured ? 'text-slate-300' : 'text-gray-600'}`}>
                        <CheckCircle size={14} className={featured ? 'text-blue-400 flex-shrink-0' : 'text-emerald-500 flex-shrink-0'} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={link}
                    className={`w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      featured
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {cta} <ChevronRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Illustration Placeholder */}
      <Section className="py-20 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div variants={fadeUp}>
              <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Live Map</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">Real-Time Incident Visualization</h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-6">Every incident appears instantly on the interactive map. Color-coded priority markers let authority teams see at a glance where critical rescues are needed.</p>
              <ul className="space-y-3">
                {['Red markers for Critical incidents', 'Yellow for High priority', 'Blue for Medium priority', 'Green for Low priority', 'Purple tent icons for Relief Camps'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-gray-600 text-sm">
                    <CheckCircle size={16} className="text-primary-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div variants={fadeUp}>
              <div className="rounded-3xl overflow-hidden border border-primary-100 shadow-lg">
                <img src="/live_map.png" alt="Live Incident Map" className="w-full h-full object-cover" />
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Testimonials */}
      <Section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Built for Real Emergencies</h2>
            <p className="text-gray-500 mt-3">Designed with disaster management best practices at its core.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: 'The AI prioritization means our teams always go to the most critical cases first. The map view transformed how we coordinate district-level rescue operations.', name: 'District Magistrate', role: 'Flood Relief Operations' },
              { quote: 'As a volunteer, I can see my assigned incidents and update status from my phone. The skill-based matching ensures I am deployed where my medical training is most needed.', name: 'Dr. Priya Kumar', role: 'Medical Volunteer, NDRF' },
              { quote: 'I reported our situation and within 45 minutes I got a notification that a boat rescue team was on its way. The ETA updates kept our family calm during the flood.', name: 'Ram Prasad', role: 'Flood Survivor, Darbhanga' },
            ].map(({ quote, name, role }) => (
              <motion.div key={name} variants={fadeUp} className="card p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold text-sm">{name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{name}</p>
                    <p className="text-gray-400 text-xs">{role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </motion.div>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <motion.div key={q} variants={fadeUp} className="card p-6">
                <h3 className="font-bold text-gray-900 mb-2">{q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="py-20 bg-[#0d1b2e]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Ready to Coordinate Your Response?</h2>
            <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">Deploy DRCS in minutes. No database setup. No cloud accounts. Just clone, run, and coordinate.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" className="inline-flex items-center gap-2 justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/30">
                Start Coordinating <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 justify-center bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-3 rounded-xl transition-colors border border-white/20">
                Sign In to Dashboard
              </Link>
            </div>
            <p className="mt-6 text-slate-500 text-sm">
              Demo: authority@drcs.gov.in / password123 (after running setup.py)
            </p>
          </motion.div>
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact" className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Phone, label: 'Emergency Helpline', value: '1077 / 112' },
              { icon: Mail, label: 'Support Email', value: 'support@drcs.gov.in' },
              { icon: Globe, label: 'Coverage', value: 'All Districts' },
            ].map(({ icon: Icon, label, value }) => (
              <motion.div key={label} variants={fadeUp} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center">
                  <Icon size={22} className="text-primary-600" />
                </div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="font-bold text-gray-900">{value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="bg-[#070f1a] border-t border-slate-800 text-slate-500 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/30">
              <AlertTriangle size={14} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">DRCS</span>
            <span className="text-slate-600 text-xs">— Disaster Response Coordination System</span>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} State Disaster Management Authority. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
