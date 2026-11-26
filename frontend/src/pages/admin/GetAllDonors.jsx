import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  User,
  Heart,
  Calendar,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Droplet,
  Weight,
  Users,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Trash2,
  CheckSquare,
  AlertCircle,
  Shield
} from "lucide-react";

const API_URL = "http://localhost:5000/api/donor";
// const API_URL_donor = "http://localhost:5000/api/";

function GetAllDonors() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    bloodGroup: 'all',
    approvalStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // ✅ NEW: Modal states for eligibility toggle
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [eligibilityReason, setEligibilityReason] = useState('');
  const [newEligibilityStatus, setNewEligibilityStatus] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Existing modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const token = localStorage.getItem("token");
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Fetch Donors Function
  const fetchAllDonors = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      console.log("🔄 Fetching donors...");
      
      const queryParams = new URLSearchParams({
        search: filters.search,
        bloodGroup: filters.bloodGroup,
        approvalStatus: filters.approvalStatus,
        limit: 100
      });

      const res = await fetch(`${API_URL}/admin/all-donors?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ API Error:", errorText);
        throw new Error(`Failed to fetch donors: ${res.status}`);
      }

      const data = await res.json();
      setDonors(data.donors || []);

      if (showToast) {
        toast.success(`Loaded ${data.donors?.length || 0} donors`);
      }
    } catch (error) {
      console.error("🚨 Fetch donors error:", error);
      toast.error(error.message || "Failed to load donor data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ NEW: Toggle eligibility function
  const handleToggleEligibility = async () => {
    try {
      if (!eligibilityReason.trim()) {
        toast.error('Please provide a reason for this change');
        return;
      }

      setModalLoading(true);
      const res = await fetch(
        `${API_URL}/${selectedDonor._id}/toggle-eligibility`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            eligibleToDonate: newEligibilityStatus,
            reason: eligibilityReason
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update eligibility');
      }

      const status = newEligibilityStatus ? 'eligible' : 'ineligible';
      toast.success(`Donor marked as ${status} successfully!`);
      setShowEligibilityModal(false);
      setSelectedDonor(null);
      setEligibilityReason('');
      setNewEligibilityStatus(null);
      fetchAllDonors(false);
    } catch (error) {
      console.error('Error toggling eligibility:', error);
      toast.error(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ✅ Approve Donor Function
  const handleApproveDonor = async () => {
    try {
      setModalLoading(true);
      const res = await fetch(
        `${API_URL}/${selectedDonor._id}/approve`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to approve donor');
      }

      toast.success('Donor approved successfully!');
      setShowApproveModal(false);
      setSelectedDonor(null);
      fetchAllDonors(false);
    } catch (error) {
      console.error('Error approving donor:', error);
      toast.error(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  // ✗ Reject Donor Function
  const handleRejectDonor = async () => {
    try {
      if (!rejectReason.trim()) {
        toast.error('Please provide a rejection reason');
        return;
      }

      setModalLoading(true);
      const res = await fetch(
        `${API_URL}/donors/${selectedDonor._id}/reject`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason: rejectReason })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to reject donor');
      }

      toast.success('Donor rejected successfully!');
      setShowRejectModal(false);
      setSelectedDonor(null);
      setRejectReason('');
      fetchAllDonors(false);
    } catch (error) {
      console.error('Error rejecting donor:', error);
      toast.error(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  // 🗑️ Delete Donor Function
  const handleDeleteDonor = async () => {
    try {
      if (!deleteReason.trim()) {
        toast.error('Please provide a deletion reason');
        return;
      }

      if (deleteConfirmText !== 'DELETE') {
        toast.error('Please type "DELETE" to confirm');
        return;
      }

      setModalLoading(true);
      const res = await fetch(
        `${API_URL}/${selectedDonor._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ soft: true, reason: deleteReason })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete donor');
      }

      toast.success('Donor deleted successfully!');
      setShowDeleteModal(false);
      setSelectedDonor(null);
      setDeleteReason('');
      setDeleteConfirmText('');
      fetchAllDonors(false);
    } catch (error) {
      console.error('Error deleting donor:', error);
      toast.error(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDonors();
  }, [filters]);

  // Get Eligibility Badge
  const getEligibilityBadge = (isEligible) => {
    if (isEligible === undefined) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200">
          <Clock size={12} /> Unknown
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
        isEligible
          ? "bg-green-100 text-green-800 border-green-200"
          : "bg-red-100 text-red-800 border-red-200"
      }`}>
        {isEligible ? <CheckCircle size={12} /> : <XCircle size={12} />}
        {isEligible ? "Eligible" : "Ineligible"}
      </span>
    );
  };

  // ✅ NEW: Get Approval Status Badge
  const getApprovalStatusBadge = (status) => {
    const badges = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-200",
        label: "⏳ Pending",
        icon: Clock
      },
      approved: {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-200",
        label: "✓ Approved",
        icon: CheckCircle
      },
      rejected: {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-200",
        label: "✗ Rejected",
        icon: XCircle
      }
    };

    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
        {badge.label}
      </span>
    );
  };

  const getBloodGroupBadge = (bloodGroup) => {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
        <Droplet size={10} />
        {bloodGroup}
      </span>
    );
  };

  // ✅ NEW: Action Menu Component with eligibility toggle
  const ActionMenu = ({ donor }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <MoreVertical size={18} className="text-gray-600" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            {donor.approvalStatus?.status === 'pending' && (
              <>
                <button
                  onClick={() => {
                    setSelectedDonor(donor);
                    setShowApproveModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-green-50 text-green-600 flex items-center gap-2 border-b"
                >
                  <CheckCircle size={16} /> Approve
                </button>
                <button
                  onClick={() => {
                    setSelectedDonor(donor);
                    setShowRejectModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-yellow-50 text-yellow-600 flex items-center gap-2 border-b"
                >
                  <XCircle size={16} /> Reject
                </button>
              </>
            )}

            {/* ✅ NEW: Toggle Eligibility Option */}
            <button
              onClick={() => {
  
                setSelectedDonor(donor);
                  setNewEligibilityStatus(!donor.eligibleToDonate);
                  setShowEligibilityModal(true);
                  setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 border-b ${
                donor.eligibleToDonate
                  ? 'hover:bg-red-50 text-red-600'
                  : 'hover:bg-green-50 text-green-600'
              }`}
            >
              <Shield size={16} />
              {donor.eligibleToDonate ? 'Mark Ineligible' : 'Mark Eligible'}
            </button>

            <button
              onClick={() => {
                setSelectedDonor(donor);
                setShowDeleteModal(true);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  // Filter donors
  const filteredDonors = donors
    .filter(donor => {
      const matchesSearch = !filters.search || 
        donor.fullName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        donor.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        donor.phone?.includes(filters.search);
      
      const matchesBloodGroup = filters.bloodGroup === 'all' || donor.bloodGroup === filters.bloodGroup;
      
      const matchesApprovalStatus = filters.approvalStatus === 'all' || 
        donor.approvalStatus?.status === filters.approvalStatus;
      
      return matchesSearch && matchesBloodGroup && matchesApprovalStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.fullName?.toLowerCase();
          bValue = b.fullName?.toLowerCase();
          break;
        case 'donations':
          aValue = a.donationHistory?.length || 0;
          bValue = b.donationHistory?.length || 0;
          break;
        case 'age':
          aValue = a.age || 0;
          bValue = b.age || 0;
          break;
        default:
          aValue = a.fullName?.toLowerCase();
          bValue = b.fullName?.toLowerCase();
      }
      
      if (filters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <Users className="w-12 h-12 text-red-500 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Loading Donor Database
          </h2>
          <p className="text-gray-500">Fetching all registered blood donors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-xl">
                <Users className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Blood Donors</h1>
                <p className="text-gray-600 mt-1">
                  Manage and view all registered blood donors in the system
                </p>
              </div>
            </div>
            
            <button
              onClick={() => fetchAllDonors(true)}
              disabled={refreshing}
              className="mt-4 lg:mt-0 flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{donors.length}</div>
                <div className="text-sm text-gray-600">Total Donors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {donors.filter(d => d.approvalStatus?.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {donors.filter(d => d.approvalStatus?.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {donors.filter(d => !d.eligibleToDonate).length}
                </div>
                <div className="text-sm text-gray-600">Ineligible</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {donors.reduce((sum, donor) => sum + (donor.donationHistory?.length || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Donations</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search donors by name, email, or phone..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
            
            <select
              value={filters.bloodGroup}
              onChange={(e) => setFilters(prev => ({ ...prev, bloodGroup: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Blood Types</option>
              {bloodGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>

            <select
              value={filters.approvalStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, approvalStatus: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✓ Approved</option>
              <option value="rejected">✗ Rejected</option>
            </select>
            
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="name">Sort by Name</option>
              <option value="donations">Sort by Donations</option>
              <option value="age">Sort by Age</option>
            </select>
            
            <button
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
              }))}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {filters.sortOrder === 'asc' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-gray-600">
            Showing {filteredDonors.length} of {donors.length} donors
          </p>
        </div>

        {/* Donor Grid */}
        {filteredDonors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-red-100">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Donors Found</h3>
            <p className="text-gray-600">No donors match your current filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDonors.map((donor) => (
              <div
                key={donor._id}
                className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group"
              >
                {/* Header with Name and Badges */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-1 group-hover:text-red-600 transition-colors">
                      {donor.fullName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{donor.email}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end ml-2">
                    {getApprovalStatusBadge(donor.approvalStatus?.status)}
                    {getEligibilityBadge(donor.eligibleToDonate)}
                    {getBloodGroupBadge(donor.bloodGroup)}
                  </div>
                </div>

                {/* Donor Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-gray-700">{donor.phone || 'Not provided'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-gray-700">{donor.age} years old</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Weight className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-gray-700">{donor.weight || 'N/A'} kg</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-gray-700">
                      {donor.donationHistory?.length || 0} donation{(donor.donationHistory?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-3 text-sm pt-2 border-t border-gray-100">
                    <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-gray-700 line-clamp-2">
                      {donor.address?.street && `${donor.address.street}, `}
                      {donor.address?.city}, {donor.address?.state}
                      {donor.address?.pincode && ` - ${donor.address.pincode}`}
                    </div>
                  </div>
                </div>

                {/* Action Menu */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <ActionMenu donor={donor} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ NEW: Eligibility Toggle Modal */}
      {showEligibilityModal && selectedDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${
                newEligibilityStatus 
                  ? 'bg-green-100' 
                  : 'bg-red-100'
              }`}>
                <Shield className={`w-6 h-6 ${
                  newEligibilityStatus 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                {newEligibilityStatus ? 'Mark as Eligible' : 'Mark as Ineligible'}
              </h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              <strong>{selectedDonor.fullName}</strong> will be marked as <strong>{newEligibilityStatus ? 'eligible' : 'ineligible'}</strong> to donate blood.
            </p>
            
            <div className={`rounded-lg p-3 mb-6 ${
              newEligibilityStatus
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${newEligibilityStatus ? 'text-green-800' : 'text-red-800'}`}>
                {newEligibilityStatus 
                  ? '✓ Donor will be able to schedule donations'
                  : '✗ Donor will not be able to schedule donations'
                }
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Reason for this change:
              </label>
              <textarea
                placeholder={newEligibilityStatus ? 'E.g., Medical Certificate Approved, Able to Donate' : "E.g., Failed medical checkup, Age constraint, etc."}
                value={eligibilityReason}
                onChange={(e) => setEligibilityReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows="3"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEligibilityModal(false);
                  setSelectedDonor(null);
                  setEligibilityReason('');
                  setNewEligibilityStatus(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleToggleEligibility}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${
                  newEligibilityStatus
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={modalLoading || !eligibilityReason.trim()}
              >
                {modalLoading ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApproveModal && selectedDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Approve Donor</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve <strong>{selectedDonor.fullName}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedDonor(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleApproveDonor}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                disabled={modalLoading}
              >
                {modalLoading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <XCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Reject Donor</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting <strong>{selectedDonor.fullName}</strong>:
            </p>
            
            <textarea
              placeholder="E.g., Does not meet health criteria, Duplicate account, etc."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
              rows="4"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedDonor(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectDonor}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
                disabled={modalLoading || !rejectReason.trim()}
              >
                {modalLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedDonor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Confirm Deletion</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              <strong>Delete donor: "{selectedDonor.fullName}"?</strong>
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <ul className="text-sm text-red-700 space-y-1">
                <li>• All donation records will be deleted</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Deletion Reason:
              </label>
              <textarea
                placeholder="E.g., Duplicate account, Requested by donor, etc."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows="2"
              />
            </div>
            
            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Type "DELETE" to confirm:
              </label>
              <input
                type="text"
                placeholder="Type DELETE here..."
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDonor(null);
                  setDeleteReason('');
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDonor}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                disabled={modalLoading || deleteConfirmText !== 'DELETE' || !deleteReason.trim()}
              >
                {modalLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GetAllDonors;
