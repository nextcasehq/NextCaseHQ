import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-sans font-semibold uppercase tracking-wider rounded transition-all duration-200 outline-none focus:ring-2 focus:ring-[#C5A059]/40 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary: 'bg-[#111111] text-[#FDFBF7] hover:bg-[#111111]/90 shadow-sm',
    secondary: 'bg-[#C5A059] text-[#111111] hover:bg-[#C5A059]/90 shadow-sm',
    outline: 'border border-[#111111] text-[#111111] bg-transparent hover:bg-[#111111]/5',
    ghost: 'text-[#111111]/80 hover:text-[#111111] hover:bg-[#111111]/5'
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
