import React from 'react';
import { useTheme } from '../context/ThemeContext';
import Button from './Button';

/**
 * EmptyState component - Displays a friendly message when there's no content
 * 
 * @param {Object} props - Component properties
 * @param {string} props.title - The title for the empty state
 * @param {string} props.message - The message to display
 * @param {string} props.icon - The icon to display (emoji)
 * @param {Function} props.actionFn - Optional callback for the action button
 * @param {string} props.actionLabel - Label for the action button
 * @returns {JSX.Element} The EmptyState component
 */
const EmptyState = ({
    title = "No Content Available",
    message = "There is no content to display at this time.",
    icon = "📭",
    actionFn,
    actionLabel
}) => {
    const { isDarkMode } = useTheme();

    return (
        <div className={`flex flex-col items-center justify-center p-10 rounded-lg
      ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-700'}`}
        >
            <span className="text-6xl mb-4" role="img" aria-hidden="true">
                {icon}
            </span>

            <h2 className="text-2xl font-semibold mb-4">{title}</h2>
            <p className="text-center mb-6 max-w-md">{message}</p>

            {actionFn && actionLabel && (
                <Button
                    onClick={actionFn}
                    color="blue"
                    size="md"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState; 