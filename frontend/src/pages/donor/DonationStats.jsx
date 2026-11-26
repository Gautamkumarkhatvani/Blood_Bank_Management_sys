import React, { useState, useEffect } from 'react';
import { Heart, Droplet, Users, Trophy } from 'lucide-react';

const DonationStats = () => {
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalUnits: 0,
    livesImpacted: 0,
    donorLevel: 'Starter'
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/donor/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      'Starter': 'bg-blue-100 text-blue-800 border-blue-300',
      'Bronze': 'bg-orange-100 text-orange-800 border-orange-300',
      'Silver': 'bg-gray-100 text-gray-800 border-gray-300',
      'Gold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Platinum': 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[level] || colors['Starter'];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border-2 border-red-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Donations</p>
            <p className="text-3xl font-bold text-gray-800">{stats.totalDonations}</p>
          </div>
          <Heart className="w-10 h-10 text-red-600 opacity-20" />
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-blue-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Units</p>
            <p className="text-3xl font-bold text-gray-800">{stats.totalUnits}</p>
          </div>
          <Droplet className="w-10 h-10 text-blue-600 opacity-20" />
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-green-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Lives Impacted</p>
            <p className="text-3xl font-bold text-gray-800">{stats.livesImpacted}+</p>
          </div>
          <Users className="w-10 h-10 text-green-600 opacity-20" />
        </div>
      </div>

      <div className={`rounded-xl border-2 p-6 ${getLevelColor(stats.donorLevel)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-75 mb-1">Donor Level</p>
            <p className="text-2xl font-bold">{stats.donorLevel}</p>
          </div>
          <Trophy className="w-10 h-10 opacity-20" />
        </div>
      </div>
    </div>
  );
};

export default DonationStats;