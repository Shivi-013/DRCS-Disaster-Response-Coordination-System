import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function StatCard({ icon: Icon, label, value, sub, color = 'primary', trend, className }) {
  const colorMap = {
    primary: { bg: 'bg-primary-50', icon: 'text-primary-600', border: 'border-primary-100' },
    success: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100' },
    danger: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-100' },
    warning: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-100' },
  }

  const c = colorMap[color] || colorMap.primary

  return (
    <motion.div
      whileHover={{ y: -2, shadow: '0 8px 24px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
      className={clsx('card p-5 flex items-center gap-4', className)}
    >
      <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', c.bg)}>
        <Icon size={22} className={c.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full', trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </motion.div>
  )
}
