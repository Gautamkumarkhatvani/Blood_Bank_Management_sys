import React from 'react';

const StatusBadge = ({ status }) => {
    const getStatusStyles = (status) => {
        switch (status) {
            case "Upcoming":
                return "bg-blue-100 text-blue-700 border-blue-200";
            case "Ongoing":
                return "bg-green-100 text-green-700 border-green-200";
            case "Completed":
                return "bg-gray-100 text-gray-700 border-gray-200";
            case "Cancelled":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(status)}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
