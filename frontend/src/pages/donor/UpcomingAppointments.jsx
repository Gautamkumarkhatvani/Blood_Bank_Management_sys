import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import RescheduleModal from './RescheduleModal';  // ✅ ADD THIS IMPORT

const API_URL = "http://localhost:5000/api/donor";

const UpcomingAppointments = ({ onRefresh, onAppointmentsLoaded }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);  // ✅ ADD STATE
  const [selectedForReschedule, setSelectedForReschedule] = useState(null);  // ✅ ADD STATE
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const token = localStorage.getItem('token');

  // Fetch upcoming appointments
  useEffect(() => {
    fetchUpcomingAppointments();
  }, []);

  const fetchUpcomingAppointments = async () => {
    try {
      setLoading(true);
      console.log("📅 Fetching upcoming appointments...");

      const res = await fetch(`${API_URL}/appointments/upcoming`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch appointments');
      }

      const data = await res.json();
      console.log("✅ Appointments fetched:", data.appointments);

      setAppointments(data.appointments || []);
      if (onAppointmentsLoaded) {
        onAppointmentsLoaded((data.appointments || []).length);
      }

    } catch (error) {
      console.error("❌ Error fetching appointments:", error);
      toast.error(error.message || "Failed to load appointments");
      setAppointments([]);
      if (onAppointmentsLoaded) onAppointmentsLoaded(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  // ✅ NEW: Handle Reschedule Click
  const handleRescheduleClick = (appointment) => {
    const appointmentToReschedule = {
      _id: appointment._id,
      campName: appointment.campName || 'Unknown Camp',
      location: appointment.location || { city: 'Unknown', state: 'Unknown' },
      contactNumber: appointment.contactNumber || 'N/A',
      scheduledDate: appointment.scheduledDate,
      scheduledTime: appointment.scheduledTime,
      notes: appointment.notes || '',
      status: appointment.status || 'scheduled'
    };

    setSelectedForReschedule(appointmentToReschedule);
    setShowRescheduleModal(true);
  };

  // ✅ NEW: Handle Reschedule Success
  const handleRescheduleSuccess = () => {
    console.log("✅ Reschedule successful, refreshing appointments");
    setShowRescheduleModal(false);
    setSelectedForReschedule(null);
    fetchUpcomingAppointments();  // Refresh list
    if (onRefresh) onRefresh();
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      setCancelling(true);
      console.log("🗑️ Cancelling appointment:", selectedAppointment._id);

      const res = await fetch(
        `${API_URL}/appointments/${selectedAppointment._id}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason: cancelReason })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to cancel appointment');
      }

      console.log("✅ Appointment cancelled successfully");
      toast.success('✅ Appointment cancelled successfully');

      // Refresh appointments
      await fetchUpcomingAppointments();
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedAppointment(null);

      if (onRefresh) onRefresh();

    } catch (error) {
      console.error("❌ Cancellation error:", error);
      toast.error(error.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full mx-auto mb-2"></div>
        <p className="text-gray-600">Loading appointments...</p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 bg-blue-50 rounded-xl border border-blue-200">
        <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-blue-800 mb-2">No Upcoming Appointments</h3>
        <p className="text-blue-700 mb-4">
          You don't have any scheduled donations yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            📅 Upcoming Appointments ({appointments.length})
          </h2>
          <button
            onClick={fetchUpcomingAppointments}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw size={18} className="text-gray-600" />
          </button>
        </div>

        {appointments.map((appointment) => (
          <div
            key={appointment._id}
            className="bg-white rounded-xl border-2 border-red-100 p-6 hover:shadow-lg transition"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  {appointment.campName}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    ✓ Scheduled
                  </span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="text-gray-800 font-semibold">
                    {new Date(appointment.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="text-gray-800 font-semibold">
                    {appointment.scheduledTime}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="text-gray-800 font-semibold">
                    {appointment.location?.city}, {appointment.location?.state}
                  </p>
                  {appointment.location?.street && (
                    <p className="text-sm text-gray-600 mt-1">
                      {appointment.location.street}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact */}
              {appointment.contactNumber && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Contact</p>
                    <p className="text-gray-800 font-semibold">
                      {appointment.contactNumber}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Notes:</strong> {appointment.notes}
                </p>
              </div>
            )}

            {/* Days Remaining */}
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⏰ Days Remaining:</strong> {Math.ceil(
                  (new Date(appointment.scheduledDate) - new Date()) / (1000 * 60 * 60 * 24)
                )} days
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleCancelClick(appointment)}
                className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Cancel
              </button>
              {/* ✅ UPDATE: Reschedule Button */}
              <button
                onClick={() => handleRescheduleClick(appointment)}
                className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Reschedule
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Cancel Appointment</h2>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel your appointment at{' '}
              <strong>{selectedAppointment.campName}</strong> on{' '}
              <strong>
                {new Date(selectedAppointment.scheduledDate).toLocaleDateString()}
              </strong>?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Cancellation:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please tell us why you're cancelling..."
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
                rows="3"
              />
              <p className="text-xs text-gray-500 mt-1">{cancelReason.length}/200</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setSelectedAppointment(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                disabled={cancelling}
              >
                Keep Appointment
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                disabled={cancelling || !cancelReason.trim()}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ RESCHEDULE MODAL */}
      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => {
          console.log("❌ Closing reschedule modal");
          setShowRescheduleModal(false);
          setSelectedForReschedule(null);
        }}
        appointment={selectedForReschedule}
        onSuccess={handleRescheduleSuccess}
      />
    </>
  );
};

export default UpcomingAppointments;