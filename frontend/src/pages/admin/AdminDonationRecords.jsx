import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  CheckCircle,
  X,
  Calendar,
  Clock,
  User,
  Droplet,
  FileText
} from 'lucide-react';

const API_URL = "http://localhost:5000/api/facility";

const AdminDonationRecords = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [bloodUnits, setBloodUnits] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [remarks, setRemarks] = useState('');
  const [completing, setCompleting] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchScheduledAppointments();
  }, []);

  const fetchScheduledAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/scheduled-appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteClick = (appointment) => {
    setSelectedAppointment(appointment);
    setBloodGroup(appointment.donorBloodGroup || '');
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();

    if (!bloodUnits || !bloodGroup) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setCompleting(true);
      const res = await fetch(
        `${API_URL}/donations/${selectedAppointment._id}/complete`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bloodUnits: parseFloat(bloodUnits),
            bloodGroup: bloodGroup,
            remarks: remarks,
            facilityId: localStorage.getItem('facilityId')
          })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success('✅ Donation recorded successfully!');
      setShowCompleteModal(false);
      setBloodUnits('');
      setRemarks('');
      setSelectedAppointment(null);
      fetchScheduledAppointments();

    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message);
    } finally {
      setCompleting(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle className="w-8 h-8 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-800">Record Donations</h1>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No scheduled appointments for today</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {appointments.map((apt) => (
            <div key={apt._id} className="bg-white rounded-xl border-2 border-red-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{apt.donorName}</h3>
                  <p className="text-sm text-gray-600">{apt.donorEmail}</p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                  Scheduled
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-red-500" />
                  <span>{new Date(apt.scheduledDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-red-500" />
                  <span>{apt.scheduledTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Droplet size={16} className="text-red-500" />
                  <span>Blood Group: {apt.bloodGroup}</span>
                </div>
              </div>

              <button
                onClick={() => handleCompleteClick(apt)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Mark as Completed
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold">Record Donation</h2>
            </div>

            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>{selectedAppointment.donorName}</strong> - {new Date(selectedAppointment.scheduledDate).toLocaleDateString()}
              </p>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Blood Units (Required)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={bloodUnits}
                  onChange={(e) => setBloodUnits(e.target.value)}
                  placeholder="e.g., 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Blood Group (Required)
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any notes about the donation..."
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  rows="2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={completing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  disabled={completing}
                >
                  {completing ? 'Recording...' : 'Confirm & Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDonationRecords;