import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    Calendar,
    MapPin,
    Clock,
    Search,
    Users,
    Trash2,
    Filter,
    RefreshCw,
    MoreVertical,
    Building,
    Phone,
    Mail
} from "lucide-react";

import StatusBadge from "../../components/ui/StatusBadge";

const AdminCamps = () => {
    const [camps, setCamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
    });
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
        fetchCamps(1);
    }, [filters]);

    const fetchCamps = async (page = 1) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page,
                limit: 9,
                status: filters.status
            });

            const res = await fetch(`${API_URL}/camps?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (data.success) {
                setCamps(data.camps);
                setPagination({
                    currentPage: data.pagination.currentPage,
                    totalPages: data.pagination.totalPages,
                    total: data.pagination.total,
                    hasNext: data.pagination.currentPage < data.pagination.totalPages,
                    hasPrev: data.pagination.currentPage > 1
                });
            } else {
                toast.error(data.message || "Failed to fetch camps");
            }
        } catch (error) {
            console.error("Error fetching camps:", error);
            toast.error("Failed to load blood camps");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCamp = async (campId) => {
        if (!window.confirm("Are you sure you want to delete this camp? This action cannot be undone.")) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/camps/${campId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Camp deleted successfully");
                fetchCamps(pagination.currentPage);
            } else {
                toast.error(data.message || "Failed to delete camp");
            }
        } catch (error) {
            console.error("Error deleting camp:", error);
            toast.error("Error deleting camp");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Building className="text-red-600" />
                        All Blood Camps
                    </h1>
                    <p className="text-gray-500">Manage blood camps organized by all facilities</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-gray-600">
                    <Filter size={20} />
                    <span className="font-medium">Filters:</span>
                </div>

                <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5"
                >
                    <option value="all">All Status</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>

                <button
                    onClick={() => fetchCamps(1)}
                    className="ml-auto flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
                >
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>

            {/* Camps Grid */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
            ) : camps.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-800">No blood camps found</h3>
                    <p className="text-gray-500">Try adjusting your filters</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {camps.map((camp) => (
                        <div
                            key={camp._id}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 line-clamp-1" title={camp.title}>
                                        {camp.title}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <Building size={12} />
                                        <span className="line-clamp-1">
                                            {camp.hospital?.facilityName || "Unknown Facility"}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleDeleteCamp(camp._id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Camp"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <StatusBadge status={camp.status} />
                            </div>

                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="flex items-center gap-3">
                                    <Calendar size={16} className="text-red-500 flex-shrink-0" />
                                    <span>{new Date(camp.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-red-500 flex-shrink-0" />
                                    <span>{camp.time?.start} - {camp.time?.end}</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">
                                        {camp.location?.venue}, {camp.location?.city}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Users size={16} className="text-red-500 flex-shrink-0" />
                                    <span>Target: {camp.expectedDonors} | Actual: {camp.actualDonors || 0}</span>
                                </div>

                                {camp.hospital && (
                                    <div className="pt-3 mt-3 border-t border-gray-100 flex flex-col gap-1 text-xs text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Mail size={12} /> {camp.hospital.email}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone size={12} /> {camp.hospital.phone}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                        onClick={() => fetchCamps(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => fetchCamps(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminCamps;
