import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const styles = {
    primary: 'bg-[#111111]/5 text-[#111111] border-[#111111]/10',
    accent: 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20',
    success: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20',
    warning: 'bg-[#EF4444]/5 text-[#C5A059] border-[#C5A059]/10',
    error: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[10px] font-mono font-bold tracking-wider uppercase ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
