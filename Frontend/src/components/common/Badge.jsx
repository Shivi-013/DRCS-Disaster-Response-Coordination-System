import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

const priorityConfig = {
  Critical: { cls: 'badge-critical priority-critical', icon: AlertTriangle },
  High: { cls: 'badge-high', icon: AlertCircle },
  Medium: { cls: 'badge-medium', icon: Info },
  Low: { cls: 'badge-low', icon: CheckCircle },
}

const statusConfig = {
  Pending: { cls: 'bg-gray-100 text-gray-600' },
  'Under Review': { cls: 'bg-yellow-100 text-yellow-700' },
  'Rescue Assigned': { cls: 'bg-blue-100 text-blue-700' },
  'In Progress': { cls: 'bg-purple-100 text-purple-700' },
  Completed: { cls: 'bg-green-100 text-green-700' },
  Closed: { cls: 'bg-gray-100 text-gray-500' },
  Dispatched: { cls: 'bg-indigo-100 text-indigo-700' },
  'En Route': { cls: 'bg-cyan-100 text-cyan-700' },
  'On Site': { cls: 'bg-orange-100 text-orange-700' },
  Active: { cls: 'bg-green-100 text-green-700' },
  Inactive: { cls: 'bg-gray-100 text-gray-500' },
  Available: { cls: 'bg-green-100 text-green-700' },
  Assigned: { cls: 'bg-blue-100 text-blue-700' },
  Maintenance: { cls: 'bg-yellow-100 text-yellow-700' },
  Approved: { cls: 'bg-green-100 text-green-700' },
  Rejected: { cls: 'bg-red-100 text-red-700' },
  Full: { cls: 'bg-orange-100 text-orange-700' },
}

export function PriorityBadge({ priority, className }) {
  const config = priorityConfig[priority] || priorityConfig.Low
  const Icon = config.icon
  return (
    <span className={clsx(config.cls, 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold', className)}>
      <Icon size={11} />
      {priority}
    </span>
  )
}

export function StatusBadge({ status, className }) {
  const config = statusConfig[status] || { cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', config.cls, className)}>
      {status}
    </span>
  )
}

export function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}
