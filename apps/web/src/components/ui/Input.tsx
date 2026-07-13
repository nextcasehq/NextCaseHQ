import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60">
          {label}
        </label>
      )}
      <input
        disabled={disabled}
        className={`w-full px-4 py-3 bg-[#111111]/5 border ${
          error ? 'border-red-500' : 'border-[#111111]/10'
        } rounded outline-none focus:border-[#111111] disabled:opacity-50 transition-all font-sans text-sm ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-xs font-semibold font-sans mt-1">{error}</p>
      )}
    </div>
  );
};
