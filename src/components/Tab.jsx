import React, { useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import PropTypes from 'prop-types';

function Tab({ 
    label = '', 
    isActive = false, 
    onClick, 
    disabled = false,
    tabId,
    panelId 
}) {
    const { isDarkMode } = useTheme();

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled && onClick) {
                onClick();
            }
        }
    }, [disabled, onClick]);

    return (
        <button
            onClick={disabled ? undefined : onClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={`
                inline-flex items-center px-4 py-2 rounded-t-lg text-sm font-medium
                truncate max-w-[200px] transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 
                ${isActive
                    ? isDarkMode
                        ? 'border-b-2 border-blue-500 text-blue-500 focus:ring-blue-500'
                        : 'border-b-2 border-blue-600 text-blue-600 focus:ring-blue-600'
                    : isDarkMode
                        ? 'text-gray-400 hover:text-gray-300 hover:border-gray-300 focus:ring-gray-500'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:ring-gray-400'
                }
                ${disabled
                    ? isDarkMode
                        ? 'opacity-50 cursor-not-allowed bg-gray-800'
                        : 'opacity-50 cursor-not-allowed bg-gray-100'
                    : ''
                }
            `}
            role="tab"
            aria-selected={isActive}
            aria-disabled={disabled}
            aria-controls={panelId}
            id={tabId}
            tabIndex={disabled ? -1 : 0}
        >
            {label}
        </button>
    );
}

Tab.propTypes = {
    label: PropTypes.string.isRequired,
    isActive: PropTypes.bool,
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    tabId: PropTypes.string,
    panelId: PropTypes.string
};

export default React.memo(Tab);