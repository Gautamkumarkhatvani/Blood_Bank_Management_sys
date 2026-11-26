import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    Search,
    RefreshCw,
    Filter,
    CheckCircle,
    XCircle,
    Droplet,
    Calendar,
    User,
    Building
} from "lucide-react";

const AdminDonationHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        total: 0,
        hasNext: false,
        hasPrev: false
    });

    const token = localStorage.getItem('token');
    const API_URL = "http://localhost:5000/api/admin";

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchHistory(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchHistory = async (page = 1) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page,
                limit: 15,
                search: searchTerm
            });

            const res = await fetch(`${API_URL}/history?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (data.success) {
                setHistory(data.history);
                setPagination({
                    currentPage: data.pagination.currentPage,
                    totalPages: data.pagination.totalPages,
                    total: data.pagination.total,
                    hasNext: data.pagination.currentPage < data.pagination.totalPages,
                    hasPrev: data.pagination.currentPage > 1
                });
            } else {
                toast.error(data.message || "Failed to fetch history");
            }
        } catch (error) {
            console.error("Error fetching history:", error);
            toast.error("Failed to load donation history");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Droplet className="text-red-600" />
                        Global Blood Donation History
                    </h1>
                    <p className="text-gray-500">Comprehensive log of all blood donations across the system</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search donor name, email or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                </div>

                <button
                    onClick={() => fetchHistory(pagination.currentPage)}
                    className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                    <RefreshCw size={18} />
                    Refresh Data
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Droplet className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-medium text-gray-800">No records found</h3>
                            <p className="text-gray-500 mt-1">Try adjusting your search terms</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Donor Details</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Blood Info</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Facility / Camp</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Date</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map((record, index) => (
                                    <tr key={record.donationId || index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs">
                                                    {record.donorName?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{record.donorName}</div>
                                                    <div className="text-xs text-gray-500">{record.donorEmail}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-red-600 bg-red-50 w-fit px-2 py-0.5 rounded text-xs border border-red-100">
                                                    {record.bloodGroup}
                                                </span>
                                                <span className="text-xs text-gray-500">{record.quantity} Units</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <Building size={14} className="text-gray-400" />
                                                {record.facilityName || "Unknown Facility"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(record.donationDate).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.status ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle size={12} />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    <XCircle size={12} />
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Footer */}
                {pagination.totalPages > 1 && (
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                            Showing Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchHistory(pagination.currentPage - 1)}
                                disabled={!pagination.hasPrev}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-white transition"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => fetchHistory(pagination.currentPage + 1)}
                                disabled={!pagination.hasNext}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-white transition"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDonationHistory;
