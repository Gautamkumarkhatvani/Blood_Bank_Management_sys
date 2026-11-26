import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import useNavigate
import { jsPDF } from "jspdf"; // ✅ Import jsPDF
import axios from "axios";
import {
  AlertCircle, Calendar,
  Droplet,
  Users,
  Activity,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Shield,
  Award,
  Heart,
  TrendingUp,
  RefreshCw,
  Download,
  Share2,
  Filter,
  Search,
  Bell,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Zap
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_URL = "http://localhost:5000/api/donor";

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [donor, setDonor] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissedNotifications, setDismissedNotifications] = useState([]);

  // ✅ PHASE 6: Eligibility Status State
  const [eligibilityStatus, setEligibilityStatus] = useState({
    eligible: false,
    daysRemaining: 0,
    nextEligibleDate: null,
    reason: "Not eligible"
  });

  // ✅ PHASE 6: Calculate Eligibility
  const calculateEligibility = (donorData) => {
    console.log("🔄 Calculating eligibility...");

    // Check basic requirements
    if (!donorData.medicalVerified) {
      setEligibilityStatus({
        eligible: false,
        daysRemaining: 0,
        nextEligibleDate: null,
        reason: "Not medically verified"
      });
      return;
    }

    if (donorData.approvalStatus?.status !== 'approved') {
      setEligibilityStatus({
        eligible: false,
        daysRemaining: 0,
        nextEligibleDate: null,
        reason: "Not approved by admin"
      });
      return;
    }

    if (!donorData.lastDonationDate) {
      // First time donor - eligible immediately
      setEligibilityStatus({
        eligible: true,
        daysRemaining: 0,
        nextEligibleDate: null,
        reason: "Ready for first donation"
      });
      return;
    }

    // Calculate 90-day eligibility window
    const lastDonation = new Date(donorData.lastDonationDate);
    const nextEligibleDate = new Date(lastDonation);
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);

    const today = new Date();
    const daysRemaining = Math.ceil((nextEligibleDate - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      setEligibilityStatus({
        eligible: true,
        daysRemaining: 0,
        nextEligibleDate: null,
        reason: "Ready to donate again"
      });
    } else {
      setEligibilityStatus({
        eligible: false,
        daysRemaining: Math.max(0, daysRemaining),
        nextEligibleDate: nextEligibleDate,
        reason: `Wait ${daysRemaining} more days`
      });
    }

    console.log("✅ Eligibility calculated:", {
      eligible: daysRemaining <= 0,
      daysRemaining: Math.max(0, daysRemaining),
      nextEligibleDate: nextEligibleDate
    });
  };

  // ✅ PHASE 6: Progress Bar Calculation
  const getProgressPercentage = () => {
    if (!donor?.lastDonationDate) return 0;

    const lastDonation = new Date(donor.lastDonationDate);
    const nextEligibleDate = new Date(lastDonation);
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);

    const today = new Date();
    const totalDays = 90;
    const daysCompleted = totalDays - Math.ceil((nextEligibleDate - today) / (1000 * 60 * 60 * 24));

    return Math.min(100, Math.max(0, (daysCompleted / totalDays) * 100));
  };

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem("token");
      console.log("🔄 Starting donor dashboard data fetch...");

      if (!token) {
        toast.error("Authentication required");
        setError("No authentication token found");
        return;
      }

      console.log("📡 Making API requests...");

      // Fetch profile with better error handling
      let donorData = null;
      try {
        const profileRes = await axios.get(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        });

        console.log("✅ Profile Response:", profileRes.data);
        donorData = profileRes.data?.donor || profileRes.data || null;

        if (!donorData) {
          console.warn("⚠️ No donor data in response");
          setError("Could not load donor profile");
          setDonor(null);
          setLoading(false);
          return;
        }

        // ✅ Ensure all required fields have defaults
        donorData = {
          _id: donorData._id || null,
          fullName: donorData.fullName || "Unknown",
          email: donorData.email || "N/A",
          phone: donorData.phone || "N/A",
          bloodGroup: donorData.bloodGroup || "Unknown",
          age: donorData.age || null,
          weight: donorData.weight || null,
          address: donorData.address || { city: "N/A", state: "N/A" },
          eligibleToDonate: donorData.eligibleToDonate === true,
          nextEligibleDate: donorData.nextEligibleDate || null,
          lastDonationDate: donorData.lastDonationDate || null,
          createdAt: donorData.createdAt || new Date(),
          approvalStatus: donorData.approvalStatus || {
            status: "pending",
            approvedBy: null,
            approvalDate: null,
            rejectionReason: null
          },
          medicalVerified: donorData.medicalVerified || false,
          medicalVerificationStatus: donorData.medicalVerificationStatus || "pending",
          donationHistory: donorData.donationHistory || []
        };

        setDonor(donorData);

        // ✅ PHASE 6: Calculate eligibility after setting donor
        calculateEligibility(donorData);

      } catch (profileError) {
        console.error("❌ Error fetching profile:", profileError);
        const message = profileError.response?.data?.message || profileError.message;
        console.log("Error message:", message);

        if (profileError.response?.status === 500) {
          setError("Server error while loading profile. Please try again.");
        } else if (profileError.response?.status === 401) {
          setError("Your session expired. Please login again.");
        } else {
          setError(`Failed to load profile: ${message}`);
        }

        setDonor(null);
        setLoading(false);
        return;
      }

      // Fetch history (non-blocking if fails)
      try {
        const historyRes = await axios.get(`${API_URL}/history`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(() => ({ data: {} }));

        console.log("✅ History Response:", historyRes.data);

        let historyData = [];
        if (historyRes.data.history) {
          historyData = historyRes.data.history;
        } else if (historyRes.data.donations) {
          historyData = historyRes.data.donations;
        } else if (Array.isArray(historyRes.data)) {
          historyData = historyRes.data;
        }

        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (historyError) {
        console.warn("⚠️ Error fetching history (non-blocking):", historyError);
        setHistory([]);
      }

      // Fetch stats (non-blocking if fails)
      try {
        const statsRes = await axios.get(`${API_URL}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(() => ({ data: {} }));

        console.log("✅ Stats Response:", statsRes.data);

        // Calculate dashboard stats
        const historyData = Array.isArray(history) ? history : [];
        const totalDonations = historyData.length;
        const livesImpacted = totalDonations * 3;
        const achievementLevel = totalDonations >= 10 ? "Gold" : totalDonations >= 5 ? "Silver" : "Bronze";
        const nextMilestone = totalDonations < 5 ? 5 : totalDonations < 10 ? 10 : 15;
        const completionRate = Math.min(100, (totalDonations / nextMilestone) * 100);

        setDashboard({
          stats: {
            totalDonations,
            livesImpacted,
            achievementLevel,
            nextMilestone,
            completionRate,
            ...statsRes.data
          },
          recentActivity: statsRes.data.recentActivity || historyData.slice(0, 5)
        });
      } catch (statsError) {
        console.warn("⚠️ Error fetching stats (non-blocking):", statsError);
        // Create default dashboard stats
        setDashboard({
          stats: {
            totalDonations: 0,
            livesImpacted: 0,
            achievementLevel: "Bronze",
            nextMilestone: 5,
            completionRate: 0
          },
          recentActivity: []
        });
      }

    } catch (error) {
      console.error("🚨 Donor Dashboard Error:", error);
      const message = error.response?.data?.message || error.message || "Failed to load donor dashboard data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });

      if (res.data.lastAction) {
        setLastAction(res.data.lastAction);
      }
      if (res.data.notifications) {
        setNotifications(res.data.notifications);
      }
      if (res.data.unreadCount) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (error) {
      console.warn("⚠️ Error fetching notifications:", error);
    }
  };

  // ✅ NEW: Mark notifications as read
  const markNotificationsAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/notifications/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnreadCount(0);
      setLastAction(null);
    } catch (error) {
      console.warn("Error marking notifications as read:", error);
    }
  };

  const dismissNotification = (actionType) => {
    setDismissedNotifications([...dismissedNotifications, actionType]);
    markNotificationsAsRead();
  };

  const handleRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success("Dashboard updated");
  };

  useEffect(() => {
    console.log("🎯 Donor Dashboard component mounted");
    fetchDashboardData();
    fetchNotifications();
  }, []);

  console.log("📊 Current Donor State:", {
    donor: donor,
    history: history,
    loading: loading,
    error: error,
    eligibilityStatus: eligibilityStatus,
    approvalStatus: donor?.approvalStatus,
  });

  // ✅ Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <Heart className="w-12 h-12 text-red-500 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Loading Donor Dashboard
          </h2>
          <p className="text-gray-500">Preparing your donation journey...</p>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error && !donor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <p className="text-sm text-gray-500">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Safe defaults if donor is still null
  const isEligible = eligibilityStatus.eligible;
  const daysUntilEligible = eligibilityStatus.daysRemaining;
  const approvalStatus = donor?.approvalStatus?.status || "pending";
  const rejectionReason = donor?.approvalStatus?.rejectionReason || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            Donor Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Track your donation journey and impact
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 lg:mt-0 flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* ✅ NOTIFICATION SECTION */}

      {/* Deletion Notification */}
      {lastAction && lastAction.actionType === 'deleted' && (
        <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-6 flex items-start gap-4 animate-pulse">
          <div className="p-3 bg-red-100 rounded-lg flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-800 mb-2">❌ Account Deleted</h3>
            <p className="text-red-700 mb-2">Your donor account has been permanently deleted from the system.</p>
            <div className="bg-red-100 rounded-lg p-3 mb-2">
              <p className="text-sm text-red-800"><strong>Reason:</strong> {lastAction.reason}</p>
            </div>
            <p className="text-sm text-red-600"><strong>Deleted on:</strong> {new Date(lastAction.performedAt).toLocaleDateString()}</p>
            <p className="text-sm text-red-600 mt-2">If you believe this is a mistake, please contact our support team immediately.</p>
          </div>
        </div>
      )}

      {/* Ineligibility Notification */}
      {unreadCount > 0 && lastAction && lastAction.actionType === 'ineligible' && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 flex items-start gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-yellow-800 mb-2">⏳ Currently Ineligible to Donate</h3>
            <p className="text-yellow-700 mb-2">You have been marked ineligible to donate blood at this time.</p>
            <div className="bg-yellow-100 rounded-lg p-3 mb-2">
              <p className="text-sm text-yellow-800"><strong>Reason:</strong> {lastAction.reason}</p>
            </div>
            <p className="text-sm text-yellow-600"><strong>Changed on:</strong> {new Date(lastAction.performedAt).toLocaleDateString()}</p>
            <p className="text-sm text-yellow-600 mt-2">Please contact us for more information about your eligibility status.</p>
          </div>
        </div>
      )}

      {/* Eligible Again Notification */}
      {unreadCount > 0 && lastAction && lastAction.actionType === 'eligible' && (
        <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-xl p-6 flex items-start gap-4 animate-pulse">
          <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-800 mb-2">✅ You Are Now Eligible Again!</h3>
            <p className="text-green-700 mb-2">Congratulations! Your eligibility has been restored.</p>
            <div className="bg-green-100 rounded-lg p-3 mb-2">
              <p className="text-sm text-green-800"><strong>Reason:</strong> {lastAction.reason}</p>
            </div>
            <p className="text-sm text-green-600"><strong>Changed on:</strong> {new Date(lastAction.performedAt).toLocaleDateString()}</p>
            <p className="text-sm text-green-600 mt-2">You can now schedule your next blood donation at any of our blood camps.</p>
          </div>
        </div>
      )}

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="mb-4 text-center">
          <button
            onClick={markNotificationsAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
          >
            <Bell className="w-4 h-4" />
            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            <span className="ml-2 text-xs">Click to dismiss</span>
          </button>
        </div>
      )}

      {/* ✅ Approval Status Banner */}
      {approvalStatus === "pending" && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <ClockIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-800">⏳ Registration Pending</p>
            <p className="text-blue-600 text-sm">
              Your registration is under review by our admin team. Once approved, you'll be able to donate once approved.
            </p>
          </div>
        </div>
      )}

      {/* ✅ Approval Rejected Banner */}
      {approvalStatus === "rejected" && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">✗ Registration Rejected</p>
            <p className="text-red-600 text-sm">
              {rejectionReason || "Your registration did not meet our requirements."}
            </p>
          </div>
        </div>
      )}

      {/* ✅ Approval Approved Banner */}
      {approvalStatus === "approved" && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">✓ Registration Approved</p>
            <p className="text-green-600 text-sm">
              Welcome! You are now an active blood donor and can schedule donations.
            </p>
          </div>
        </div>
      )}

      {/* ✅ PHASE 6: ELIGIBILITY STATUS SECTION */}
      {approvalStatus === "approved" && (
        <EligibilityStatusBanner
          isEligible={isEligible}
          daysRemaining={daysUntilEligible}
          nextEligibleDate={eligibilityStatus.nextEligibleDate}
          lastDonationDate={donor?.lastDonationDate}
          progressPercentage={getProgressPercentage()}
        />
      )}

      {/* ✅ Donor Profile Card with safe null checks */}
      {donor && (
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-red-600" />
              Donor Profile
            </h2>

            <div className="flex items-center gap-2">
              {/* Approval Status Badge */}
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${approvalStatus === "approved"
                ? "bg-green-100 text-green-700"
                : approvalStatus === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
                }`}>
                {approvalStatus === "approved" && <CheckCircle className="w-4 h-4" />}
                {approvalStatus === "rejected" && <XCircle className="w-4 h-4" />}
                {approvalStatus === "pending" && <ClockIcon className="w-4 h-4" />}
                {approvalStatus === "approved" ? "Approved" : approvalStatus === "rejected" ? "Rejected" : "Pending"}
              </span>

              {/* Medical Status Badge */}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${isEligible ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                {isEligible ? "Eligible" : "Not Eligible"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <LabInfo
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              value={donor.email}
            />
            <LabInfo
              icon={<Phone className="w-4 h-4" />}
              label="Phone"
              value={donor.phone}
            />
            <LabInfo
              icon={<Droplet className="w-4 h-4" />}
              label="Blood Type"
              value={donor.bloodGroup}
            />
            <LabInfo
              icon={<MapPin className="w-4 h-4" />}
              label="Location"
              value={`${donor.address?.city || 'N/A'}, ${donor.address?.state || 'N/A'}`}
              truncate
            />
          </div>
        </div>
      )}

      {/* ✅ Show limited functionality if not approved */}
      {approvalStatus !== "approved" && (
        <div className="bg-blue-50 rounded-2xl shadow-lg border border-blue-200 p-6 mb-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              {approvalStatus === "pending"
                ? "⏳ Registration Under Review"
                : "✗ Registration Not Approved"}
            </h3>
            <p className="text-blue-700">
              {approvalStatus === "pending"
                ? "Your registration is being reviewed by our administration team. Once approved, you'll be able to view your donation statistics and schedule donations."
                : "Your registration was not approved. Please review the reason and consider reapplying."}
            </p>
            {rejectionReason && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Rejection Reason:</strong> {rejectionReason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Metrics Grid - Only show if approved */}
      {approvalStatus === "approved" && dashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              icon={<Droplet className="w-6 h-6" />}
              label="Total Donations"
              value={dashboard.stats?.totalDonations || 0}
              subtitle={`${dashboard.stats?.nextMilestone || 0} to next milestone`}
              color="red"
            />
            <MetricCard
              icon={<Users className="w-6 h-6" />}
              label="Lives Impacted"
              value={dashboard.stats?.livesImpacted || 0}
              subtitle="3 lives per donation"
              color="green"
            />
            <MetricCard
              icon={<Award className="w-6 h-6" />}
              label="Achievement Level"
              value={dashboard.stats?.achievementLevel || "Bronze"}
              subtitle="Keep donating to level up"
              color="purple"
            />
            <MetricCard
              icon={<Calendar className="w-6 h-6" />}
              label="Next Eligible"
              value={donor?.nextEligibleDate ? new Date(donor.nextEligibleDate).toLocaleDateString() : "Now"}
              subtitle={isEligible ? "Ready to donate" : `${daysUntilEligible} days left`}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Donation History Section */}
            <Section
              title="Donation History"
              icon={<Activity className="w-5 h-5" />}
              subtitle="Your blood donation journey"
            >
              {history && history.length > 0 ? (
                <div className="space-y-3">
                  {history.slice(0, 5).map((donation, index) => (
                    <DonationHistoryItem key={donation._id || index} donation={donation} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Droplet className="w-8 h-8" />}
                  message="No donation history yet"
                  actionText="Make your first donation"
                  onAction={() => toast.success("Find nearby blood camps to get started!")}
                />
              )}
            </Section>

            {/* Recent Activity Section */}
            <Section
              title="Recent Activity"
              icon={<Clock className="w-5 h-5" />}
              subtitle="Latest updates and achievements"
            >
              {dashboard?.recentActivity && dashboard.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.recentActivity.map((activity, index) => (
                    <ActivityCard key={activity._id || index} activity={activity} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Activity className="w-8 h-8" />}
                  message="No recent activity"
                />
              )}
            </Section>
          </div>

          {/* Quick Actions Section */}
          <Section
            title="Quick Actions"
            icon={<Shield className="w-5 h-5" />}
            subtitle="Manage your donor profile"
            className="mt-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionCard
                icon={<Download className="w-5 h-5" />}
                title="Download Certificate"
                description="Get your donation certificate"
                onClick={async () => {
                  try {
                    if (!history || history.length === 0) {
                      toast.error("No donation history found to generate certificate.");
                      return;
                    }
                    // Get latest completed donation
                    const latestDonation = history[0]; // Assumes history is sorted desc
                    const donationId = latestDonation.id || latestDonation._id;

                    if (!donationId) {
                      toast.error("No valid donation record found.");
                      return;
                    }

                    toast.loading("Generating certificate...", { id: "certGen" });

                    // Fetch certificate data
                    const token = localStorage.getItem("token");
                    const res = await axios.get(`${API_URL}/certificate/${donationId}`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.data.success) {
                      const certData = res.data.certificate;

                      // Generate PDF
                      const doc = new jsPDF({
                        orientation: 'landscape',
                        unit: 'mm',
                        format: 'a4'
                      });

                      // Add Border
                      doc.setLineWidth(2);
                      doc.setDrawColor(220, 38, 38); // Red border
                      doc.rect(10, 10, 277, 190);

                      doc.setLineWidth(1);
                      doc.setDrawColor(0, 0, 0);
                      doc.rect(15, 15, 267, 180);

                      // Header
                      doc.setTextColor(220, 38, 38); // Red title
                      doc.setFontSize(40);
                      doc.setFont("helvetica", "bold");
                      doc.text("CERTIFICATE OF APPRECIATION", 148.5, 50, { align: "center" });

                      // Subheader
                      doc.setTextColor(0, 0, 0); // Black text
                      doc.setFontSize(16);
                      doc.setFont("helvetica", "normal");
                      doc.text("This certificate is proudly presented to", 148.5, 75, { align: "center" });

                      // Donor Name
                      doc.setFontSize(30);
                      doc.setFont("times", "bolditalic");
                      doc.text(certData.donorName || "Donor", 148.5, 100, { align: "center" });

                      // Line under name
                      doc.setLineWidth(0.5);
                      doc.line(70, 105, 227, 105);

                      // Body Text
                      doc.setFontSize(16);
                      doc.setFont("helvetica", "normal");
                      doc.text("For your noble act of voluntarily donating blood.", 148.5, 125, { align: "center" });
                      doc.text("Your contribution has saved lives and given hope to many.", 148.5, 135, { align: "center" });

                      // Details
                      doc.setFontSize(14);
                      doc.text(`Donation Date: ${new Date(certData.donationDate).toLocaleDateString()}`, 60, 160);
                      doc.text(`Blood Group: ${certData.bloodGroup}`, 200, 160);
                      doc.text(`Units Donated: ${certData.quantity}`, 148.5, 160, { align: "center" });

                      // Footer
                      doc.setFontSize(12);
                      doc.setTextColor(100);
                      doc.text("BloodConnect Foundation", 148.5, 185, { align: "center" });
                      doc.setFontSize(10);
                      doc.text(`Certificate ID: ${certData.donationId}`, 148.5, 190, { align: "center" });

                      // Save
                      doc.save(`Blood_Donation_Certificate_${certData.donationDate.split('T')[0]}.pdf`);

                      toast.dismiss("certGen");
                      toast.success("Certificate downloaded successfully!");
                    }
                  } catch (err) {
                    toast.dismiss("certGen");
                    toast.error("Failed to generate certificate.");
                    console.error(err);
                  }
                }}
                color="blue"
              />
              <ActionCard
                icon={<Share2 className="w-5 h-5" />}
                title="Share Achievement"
                description="Share your impact with others"
                onClick={() => {
                  const shareData = {
                    title: 'Blood Donor Achievement',
                    text: `I just checked my donor dashboard! I've donated ${dashboard?.stats?.totalDonations || 0} times and impacted ${dashboard?.stats?.livesImpacted || 0} lives. Join me in saving lives!`,
                    url: window.location.origin
                  };
                  if (navigator.share) {
                    navigator.share(shareData).catch(console.error);
                  } else {
                    navigator.clipboard.writeText(shareData.text + " " + shareData.url);
                    toast.success("Achievement copied to clipboard!");
                  }
                }}
                color="green"
              />
              <ActionCard
                icon={isEligible ? <Calendar className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                title={isEligible ? "Schedule Donation" : "Ineligible to Donate"}
                description={isEligible ? "Book your next donation" : `Wait ${daysUntilEligible} more days`}
                onClick={() => {
                  if (isEligible) {
                    navigate('/donor/camps');
                  } else {
                    toast.error(`You are not eligible yet. Please wait ${daysUntilEligible} days.`);
                  }
                }}
                color={isEligible ? "red" : "gray"}
              />
              <ActionCard
                icon={<Users className="w-5 h-5" />}
                title="Invite Friends"
                description="Grow the donor community"
                onClick={() => {
                  const text = "Hi! I'm using BloodConnect to save lives. You should become a donor too!";
                  const url = `https://wa.me/?text=${encodeURIComponent(text + " " + window.location.origin)}`;
                  window.open(url, '_blank');
                }}
                color="purple"
              />
            </div>
          </Section>

          {/* Health Stats Section */}
          {donor && (
            <Section
              title="Health Overview"
              icon={<Heart className="w-5 h-5" />}
              subtitle="Your health metrics"
              className="mt-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <HealthStat
                  label="Age"
                  value={donor.age || "N/A"}
                  icon={<User className="w-4 h-4" />}
                />
                <HealthStat
                  label="Weight"
                  value={donor.weight ? `${donor.weight} kg` : "N/A"}
                  icon={<Activity className="w-4 h-4" />}
                />
                <HealthStat
                  label="Last Donation"
                  value={donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : "Never"}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <HealthStat
                  label="Donor Since"
                  value={donor.createdAt ? new Date(donor.createdAt).getFullYear() : new Date().getFullYear()}
                  icon={<Award className="w-4 h-4" />}
                />
              </div>
            </Section>
          )}
        </>
      )
      }
    </div >
  );
};

// ✅ PHASE 6: NEW COMPONENT - Eligibility Status Banner
const EligibilityStatusBanner = ({
  isEligible,
  daysRemaining,
  nextEligibleDate,
  lastDonationDate,
  progressPercentage
}) => {
  console.log("🎯 Rendering EligibilityStatusBanner:", {
    isEligible,
    daysRemaining,
    nextEligibleDate,
    progressPercentage
  });

  return (
    <div className={`mb-6 p-6 rounded-xl border-2 ${isEligible
      ? 'bg-green-50 border-green-300'
      : 'bg-yellow-50 border-yellow-300'
      }`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg flex-shrink-0 ${isEligible
          ? 'bg-green-100'
          : 'bg-yellow-100'
          }`}>
          {isEligible ? (
            <CheckCircle className={`w-6 h-6 ${isEligible ? 'text-green-600' : 'text-yellow-600'}`} />
          ) : (
            <Clock className={`w-6 h-6 ${isEligible ? 'text-green-600' : 'text-yellow-600'}`} />
          )}
        </div>

        <div className="flex-1">
          <h3 className={`text-lg font-bold mb-2 ${isEligible ? 'text-green-800' : 'text-yellow-800'
            }`}>
            {isEligible ? '✅ Ready to Donate!' : '⏳ Waiting Period Active'}
          </h3>

          {isEligible ? (
            <p className={`text-sm ${isEligible ? 'text-green-700' : 'text-yellow-700'}`}>
              Congratulations! You are eligible to donate blood now. Visit our blood camps to schedule your next donation.
            </p>
          ) : (
            <>
              <p className={`text-sm mb-3 ${isEligible ? 'text-green-700' : 'text-yellow-700'}`}>
                You can donate again in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>
              </p>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className={isEligible ? 'text-green-700' : 'text-yellow-700'}>
                    Waiting period progress
                  </span>
                  <span className={isEligible ? 'text-green-700' : 'text-yellow-700'}>
                    {Math.round(progressPercentage)}% complete
                  </span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isEligible ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              <p className={`text-xs ${isEligible ? 'text-green-600' : 'text-yellow-600'}`}>
                Next eligible date: <strong>{nextEligibleDate?.toLocaleDateString()}</strong>
              </p>
            </>
          )}
        </div>

        {/* Right side: Last donation date */}
        {lastDonationDate && (
          <div className="text-right flex-shrink-0">
            <p className={`text-xs font-medium ${isEligible ? 'text-green-600' : 'text-yellow-600'} mb-1`}>
              LAST DONATION
            </p>
            <p className={`font-bold ${isEligible ? 'text-green-800' : 'text-yellow-800'}`}>
              {new Date(lastDonationDate).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Components (same as your blood lab dashboard)
const MetricCard = ({ icon, label, value, subtitle, color, alert = false }) => {
  const colorClasses = {
    blue: { border: "border-l-blue-400", bg: "bg-blue-100", text: "text-blue-600" },
    green: { border: "border-l-green-400", bg: "bg-green-100", text: "text-green-600" },
    red: { border: "border-l-red-400", bg: "bg-red-100", text: "text-red-600" },
    purple: { border: "border-l-purple-400", bg: "bg-purple-100", text: "text-purple-600" },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`bg-white rounded-xl shadow-lg border-l-4 ${alert ? "border-l-red-400" : colors.border} p-5 relative overflow-hidden`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className={`text-xs ${alert ? "text-red-600" : "text-gray-500"} mt-1`}>{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${alert ? "bg-red-100 text-red-600" : `${colors.bg} ${colors.text}`}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, icon, subtitle, children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-lg border border-red-50 p-6 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          {icon} {title}
        </h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const LabInfo = ({ icon, label, value, truncate = false }) => (
  <div className="flex items-start gap-3">
    <div className="p-2 bg-red-100 rounded-lg text-red-600 mt-1">{icon}</div>
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`font-medium text-gray-800 ${truncate ? "truncate" : ""}`}>
        {value || "—"}
      </p>
    </div>
  </div>
);

const DonationHistoryItem = ({ donation }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-red-100 rounded-lg text-red-600">
        <Droplet className="w-4 h-4" />
      </div>
      <div>
        <p className="font-medium text-gray-800">{donation.facility || "Blood Donation Camp"}</p>
        <p className="text-xs text-gray-500">
          {new Date(donation.donationDate || donation.date).toLocaleDateString()} • {donation.bloodType || donation.bloodGroup}
        </p>
      </div>
    </div>
    <div className="text-right">
      <span className="font-bold text-gray-800">{donation.quantity || 1} unit</span>
      <p className="text-xs text-green-600 mt-1">Completed</p>
    </div>
  </div>
);

const ActivityCard = ({ activity }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
    <div className="flex-1">
      <h4 className="font-medium text-gray-800 mb-1">{activity.eventType || "Donation"}</h4>
      <p className="text-sm text-gray-600">{activity.description || "Blood donation completed"}</p>
    </div>
    <div className="text-right">
      <span className="text-xs text-gray-500">
        {new Date(activity.date || activity.createdAt).toLocaleDateString()}
      </span>
    </div>
  </div>
);

const ActionCard = ({ icon, title, description, onClick, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200",
    green: "bg-green-50 text-green-600 hover:bg-green-100 border-green-200",
    red: "bg-red-50 text-red-600 hover:bg-red-100 border-red-200",
    purple: "bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200",
    gray: "bg-gray-50 text-gray-500 hover:bg-gray-100 border-gray-200 cursor-not-allowed opacity-75",
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-colors ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white rounded-lg">{icon}</div>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="text-sm opacity-75">{description}</p>
    </button>
  );
};

const HealthStat = ({ label, value, icon }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
    <div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
    <div className="p-2 bg-red-100 rounded-lg text-red-600">
      {icon}
    </div>
  </div>
);

const EmptyState = ({ icon, message, actionText, onAction }) => (
  <div className="text-center py-8 text-gray-500">
    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
      {icon}
    </div>
    <p className="text-sm mb-3">{message}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
      >
        {actionText}
      </button>
    )}
  </div>
);

export default DonorDashboard;
