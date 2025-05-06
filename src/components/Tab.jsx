import React from 'react';
import { useTheme } from './themeContext';

function Tab({ label, isActive, onClick, disabled = false }) {
    const { isDarkMode } = useTheme();

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                inline-flex items-center px-4 py-2 rounded-t-lg text-sm font-medium
                truncate max-w-[200px] transition-colors duration-200
                ${isActive
                    ? isDarkMode
                        ? 'border-b-2 border-blue-500 text-blue-500'
                        : 'border-b-2 border-blue-600 text-blue-600'
                    : isDarkMode
                        ? 'text-gray-400 hover:text-gray-300 hover:border-gray-300'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        >
            <span className="truncate">{label}</span>
            {disabled && (
                <span className="ml-2" title="Feature not available">
                    🔒
                </span>
            )}
        </button>
    );
}

export default Tab;