import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Calendar, Clock, MapPin, Phone, Heart } from 'lucide-react';

const API_URL = "http://localhost:5000/api/donor";

const ScheduleDonationModal = ({ isOpen, onClose, onSuccess, isFirstTime = true }) => {
  const [camps, setCamps] = useState([]);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [campsLoading, setCampsLoading] = useState(true);
  const [notes, setNotes] = useState('');

  const token = localStorage.getItem('token');

  // Fetch available camps
  useEffect(() => {
    if (isOpen) {
      fetchAvailableCamps();
    }
  }, [isOpen]);

  const fetchAvailableCamps = async () => {
    try {
      setCampsLoading(true);
      const res = await fetch(`${API_URL}/camps-schedule`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Failed to fetch camps');

      const data = await res.json();
      setCamps(data.camps || []);
      console.log("✅ Camps loaded:", data.camps?.length);
    } catch (error) {
      console.error("Error fetching camps:", error);
      toast.error("Failed to load blood camps");
    } finally {
      setCampsLoading(false);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();

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

    try {
      setLoading(true);
      console.log("📅 Scheduling donation...");
      console.log({
        campId: selectedCamp._id,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        notes: notes
      });

      const res = await fetch(`${API_URL}/schedule-donation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campId: selectedCamp._id,
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
          notes: notes
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to schedule donation');
      }

      console.log("✅ Donation scheduled successfully");
      toast.success('✅ Donation scheduled successfully! Check your email for confirmation.');

      // Reset form
      setSelectedCamp(null);
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');

      // Close modal and refresh dashboard
      onClose();
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Schedule error:', error);
      toast.error(error.message || 'Failed to schedule donation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {isFirstTime ? "Schedule Your First Donation" : "Schedule Your Next Donation"}
              </h2>
              <p className="text-sm text-gray-600">
                {isFirstTime ? "Take the first step in saving lives" : "Continue your life-saving journey"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-200 rounded-lg transition"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Select Camp */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Step 1: Select Blood Camp
            </label>

            {campsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full mx-auto mb-2"></div>
                <p className="text-gray-600">Loading blood camps...</p>
              </div>
            ) : camps.length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 font-medium">No blood camps available at the moment</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {camps.map((camp) => (
                  <div
                    key={camp._id}
                    onClick={() => setSelectedCamp(camp)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedCamp?._id === camp._id
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{camp.campName}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                          <MapPin size={14} />
                          <span>{camp.location?.city}, {camp.location?.state}</span>
                        </div>
                        {camp.contactNumber && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone size={14} />
                            <span>{camp.contactNumber}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedCamp?._id === camp._id
                            ? 'border-red-600 bg-red-600'
                            : 'border-gray-400'
                          }`}>
                          {selectedCamp?._id === camp._id && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Select Date */}
          {selectedCamp && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Step 2: Select Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}  // Can't select past dates
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-200 outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Select Time */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Step 3: Select Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5" />
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-200 outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Optional Notes */}
          {selectedTime && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any medical conditions or allergies we should know about?"
                maxLength={500}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-200 outline-none transition resize-none"
                rows="3"
              />
              <p className="text-xs text-gray-500 mt-1">{notes.length}/500</p>
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
            onClick={handleSchedule}
            disabled={!selectedCamp || !selectedDate || !selectedTime || loading}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Scheduling...
              </>
            ) : (
              <>
                <Heart size={18} />
                Confirm Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDonationModal;