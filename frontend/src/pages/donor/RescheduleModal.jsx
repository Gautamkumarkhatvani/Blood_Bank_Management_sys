import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';

const API_URL = "http://localhost:5000/api/donor";

const RescheduleModal = ({ isOpen, onClose, appointment, onSuccess }) => {
  const [camps, setCamps] = useState([]);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [campsLoading, setCampsLoading] = useState(true);

  const token = localStorage.getItem('token');

  // ✅ DEBUG: Log appointment data when modal opens
  useEffect(() => {
    if (isOpen && appointment) {
      console.log("=" * 50);
      console.log("🔍 APPOINTMENT DATA DEBUG:");
      console.log("Full appointment object:", appointment);
      console.log("campName:", appointment.campName);
      console.log("location:", appointment.location);
      console.log("scheduledDate:", appointment.scheduledDate);
      console.log("scheduledTime:", appointment.scheduledTime);
      console.log("=" * 50);
      
      // Fetch camps
      fetchAvailableCamps();
      
      // Set date and time safely
      try {
        if (appointment.scheduledDate) {
          const dateObj = new Date(appointment.scheduledDate);
          const dateString = dateObj.toISOString().split('T')[0];
          console.log("✅ Setting date to:", dateString);
          setSelectedDate(dateString);
        }
      } catch (e) {
        console.error("❌ Error parsing date:", e);
      }

      if (appointment.scheduledTime) {
        console.log("✅ Setting time to:", appointment.scheduledTime);
        setSelectedTime(appointment.scheduledTime);
      }
    }
  }, [isOpen, appointment]);

  const fetchAvailableCamps = async () => {
    try {
      setCampsLoading(true);
      console.log("🏥 Fetching available camps...");
      
      const res = await fetch(`${API_URL}/camps-schedule`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch camps');
      }

      const data = await res.json();
      console.log("✅ Camps loaded:", data.camps);
      console.log("Number of camps:", data.camps?.length);
      
      setCamps(data.camps || []);

      if (!data.camps || data.camps.length === 0) {
        console.warn("⚠️ No camps returned from API");
        toast.error("No blood camps available at the moment");
      }

    } catch (error) {
      console.error("❌ Error fetching camps:", error);
      toast.error("Failed to load blood camps: " + error.message);
      setCamps([]);
    } finally {
      setCampsLoading(false);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();

    // Validation
    if (!selectedCamp) {
      toast.error('Please select a blood camp');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    if (!selectedTime) {
      toast.error('Please select a time');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for rescheduling');
      return;
    }

    try {
      setLoading(true);
      console.log("📅 Submitting reschedule request...");
      console.log({
        appointmentId: appointment._id,
        newCampId: selectedCamp._id,
        newCampName: selectedCamp.campName,
        newDate: selectedDate,
        newTime: selectedTime,
        reason: reason
      });

      const res = await fetch(
        `${API_URL}/appointments/${appointment._id}/reschedule`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            newCampId: selectedCamp._id,
            newDate: selectedDate,
            newTime: selectedTime,
            reason: reason
          })
        }
      );

      const data = await res.json();
      
      console.log("Response status:", res.status);
      console.log("Response data:", data);

      if (!res.ok) {
        console.error("❌ Reschedule failed:", data);
        throw new Error(data.message || 'Failed to reschedule');
      }

      console.log("✅ Appointment rescheduled successfully!");
      toast.success('✅ Appointment rescheduled successfully!');

      // Reset form
      setSelectedCamp(null);
      setSelectedDate('');
      setSelectedTime('');
      setReason('');

      // Close and refresh
      onClose();
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('❌ Reschedule error:', error);
      toast.error(error.message || 'Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !appointment) {
    console.log("Modal not rendering - isOpen:", isOpen, "appointment:", !!appointment);
    return null;
  }

  // ✅ SAFE DATA EXTRACTION
  const appointmentDate = appointment.scheduledDate 
    ? new Date(appointment.scheduledDate).toLocaleDateString()
    : 'Unknown Date';
  const appointmentTime = appointment.scheduledTime || 'Unknown Time';
  const location = appointment.location || {};
  const city = location.city || 'Unknown';
  const state = location.state || 'State';

  console.log("📊 Rendering modal with:", {
    appointmentDate,
    appointmentTime,
    city,
    state
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Reschedule Appointment</h2>
              <p className="text-sm text-gray-600">Change your donation appointment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-200 rounded-lg transition"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Current Details Section */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <h3 className="font-semibold text-gray-800 mb-4">Current Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

            {/* Date */}
            <div>
              <p className="text-gray-600 font-medium mb-1">Date:</p>
              <p className="text-lg font-bold text-gray-800">
                {appointmentDate}
              </p>
            </div>

            {/* Time */}
            <div>
              <p className="text-gray-600 font-medium mb-1">Time:</p>
              <p className="text-lg font-bold text-gray-800">
                {appointmentTime}
              </p>
            </div>

            {/* Location */}
            <div>
              <p className="text-gray-600 font-medium mb-1">Location:</p>
              <p className="text-lg font-bold text-gray-800">
                {city}, {state}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Select New Camp */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select New Camp
            </label>
            
            {campsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-2"></div>
                <p className="text-gray-600">Loading blood camps...</p>
              </div>
            ) : camps.length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-yellow-800 font-medium">No camps available</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {camps.map((camp) => (
                  <div
                    key={camp._id}
                    onClick={() => {
                      console.log("✅ Selected camp:", camp.campName);
                      setSelectedCamp(camp);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedCamp?._id === camp._id
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {camp.campName}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={14} />
                      <span>
                        {camp.location?.city || 'City'}, {camp.location?.state || 'State'}
                      </span>
                    </div>
                    {camp.location?.street && (
                      <p className="text-xs text-gray-500 mt-1">
                        {camp.location.street}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Select New Date */}
          {selectedCamp && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select New Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  console.log("✅ Selected date:", e.target.value);
                  setSelectedDate(e.target.value);
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition"
              />
            </div>
          )}

          {/* Select New Time */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select New Time
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => {
                  console.log("✅ Selected time:", e.target.value);
                  setSelectedTime(e.target.value);
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition"
              />
            </div>
          )}

          {/* Reason */}
          {selectedTime && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Reason for Rescheduling (Required)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Not available on the scheduled date, Work conflict, Medical reason, etc."
                maxLength={200}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition resize-none"
                rows="3"
              />
              <p className="text-xs text-gray-500 mt-1">{reason.length}/200</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={!selectedCamp || !selectedDate || !selectedTime || !reason.trim() || loading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Rescheduling...
              </>
            ) : (
              <>
                <Calendar size={18} />
                Confirm Reschedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;