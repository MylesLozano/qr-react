import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from "../hooks/useTheme";

const Button = forwardRef(({
  children,
  onClick,
  color = 'blue',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  icon,
  loadingText = 'Loading...',
  showLoadingText = true,
  ariaLabel,
  ...props
}, ref) => {
  const { isDarkMode } = useTheme();

  const validSizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  // Moved into local scope
  const validColors = {
    blue: 'bg-blue-500 hover:bg-blue-600 text-white',
    red: 'bg-red-500 hover:bg-red-600 text-white',
    green: 'bg-green-500 hover:bg-green-600 text-white',
    gray: isDarkMode
      ? 'bg-gray-700 hover:bg-gray-600 text-white'
      : 'bg-gray-300 hover:bg-gray-400 text-gray-800',
    transparent: 'bg-transparent'
  };

  const colorClass = validColors[color] || validColors.blue;
  const sizeClass = validSizes[size] || validSizes.md;

  const baseStyles = `
    rounded font-medium transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${colorClass}
    ${sizeClass}
    ${className}
  `;

  return (
    <button
      ref={ref}
      type={type}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={baseStyles}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        {loading ? (
          <>
            <LoadingSpinner size="sm" showText={false} />
            {showLoadingText && <span>{loadingText}</span>}
          </>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </div>
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    color: PropTypes.oneOf(['blue', 'red', 'green', 'gray', 'transparent']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    className: PropTypes.string,
    icon: PropTypes.node,
    loadingText: PropTypes.string,
    showLoadingText: PropTypes.bool,
    ariaLabel: PropTypes.string
};

export default Button;