import type { ElementType, ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle: string
  icon?: ElementType
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, icon: Icon, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white/90 px-6 py-5 shadow-soft md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50">
            <Icon size={22} className="text-brand-600" />
          </div>
        )}
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
