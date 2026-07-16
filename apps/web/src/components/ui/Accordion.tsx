import React, { useState } from 'react';

interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ items, className = '' }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="border-b border-[#111111]/10 pb-4">
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between py-2 text-left outline-none group"
            >
              <span className="font-serif text-base font-bold text-[#111111] group-hover:text-[#111111]/80 transition-colors">
                {item.title}
              </span>
              <span className="text-sm font-mono text-[#111111]/40 group-hover:text-[#111111] transition-all">
                {isOpen ? '[-]' : '[+]'}
              </span>
            </button>
            {isOpen && (
              <div className="mt-4 text-sm font-serif text-[#111111]/70 leading-relaxed animate-fadeIn">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
