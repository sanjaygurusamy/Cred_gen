import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, icon, children, className = '' }) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl ${className}`}>
      {(title || subtitle || icon) && (
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            {title && <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {icon && <div className="text-emerald-400">{icon}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
