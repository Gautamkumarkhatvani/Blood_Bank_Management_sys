import Facility from "../models/facilityModel.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
/**
 * @desc Get facility profile
 * @route GET /api/facility/profile
 */
export const getProfile = async (req, res) => {
  try {
    const facility = await Facility.findById(req.user.id)
      .select("-password -__v")
      .lean();

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    res.status(200).json({
      success: true,
      facility
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile"
    });
  }
};

/**
 * @desc Update facility profile
 * @route PUT /api/facility/profile
 */
export const updateProfile = async (req, res) => {
  const session = await Facility.startSession();
  session.startTransaction();

  try {
    console.log("📝 Facility profile update request:", {
      userId: req.user._id,
      updates: Object.keys(req.body)
    });

    const updates = { ...req.body };
    // The user ID is expected to be attached to the request object via middleware (e.g., auth middleware)
    const facilityId = req.user._id;

    // Validate facility exists
    const existingFacility = await Facility.findById(facilityId).session(session);
    if (!existingFacility) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    // Define allowed fields for update by the facility user
    const allowedFields = [
      "name", "phone", "emergencyContact", "operatingHours",
      "services", "description", "website", "contactPerson",
      "password" // Allowing password update via the same endpoint
    ];

    // Filter updates to only include allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && key !== "password") {
        filteredUpdates[key] = updates[key];
      }
    });

    // Handle address updates separately to merge with existing data
    if (updates.address && typeof updates.address === 'object') {
      // Merge new address fields with existing ones to avoid accidental deletion
      filteredUpdates.address = {
        ...existingFacility.address.toObject(), // Use toObject() for Mongoose subdocuments
        ...updates.address
      };
    }

    // Handle password update (if provided)
    if (updates.password) {
      if (updates.password.length < 6) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long"
        });
      }
      const salt = await bcrypt.genSalt(12);
      filteredUpdates.password = await bcrypt.hash(updates.password, salt);
    }

    // Update facility in MongoDB
    const updatedFacility = await Facility.findByIdAndUpdate(
      facilityId,
      {
        ...filteredUpdates,
        // Log the profile update event in history
        $push: {
          history: {
            eventType: "Profile Update",
            description: "Facility profile updated by user",
            date: new Date(),
          }
        }
      },
      {
        new: true,
        runValidators: true,
        session,
        // Exclude sensitive fields from the returned object
        select: "-password -__v"
      }
    );

    // Trim history if too long (optional safety feature)
    if (updatedFacility.history.length > 50) {
      updatedFacility.history = updatedFacility.history.slice(-50);
      await updatedFacility.save({ session });
    }

    await session.commitTransaction();

    console.log("✅ Facility profile updated successfully:", updatedFacility._id);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      facility: updatedFacility
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("🚨 Update Facility Profile Error:", error);

    let errorMessage = "Failed to update profile";
    let validationErrors = {};

    if (error.name === 'ValidationError') {
      // Format Mongoose validation errors for frontend consumption
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      errorMessage = "Validation failed: Please check your input.";
    }

    res.status(400).json({ // Use 400 for validation errors
      success: false,
      message: errorMessage,
      errors: validationErrors, // Send detailed errors to frontend
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};
/**
 * @desc Facility dashboard overview
 * @route GET /api/facility/dashboard
 */
export const getFacilityDashboard = async (req, res) => {
  try {
    const facility = await Facility.findById(req.user._id)
      .select("name history facilityType")
      .lean();

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: "Facility not found"
      });
    }

    // Calculate stats (you'll replace these with actual model queries)
    const totalCamps = facility.history.filter(h => h.eventType === "Blood Camp").length;
    const recentHistory = facility.history
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    const dashboardData = {
      totalCamps,
      upcomingCamps: 2, // Replace with: await Camp.countDocuments({ facility: facilityId, date: { $gte: new Date() } })
      bloodSlots: 10, // Replace with: await Slot.countDocuments({ facility: facilityId, status: 'available' })
      activeRequests: 4, // Replace with: await Request.countDocuments({ facility: facilityId, status: 'pending' })
      totalHistory: facility.history.length,
      recentHistory,
    };

    res.status(200).json({
      success: true,
      facility: facility.name,
      facilityType: facility.facilityType,
      stats: dashboardData,
    });
  } catch (error) {
    console.error("Facility Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data"
    });
  }
};

export const getAllLabs = async (req, res) => {
  try {
    const labs = await Facility.find({ 
      facilityType: "blood-lab", 
      status: "approved" 
    }).select("name email phone address operatingHours");

    res.status(200).json({ 
      success: true, 
      labs 
    });
  } catch (error) {
    console.error("Get Labs Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching blood labs" 
    });
  }
}

export const deleteFacility = async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { soft = true, reason } = req.body;
    const adminId = req.admin?._id || req.user?._id;

    console.log("🗑️ Deleting facility:", facilityId);
    console.log("   Soft delete:", soft);
    console.log("   Reason:", reason);

    // ✅ Validation
    if (!mongoose.Types.ObjectId.isValid(facilityId)) {
      return res.status(400).json({ success: false, message: "Invalid facility ID" });
    }

    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: "Deletion reason required" });
    }

    // ✅ Find facility
    const facility = await Facility.findById(facilityId);
    if (!facility) {
      return res.status(404).json({ success: false, message: "Facility not found" });
    }

    console.log("✅ Facility found:", facility.facilityName);

    // ✅ SOFT DELETE
    if (soft === true || soft !== false) {
      facility.deleted = true;
      facility.deletedAt = new Date();
      facility.deletedBy = adminId;
      facility.deletionReason = reason;

      // ✅ Store admin action
      facility.lastAdminAction = {
        actionType: 'deleted',
        reason: reason,
        performedBy: adminId,
        performedAt: new Date(),
        message: `Facility has been deleted. Reason: ${reason}`
      };

      console.log("💾 Saving facility...");
      await facility.save();
      console.log("✅ Facility soft-deleted successfully");

      return res.status(200).json({
        success: true,
        message: "Facility soft-deleted successfully",
        deletedFacility: {
          id: facility._id,
          facilityName: facility.facilityName,
          reason: reason
        }
      });
    } 
    // ✅ HARD DELETE
    else {
      await Facility.findByIdAndDelete(facilityId);
      console.log("✅ Facility permanently deleted");

      return res.status(200).json({
        success: true,
        message: "Facility permanently deleted"
      });
    }

  } catch (error) {
    console.error("❌ Error deleting facility:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting facility",
      error: error.message
    });
  }
};

// ============================================================================
// 🔍 GET ALL FACILITIES (Admin)
// ============================================================================
export const getAllFacilitiesAdmin = async (req, res) => {
  try {
    const { search, status, limit = 100, page = 1 } = req.query;

    const filter = { deleted: { $ne: true } };

    if (search) {
      filter.$or = [
        { facilityName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search } }
      ];
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [facilities, total] = await Promise.all([
      Facility.find(filter)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Facility.countDocuments(filter)
    ]);

    console.log("✅ Found", facilities.length, "facilities");

    res.status(200).json({
      success: true,
      facilities,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("❌ getAllFacilitiesAdmin Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching facilities",
      error: error.message
    });
  }
};

// ============================================================================
// 🗑️ GET DELETED FACILITIES
// ============================================================================
export const getDeletedFacilities = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log("🔍 Fetching deleted facilities...");

    const [deletedFacilities, total] = await Promise.all([
      Facility.find({ deleted: true })
        .select('-password -__v')
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Facility.countDocuments({ deleted: true })
    ]);

    console.log("✅ Found", deletedFacilities.length, "deleted facilities");

    res.status(200).json({
      success: true,
      deletedFacilities,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("❌ getDeletedFacilities Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching deleted facilities",
      error: error.message
    });
  }
};

// ============================================================================
// ↩️ RESTORE FACILITY
// ============================================================================
export const restoreFacility = async (req, res) => {
  try {
    const { facilityId } = req.params;

    console.log("↩️ Restoring facility:", facilityId);

    if (!mongoose.Types.ObjectId.isValid(facilityId)) {
      return res.status(400).json({ success: false, message: "Invalid facility ID" });
    }

    const facility = await Facility.findById(facilityId);
    if (!facility) {
      return res.status(404).json({ success: false, message: "Facility not found" });
    }

    // ✅ Restore
    facility.deleted = false;
    facility.deletedAt = null;
    facility.deletedBy = null;
    facility.deletionReason = null;

    await facility.save();

    console.log("✅ Facility restored successfully");

    res.status(200).json({
      success: true,
      message: "Facility restored successfully",
      facility
    });

  } catch (error) {
    console.error("❌ restoreFacility Error:", error);
    res.status(500).json({
      success: false,
      message: "Error restoring facility",
      error: error.message
    });
  }
};


export const recordDonation = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { bloodUnits, bloodGroup, remarks } = req.body;
    const facilityId = req.facility?._id || req.user?._id;

    console.log("✅ Recording donation:", appointmentId);

    if (!bloodUnits || !bloodGroup) {
      return res.status(400).json({
        success: false,
        message: "Blood units and blood group are required"
      });
    }

    // Find donor with this appointment
    const donor = await Donor.findOne({
      'donationAppointments._id': appointmentId
    });

    if (!donor) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const appointment = donor.donationAppointments.find(
      apt => apt._id.toString() === appointmentId
    );

    if (!appointment || appointment.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: "Invalid or already completed appointment"
      });
    }

    // Mark appointment as completed
    appointment.status = 'completed';
    appointment.completedAt = new Date();

    // Add to donation history
    if (!donor.donationHistory) {
      donor.donationHistory = [];
    }

    donor.donationHistory.push({
      donationDate: new Date(),
      facility: facilityId,
      bloodGroup: bloodGroup,
      quantity: bloodUnits,
      remarks: remarks || '',
      verified: true,
      appointmentId: appointmentId
    });

    // Update donor stats
    donor.lastDonationDate = new Date();
    donor.bloodGroup = bloodGroup;

    // Calculate next eligibility date (90 days later)
    const nextEligibleDate = new Date();
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);
    donor.nextEligibilityDate = nextEligibleDate;

    await donor.save();

    console.log("✅ Donation recorded successfully");

    res.status(200).json({
      success: true,
      message: "Donation recorded successfully",
      donation: {
        donorName: donor.fullName,
        bloodGroup: bloodGroup,
        units: bloodUnits,
        date: new Date().toLocaleDateString()
      }
    });

  } catch (error) {
    console.error("❌ Record donation error:", error);
    res.status(500).json({
      success: false,
      message: "Error recording donation",
      error: error.message
    });
  }
};

// Get scheduled appointments
export const getScheduledAppointments = async (req, res) => {
  try {
    console.log("📅 Fetching scheduled appointments...");

    // Find all donors with scheduled appointments
    const donors = await Donor.find({
      'donationAppointments.status': 'scheduled'
    }).select('fullName email bloodGroup donationAppointments');

    const appointments = [];
    donors.forEach(donor => {
      const scheduledApts = donor.donationAppointments.filter(apt => apt.status === 'scheduled');
      scheduledApts.forEach(apt => {
        appointments.push({
          _id: apt._id,
          donorId: donor._id,
          donorName: donor.fullName,
          donorEmail: donor.email,
          bloodGroup: donor.bloodGroup,
          campName: apt.campName,
          scheduledDate: apt.scheduledDate,
          scheduledTime: apt.scheduledTime,
          location: apt.location,
          notes: apt.notes
        });
      });
    });

    res.status(200).json({
      success: true,
      appointments: appointments,
      total: appointments.length
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