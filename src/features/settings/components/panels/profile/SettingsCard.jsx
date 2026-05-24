import React from 'react';

export default function SettingsCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-border/50 bg-secondary/10 p-5 lg:p-6 flex flex-col ${className}`}>
      {(title || Icon) && (
        <div className="flex items-center justify-between mb-5">
          {title && <h3 className="text-base font-semibold text-zinc-100">{title}</h3>}
          {Icon && <Icon className="size-5 text-zinc-500" />}
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
