import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DonationAnalytics = () => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/donor/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setChartData(data.analyticsData || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Line Chart - Donations Over Time */}
      <div className="bg-white rounded-xl border-2 border-red-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Donation Timeline</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="donations" stroke="#dc2626" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart - Blood Units */}
      <div className="bg-white rounded-xl border-2 border-blue-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Blood Units Donated</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="units" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DonationAnalytics;