import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import BloodCamp from "../models/bloodCampModel.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ============================================================================
// 👤 FIXED: Get Donor Profile - Safe Version
// ============================================================================
export const getDonorProfile = async (req, res) => {
  try {
    const donorId = req.donor?.id || req.donor?._id || req.user?.id || req.user?._id;

    console.log("🔄 getDonorProfile - Donor ID:", donorId);

    if (!donorId) {
      return res.status(401).json({ message: "Unauthorized: No donor ID" });
    }

    let donor = await Donor.findById(donorId).select("-password -__v");

    if (!donor) {
      console.warn("⚠️ Donor not found:", donorId);
      return res.status(404).json({ message: "Donor not found" });
    }

    console.log("✅ Donor found:", donor.fullName);

    // const isEligible = (donor.isEligible === true) && (donor.eligibleToDonate === true);
    const totalDonations = donor.donationHistory?.length || 0;
    const lastDonation = donor.lastDonationDate || null;

    let nextEligibleDate = null;
    if (lastDonation) {
      const next = new Date(lastDonation);
      next.setDate(next.getDate() + 90);
      nextEligibleDate = next;
    }

    const approvalStatus = donor.approvalStatus || {
      status: "approved",
      approvedBy: null,
      approvalDate: null,
      rejectionReason: null
    };

    const donorProfile = {
      _id: donor._id || null,
      fullName: donor.fullName || "N/A",
      email: donor.email || "N/A",
      phone: donor.phone || "N/A",
      bloodGroup: donor.bloodGroup || "N/A",
      age: donor.age || 0,
      gender: donor.gender || "N/A",
      weight: donor.weight || 0,
      address: donor.address || {
        street: "N/A",
        city: "N/A",
        state: "N/A",
        pincode: "N/A"
      },
      totalDonations,
      lastDonationDate: lastDonation,
      nextEligibleDate,
      medicalCertificate: donor.medicalCertificate || null,
      medicalVerified: donor.medicalVerified === true,
      medicalVerificationStatus: donor.medicalVerificationStatus || "pending",
      approvalStatus: approvalStatus,
      eligibleToDonate:
        (donor.eligibleToDonate === true) &&
        (approvalStatus.status === "approved"),
      donationHistory: (donor.donationHistory || []).map((don) => ({
        id: don._id || null,
        donationDate: don.donationDate || new Date(),
        facility: don.facility?.facilityName || "N/A",
        city: don.facility?.address?.city || "N/A",
        state: don.facility?.address?.state || "N/A",
        bloodGroup: don.bloodGroup || "N/A",
        quantity: don.quantity || 1,
        remarks: don.remarks || "",
        verified: don.verified === true,
      })),

      createdAt: donor.createdAt,
      updatedAt: donor.updatedAt,
    };

    console.log("✅ getDonorProfile - Returning:", donorProfile._id);

    res.status(200).json({ donor: donorProfile });

  } catch (error) {
    console.error("❌ getDonorProfile Error:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({
      message: "Error fetching donor profile",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
};

// ============================================================================
// 📝 FIXED: Update Donor Profile
// ============================================================================
export const updateDonorProfile = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;

    if (!donorId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { fullName, phone, address, age, gender, weight, password } = req.body;

    const donor = await Donor.findById(donorId).select('+password');
    if (!donor) return res.status(404).json({ message: "Donor not found" });

    donor.fullName = fullName !== undefined ? fullName : donor.fullName;
    donor.phone = phone !== undefined ? phone : donor.phone;

    if (address) {
      donor.address.street = address.street || donor.address.street;
      donor.address.city = address.city || donor.address.city;
      donor.address.state = address.state || donor.address.state;
      donor.address.pincode = address.pincode || donor.address.pincode;
    }

    donor.age = age !== undefined ? age : donor.age;
    donor.gender = gender !== undefined ? gender : donor.gender;
    donor.weight = weight !== undefined ? weight : donor.weight;

    if (password) {
      const salt = await bcrypt.genSalt(12);
      donor.password = await bcrypt.hash(password, salt);
    }

    const updatedDonor = await donor.save();

    res.status(200).json({
      message: "Profile updated successfully",
      donor: {
        fullName: updatedDonor.fullName,
        email: updatedDonor.email,
        phone: updatedDonor.phone,
        address: updatedDonor.address,
        age: updatedDonor.age,
        gender: updatedDonor.gender,
        weight: updatedDonor.weight,
      },
    });
  } catch (error) {
    console.error("❌ updateDonorProfile Error:", error);
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};

// ============================================================================
// 🏥 FIXED: Get Donor Camps
// ============================================================================
export const getDonorCamps = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [camps, total] = await Promise.all([
      BloodCamp.find(filter)
        .sort({ date: 1 })
        .skip(skip)
        .limit(parseInt(limit)),

      BloodCamp.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        camps: camps || [],
        pagination: {
          total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("❌ getDonorCamps Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch blood camps" });
  }
};


// ============================================================================
// 📊 FIXED: Get Donor Stats
// ============================================================================
export const getDonorStats = async (req, res) => {
  try {
    const donorId = req.donor?.id || req.donor?._id;

    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log("🔄 getDonorStats - Donor ID:", donorId);

    const donor = await Donor.findById(donorId);

    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    const totalDonations = donor.donationHistory?.length || 0;
    const lastDonationDate = donor.lastDonationDate || null;

    let nextEligibleDonationDate = null;
    let eligibilityStatus = 'Eligible';

    const approvalStatus = donor.approvalStatus?.status || "pending";

    if (approvalStatus !== "approved") {
      eligibilityStatus = "Ineligible (Not approved by admin)";
    } else if (!donor.medicalVerified) {
      eligibilityStatus = "Ineligible (Medical certificate not verified)";
    } else if (lastDonationDate) {
      const lastDate = new Date(lastDonationDate);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 90);
      nextEligibleDonationDate = nextDate;

      if (nextEligibleDonationDate > new Date()) {
        const remainingDays = Math.ceil(
          (nextEligibleDonationDate - new Date()) / (1000 * 60 * 60 * 24)
        );
        eligibilityStatus = `Ineligible (Cooldown: ${remainingDays} days remaining)`;
      }
    }

    // ------------------------------------------------------------------------
    // Calculate Recent Activity
    // ------------------------------------------------------------------------
    const activities = [];

    // 1. Add Donations to Activity
    if (donor.donationHistory) {
      donor.donationHistory.forEach(donation => {
        activities.push({
          _id: donation._id || `don_${Math.random()}`, // Ensure ID
          type: 'donation',
          eventType: 'Blood Donation',
          description: `Donated ${donation.quantity || 1} unit(s) of ${donor.bloodGroup}`,
          date: donation.donationDate,
          status: 'completed'
        });
      });
    }

    // 2. Add Appointments to Activity
    if (donor.donationAppointments) {
      donor.donationAppointments.forEach(app => {
        activities.push({
          _id: app._id || `app_${Math.random()}`,
          type: 'appointment',
          eventType: `Appointment ${app.status.charAt(0).toUpperCase() + app.status.slice(1)}`,
          description: `Appointment at ${app.campName || 'Blood Camp'}`,
          date: app.scheduledDate || app.createdAt,
          status: app.status
        });
      });
    }

    // 3. Add Notifications to Activity (System Events)
    if (donor.notifications) {
      donor.notifications.forEach(notif => {
        activities.push({
          _id: notif._id || `notif_${Math.random()}`,
          type: 'notification',
          eventType: notif.title || 'System Notification',
          description: notif.message,
          date: notif.createdAt,
          status: notif.status
        });
      });
    }

    // Sort by date descending (newest first)
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Take top 5
    const recentActivity = activities.slice(0, 5);

    res.json({
      success: true,
      // Return stats directly at root level as expected by some frontend logic, 
      // AND inside a 'dashboard' object if that's what the component expects.
      // Based on previous code, the frontend expects `statsRes.data` to be merged into `dashboard.stats`.
      totalDonations,
      livesImpacted: totalDonations * 3,
      achievementLevel: totalDonations >= 10 ? "Gold" : totalDonations >= 5 ? "Silver" : "Bronze",
      nextMilestone: totalDonations < 5 ? 5 : totalDonations < 10 ? 10 : 15,
      completionRate: Math.min(100, (totalDonations / 5) * 100), // Default milestone 5
      lastDonationDate,
      nextEligibleDonationDate,
      eligibilityStatus,
      recentActivity // ✅ Key addition
    });

  } catch (error) {
    console.error("❌ getDonorStats Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch donor statistics",
      error: error.message
    });
  }
};

// ============================================================================
// 📜 FIXED: Get Donor History
// ============================================================================
export const getDonorHistory = async (req, res) => {
  try {
    const donorId = req.donor?.id || req.donor?._id;

    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log("🔄 getDonorHistory - Donor ID:", donorId);

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const donor = await Donor.findById(donorId);

    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    const totalHistory = donor.donationHistory?.length || 0;

    const historyData = (donor.donationHistory || [])
      .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate))
      .slice(skip, skip + parseInt(limit));

    const history = historyData.map((item) => ({
      id: item._id || null,
      donationDate: item.donationDate || new Date(),
      bloodGroup: item.bloodGroup || "N/A",
      quantity: item.quantity || 1,
      remarks: item.remarks || "",
      verified: item.verified === true,
      facility: item.facility?.facilityName || "N/A",
      city: item.facility?.address?.city || "N/A",
      state: item.facility?.address?.state || "N/A",
    }));

    console.log("✅ getDonorHistory - Returning", history.length, "records");

    res.json({
      success: true,
      history,
      pagination: {
        total: totalHistory,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalHistory / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error("❌ getDonorHistory Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch donation history",
      error: error.message
    });
  }
};

// ============================================================================
// 🔍 Search Donor (Blood Lab)
// ============================================================================
export const searchDonor = async (req, res) => {
  try {
    const { term } = req.query;

    if (!term) {
      return res.status(400).json({ success: false, message: "Search term required" });
    }

    const donors = await Donor.find({
      $or: [
        { fullName: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } }
      ]
    })
      .select('fullName email phone bloodGroup lastDonationDate donationHistory')
      .limit(20)
      .sort({ lastDonationDate: -1 });

    res.status(200).json({ success: true, donors });
  } catch (err) {
    console.error("❌ searchDonor Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================================================================
// ✅ FIXED: Mark Donation (Blood Lab)
// ============================================================================
export const markDonation = async (req, res) => {
  try {
    const donorId = req.params.id;
    const labId = req.user?._id || req.facility?._id;
    const { quantity = 1, remarks = "", bloodGroup } = req.body;

    if (!labId) {
      return res.status(401).json({ success: false, message: "Unauthorized: No lab ID" });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    if (!donor.medicalVerified || donor.medicalVerificationStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Donor is not medically verified and cannot donate blood."
      });
    }

    if (donor.lastDonationDate) {
      const lastDonation = new Date(donor.lastDonationDate);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      if (lastDonation > threeMonthsAgo) {
        return res.status(400).json({
          success: false,
          message: "Donor cannot donate yet. Minimum 3 months required between donations."
        });
      }
    }

    donor.lastDonationDate = new Date();

    if (bloodGroup) {
      donor.bloodGroup = bloodGroup;
    }

    donor.donationHistory.push({
      donationDate: new Date(),
      facility: labId,
      bloodGroup: bloodGroup || donor.bloodGroup,
      quantity,
      remarks,
      verified: true
    });

    await donor.save();

    res.status(200).json({
      success: true,
      message: "Donation recorded successfully",
      donor
    });
  } catch (err) {
    console.error("❌ markDonation Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ============================================================================
// ✅ FIXED: Get Recent Donations (Blood Lab) - CRITICAL EXPORT
// ============================================================================
export const getRecentDonations = async (req, res) => {
  try {
    const labId = req.user?._id || req.facility?._id;

    if (!labId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    // Count today's donations
    const todayDonations = await Donor.countDocuments({
      'donationHistory.facility': labId,
      'donationHistory.donationDate': { $gte: today, $lt: tomorrow }
    });

    // Count this week's donations
    const weekDonations = await Donor.countDocuments({
      'donationHistory.facility': labId,
      'donationHistory.donationDate': { $gte: weekStart }
    });

    // Get total donations
    const allDonors = await Donor.find({
      'donationHistory.facility': labId
    })
      .select('fullName bloodGroup donationHistory')
      .sort({ 'donationHistory.donationDate': -1 })
      .limit(50);

    // Calculate total donations
    let totalDonations = 0;
    const recentDonations = [];

    for (const donor of allDonors) {
      if (donor.donationHistory) {
        for (const donation of donor.donationHistory) {
          if (donation.facility && donation.facility.toString() === labId.toString()) {
            totalDonations++;
            if (recentDonations.length < 10) {
              recentDonations.push({
                donorName: donor.fullName,
                bloodGroup: donation.bloodGroup,
                quantity: donation.quantity || 1,
                date: donation.donationDate,
                remarks: donation.remarks || ""
              });
            }
          }
        }
      }
    }

    res.json({
      success: true,
      stats: {
        today: todayDonations,
        thisWeek: weekDonations,
        total: totalDonations
      },
      donations: recentDonations
    });
  } catch (err) {
    console.error("❌ getRecentDonations Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch recent donations", error: err.message });
  }
};

// ============================================================================
// ✅ NEW ADMIN ENDPOINTS
// ============================================================================

export const getAllDonorsAdmin = async (req, res) => {
  try {
    const { search, bloodGroup, approvalStatus, limit = 100, page = 1 } = req.query;

    const filter = { deleted: { $ne: true } };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search } }
      ];
    }

    if (bloodGroup && bloodGroup !== 'all') {
      filter.bloodGroup = bloodGroup;
    }

    if (approvalStatus && approvalStatus !== 'all') {
      filter['approvalStatus.status'] = approvalStatus;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [donors, total] = await Promise.all([
      Donor.find(filter)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Donor.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      donors,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    });

  } catch (error) {
    console.error("❌ getAllDonorsAdmin Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching donors",
      error: error.message
    });
  }
};

export const approveDonor = async (req, res) => {
  try {
    const { donorId } = req.params;
    const adminId = req.admin?._id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      return res.status(400).json({ success: false, message: "Invalid donor ID" });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    donor.approvalStatus = {
      status: 'approved',
      approvedBy: adminId,
      approvalDate: new Date()
    };

    await donor.save();

    res.status(200).json({
      success: true,
      message: "Donor approved successfully",
      donor
    });

  } catch (error) {
    console.error("❌ approveDonor Error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving donor",
      error: error.message
    });
  }
};

export const rejectDonor = async (req, res) => {
  try {
    const { donorId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin?._id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      return res.status(400).json({ success: false, message: "Invalid donor ID" });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: "Rejection reason required" });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    donor.approvalStatus = {
      status: 'rejected',
      approvedBy: adminId,
      approvalDate: new Date(),
      rejectionReason: reason
    };

    await donor.save();

    res.status(200).json({
      success: true,
      message: "Donor rejected successfully",
      donor
    });

  } catch (error) {
    console.error("❌ rejectDonor Error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting donor",
      error: error.message
    });
  }
};


export const deleteDonor = async (req, res) => {
  try {
    const { donorId } = req.params;
    const { soft = true, reason } = req.body;
    const adminId = req.admin?._id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      return res.status(400).json({ success: false, message: "Invalid donor ID" });
    }

    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: "Deletion reason required" });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    if (soft === true || soft !== false) {
      donor.deleted = true;
      donor.deletedAt = new Date();
      donor.deletedBy = adminId;
      donor.deletionReason = reason;

      donor.lastAdminAction = {
        message: `❌ Your account has been deleted. Reason: ${reason}`
      };

      // Send email:

      if (!donor.notifications) donor.notifications = [];
      donor.notifications.push({
        title: '❌ Account Deleted',
        message: `❌ Your account has been deleted. Reason: ${reason}`,
        reason: reason,
        status: 'unread',
        createdAt: new Date()
      });

      await donor.save();

      res.status(200).json({
        success: true,
        message: "Donor soft-deleted successfully"
      });
    } else {
      await Donor.findByIdAndDelete(donorId);
      // When deleting:

      res.status(200).json({
        success: true,
        message: "Donor permanently deleted"
      });
    }

  } catch (error) {
    console.error("Error deleting donor:", error);
    res.status(500).json({ success: false, message: "Error deleting donor", error: error.message });
  }
};

export const getDeletedDonors = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [deletedDonors, total] = await Promise.all([
      Donor.find({ deleted: true })
        .select('-password -__v')
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Donor.countDocuments({ deleted: true })
    ]);

    res.status(200).json({
      success: true,
      deletedDonors,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("❌ getDeletedDonors Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching deleted donors",
      error: error.message
    });
  }
};

export const restoreDonor = async (req, res) => {
  try {
    const { donorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      return res.status(400).json({ success: false, message: "Invalid donor ID" });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    donor.deleted = false;
    donor.deletedAt = null;
    donor.deletedBy = null;
    donor.deletionReason = null;
    await donor.save();

    res.status(200).json({
      success: true,
      message: "Donor restored successfully"
    });

  } catch (error) {
    console.error("❌ restoreDonor Error:", error);
    res.status(500).json({
      success: false,
      message: "Error restoring donor",
      error: error.message
    });
  }
};

export const getLastAdminAction = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;

    console.log("🔔 Fetching notifications for donor:", donorId);

    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const donor = await Donor.findById(donorId).select(
      'lastAdminAction notifications eligibilityHistory deleted deletedAt deletionReason'
    );

    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    console.log("✅ Notifications fetched:", {
      lastAction: donor.lastAdminAction,
      notificationCount: donor.notifications?.length || 0
    });

    res.status(200).json({
      success: true,
      lastAction: donor.lastAdminAction || null,
      notifications: donor.notifications || [],
      unreadCount: (donor.notifications || []).filter(n => n.status === 'unread').length,
      deleted: donor.deleted || false,
      deletedAt: donor.deletedAt || null,
      deletionReason: donor.deletionReason || null
    });

  } catch (error) {
    console.error("❌ getLastAdminAction Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message
    });
  }
};

// Add to donorController.js if missing

export const toggleDonorEligibility = async (req, res) => {
  try {
    const { donorId } = req.params;
    const { eligibleToDonate, reason } = req.body;
    const adminId = req.admin?._id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      return res.status(400).json({ success: false, message: "Invalid donor ID" });
    }

    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: "Reason required" });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    donor.eligibleToDonate = eligibleToDonate === true;

    if (!donor.eligibilityHistory) donor.eligibilityHistory = [];
    donor.eligibilityHistory.push({
      previousStatus: !eligibleToDonate,
      newStatus: eligibleToDonate,
      changedBy: adminId,
      changedAt: new Date(),
      reason: reason
    });

    // ✅ NEW: Update lastAdminAction
    const actionType = eligibleToDonate === true ? 'eligible' : 'ineligible';
    donor.lastAdminAction = {
      actionType: actionType,
      reason: reason,
      performedBy: adminId,
      performedAt: new Date(),
      message: "..."
    };

    // ✅ NEW: Add to notifications
    if (!donor.notifications) donor.notifications = [];
    donor.notifications.push({
      type: actionType,
      title: "...",
      message: "...",
      reason: reason,
      status: 'unread',
      createdAt: new Date()
    });

    // ✅ NEW: Console logs
    console.log("✅ Updated lastAdminAction");
    console.log("📢 Added to notifications");

    await donor.save();

    const updatedDonor = await Donor.findById(donorId);
    console.log("✅ Verified - actionType:", updatedDonor.lastAdminAction?.actionType);

    res.status(200).json({
      success: true,
      message: `Donor marked as ${eligibleToDonate ? 'eligible' : 'ineligible'}`,
      donor
    });
  } catch (error) {
    console.error("Error toggling eligibility:", error);
    res.status(500).json({ success: false, message: "Error updating eligibility", error: error.message });
  }
};

export const markNotificationsAsRead = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;

    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    // Mark all as read
    if (donor.notifications && donor.notifications.length > 0) {
      donor.notifications.forEach(notification => {
        notification.status = 'read';
      });
    }

    await donor.save();

    res.status(200).json({
      success: true,
      message: "Notifications marked as read",
      unreadCount: 0
    });

  } catch (error) {
    console.error("❌ markNotificationsAsRead Error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking notifications as read",
      error: error.message
    });
  }
};

// ============================================================================
// 📅 SCHEDULE DONATION APPOINTMENT
// ============================================================================
export const scheduleDonation = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;
    const { campId, scheduledDate, scheduledTime, notes } = req.body;

    console.log("📅 Scheduling donation appointment");
    console.log({
      donorId,
      campId,
      scheduledDate,
      scheduledTime,
      notes
    });

    // ✅ Validation
    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!campId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Camp, date, and time are required"
      });
    }

    // ✅ Find donor
    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    // ✅ Check if donor is eligible
    if (!donor.eligibleToDonate) {
      return res.status(403).json({
        success: false,
        message: "You are not eligible to donate at this time"
      });
    }

    // ✅ Find blood camp
    const camp = await BloodCamp.findById(campId);
    if (!camp) {
      return res.status(404).json({ success: false, message: "Blood camp not found" });
    }

    // ✅ Create donation appointment
    if (!donor.donationAppointments) {
      donor.donationAppointments = [];
    }

    const appointment = {
      _id: new mongoose.Types.ObjectId(),
      campId: campId,
      campName: camp.campName,
      location: camp.location,
      scheduledDate: new Date(scheduledDate),
      scheduledTime: scheduledTime,
      notes: notes,
      status: 'scheduled',
      createdAt: new Date()
    };

    donor.donationAppointments.push(appointment);
    await donor.save();

    console.log("✅ Donation appointment scheduled successfully");

    res.status(200).json({
      success: true,
      message: "Donation appointment scheduled successfully",
      appointment: {
        campName: camp.campName,
        location: camp.location,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime
      }
    });

  } catch (error) {
    console.error("❌ Schedule donation error:", error);
    res.status(500).json({
      success: false,
      message: "Error scheduling donation",
      error: error.message
    });
  }
};

export const getDonationCamps = async (req, res) => {
  try {
    const camps = await BloodCamp.find({ status: 'Ongoing' })
      .select('campName location contactNumber date startTime endTime capacity');

    res.status(200).json({
      success: true,
      camps
    });

  } catch (error) {
    console.error("Error fetching camps:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blood camps",
      error: error.message
    });
  }
};


export const getUpcomingAppointments = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;

    console.log("📅 Fetching upcoming appointments for donor:", donorId);

    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const donor = await Donor.findById(donorId)
      .select('donationAppointments fullName email');

    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    // Filter only scheduled appointments and sort by date
    const upcomingAppointments = (donor.donationAppointments || [])
      .filter(apt => apt.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    console.log("✅ Found", upcomingAppointments.length, "upcoming appointments");

    res.status(200).json({
      success: true,
      appointments: upcomingAppointments,
      total: upcomingAppointments.length
    });

  } catch (error) {
    console.error("❌ Error fetching appointments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching appointments",
      error: error.message
    });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const donorId = req.donor?._id || req.donor?.id;

    console.log("❌ Cancelling appointment:", appointmentId);
    console.log("   Reason:", reason);

    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required"
      });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    // Find appointment
    const appointment = donor.donationAppointments.find(
      apt => apt._id.toString() === appointmentId
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel appointment with status: ${appointment.status}`
      });
    }

    // Update appointment status
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason;

    await donor.save();

    console.log("✅ Appointment cancelled successfully");

    // TODO: Send cancellation email to donor and facility

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      appointment: {
        appointmentId: appointment._id,
        campName: appointment.campName,
        status: appointment.status
      }
    });

  } catch (error) {
    console.error("❌ Cancel appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling appointment",
      error: error.message
    });
  }
};


export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newCampId, newDate, newTime, reason } = req.body;
    const donorId = req.donor?._id || req.donor?.id;

    console.log("🔄 Rescheduling appointment:", appointmentId);

    if (!donorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!newCampId || !newDate || !newTime || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    const appointment = donor.donationAppointments.find(
      apt => apt._id.toString() === appointmentId
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule ${appointment.status} appointment`
      });
    }

    const newCamp = await BloodCamp.findById(newCampId);
    if (!newCamp) {
      return res.status(404).json({ success: false, message: "Camp not found" });
    }

    // Store old details
    const oldDetails = {
      campName: appointment.campName,
      scheduledDate: appointment.scheduledDate,
      scheduledTime: appointment.scheduledTime
    };

    // Update appointment
    appointment.campId = newCampId;
    appointment.campName = newCamp.campName;
    appointment.location = newCamp.location;
    appointment.contactNumber = newCamp.contactNumber;
    appointment.scheduledDate = new Date(newDate);
    appointment.scheduledTime = newTime;

    // Add to reschedule history
    if (!appointment.rescheduleHistory) {
      appointment.rescheduleHistory = [];
    }

    appointment.rescheduleHistory.push({
      oldCampName: oldDetails.campName,
      oldDate: oldDetails.scheduledDate,
      oldTime: oldDetails.scheduledTime,
      reason: reason,
      rescheduledAt: new Date()
    });

    appointment.rescheduledCount = (appointment.rescheduledCount || 0) + 1;

    await donor.save();

    console.log("✅ Appointment rescheduled successfully");

    res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully",
      appointment: {
        campName: appointment.campName,
        newDate: newDate,
        newTime: newTime
      }
    });

  } catch (error) {
    console.error("❌ Reschedule error:", error);
    res.status(500).json({
      success: false,
      message: "Error rescheduling appointment",
      error: error.message
    });
  }
};

export const generateCertificate = async (req, res) => {
  try {
    const { donationId } = req.params;
    const donorId = req.donor?._id || req.donor?.id;

    console.log("📜 Generating certificate for donation:", donationId);

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    const donation = donor.donationHistory.find(
      d => d._id.toString() === donationId
    );

    if (!donation) {
      return res.status(404).json({ success: false, message: "Donation not found" });
    }

    // Return certificate data
    res.status(200).json({
      success: true,
      certificate: {
        donorName: donor.fullName,
        donorEmail: donor.email,
        donationDate: donation.donationDate,
        bloodGroup: donation.bloodGroup,
        quantity: donation.quantity,
        donationId: donation._id,
        remarks: donation.remarks
      }
    });

  } catch (error) {
    console.error("❌ Certificate generation error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating certificate",
      error: error.message
    });
  }
};

export const getDonationStats = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    const totalDonations = donor.donationHistory?.length || 0;
    const totalUnits = (donor.donationHistory || []).reduce((sum, d) => sum + (d.quantity || 0), 0);
    const livesImpacted = totalUnits * 3; // Approx 3 lives per unit

    // Determine donor level
    let donorLevel = 'Starter';
    if (totalUnits >= 1 && totalUnits < 5) donorLevel = 'Bronze';
    if (totalUnits >= 5 && totalUnits < 10) donorLevel = 'Silver';
    if (totalUnits >= 10 && totalUnits < 20) donorLevel = 'Gold';
    if (totalUnits >= 20) donorLevel = 'Platinum';

    res.status(200).json({
      success: true,
      stats: {
        totalDonations,
        totalUnits,
        livesImpacted,
        donorLevel
      }
    });

  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message
    });
  }
};

// ============================================================================
// 📈 GET ANALYTICS DATA
// ============================================================================
export const getAnalyticsData = async (req, res) => {
  try {
    const donorId = req.donor?._id || req.donor?.id;

    const donor = await Donor.findById(donorId);
    if (!donor) {
      return res.status(404).json({ success: false, message: "Donor not found" });
    }

    // Group donations by month
    const analyticsData = [];
    const donationsByMonth = {};

    (donor.donationHistory || []).forEach(donation => {
      const date = new Date(donation.donationDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!donationsByMonth[monthKey]) {
        donationsByMonth[monthKey] = { donations: 0, units: 0 };
      }
      donationsByMonth[monthKey].donations += 1;
      donationsByMonth[monthKey].units += donation.quantity || 0;
    });

    // Convert to chart format
    Object.entries(donationsByMonth).forEach(([month, data]) => {
      analyticsData.push({
        date: month,
        donations: data.donations,
        units: data.units
      });
    });

    res.status(200).json({
      success: true,
      analyticsData: analyticsData.sort((a, b) => a.date.localeCompare(b.date))
    });

  } catch (error) {
    console.error("❌ Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching analytics",
      error: error.message
    });
  }
};