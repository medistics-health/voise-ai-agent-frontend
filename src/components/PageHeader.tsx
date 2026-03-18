import type { ElementType, ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: ElementType;
  action?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600 md:flex">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
