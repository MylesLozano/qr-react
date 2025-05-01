import React from 'react';

const Button = ({
    children,
    onClick,
    color = 'blue',
    size = 'md',
    disabled = false,
    loading = false,
    className = '',
    type = 'button',
    ...props
}) => {
    const colorClasses = {
        blue: 'bg-blue-500 hover:bg-blue-600',
        red: 'bg-red-500 hover:bg-red-600',
        green: 'bg-green-500 hover:bg-green-600',
        gray: 'bg-gray-300 hover:bg-gray-400 text-gray-800',
    };

    const sizeClasses = {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`
        rounded font-medium transition-colors
        ${colorClasses[color]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
            {...props}
        >
            {loading ? 'Loading...' : children}
        </button>
    );
};

export default Button; 