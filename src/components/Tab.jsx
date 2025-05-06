import React from 'react';

const Tab = ({ label, isActive, onClick }) => {
    const activeClasses = 'border-b-2 border-blue-600 text-blue-600';
    const inactiveClasses = 'hover:text-gray-600';

    return (
        <button
            onClick={onClick}
            className={`inline-block p-4 ${isActive ? activeClasses : inactiveClasses}`}
            role="tab"
            aria-selected={isActive}
        >
            {label}
        </button>
    );
};

export default Tab; 