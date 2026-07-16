import React from 'react';

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex border-b border-[#111111]/10 space-x-8 overflow-x-auto ${className}`}>
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all relative outline-none ${
              isActive
                ? 'border-[#111111] text-[#111111]'
                : 'border-transparent text-[#111111]/40 hover:text-[#111111]'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
