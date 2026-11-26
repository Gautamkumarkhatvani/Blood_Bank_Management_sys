import Donor from "../models/donorModel.js";
import Facility from "../models/facilityModel.js";
import BloodCamp from "../models/bloodCampModel.js"; // ADD THIS

// 🧩 Get Dashboard Overview Stats
export const getDashboardStats = async (req, res) => {
  try {
    const totalDonors = await Donor.countDocuments();
    const totalFacilities = await Facility.countDocuments();
    const pendingFacilities = await Facility.countDocuments({ status: "pending" });
    const approvedFacilities = await Facility.countDocuments({ status: "approved" });

    // Count total donations across all donors
    const donors = await Donor.find({}, "donationHistory");
    const totalDonations = donors.reduce(
      (sum, donor) => sum + (donor.donationHistory?.length || 0),
      0
    );

    const activeDonors = await Donor.countDocuments({ isEligible: true });

    res.status(200).json({
      totalDonors,
      totalFacilities,
      approvedFacilities,
      pendingFacilities,
      totalDonations,
      activeDonors,
      upcomingCamps: 3, // Placeholder
    });
  } catch (err) {
    console.error("Admin Stats Error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

// 🧍 Get All Donors
export const getAllDonors = async (req, res) => {
  try {
    // Note: This function was present in your code block but not used in the router
    const donors = await Donor.find().select("-password");
    res.status(200).json({ donors });
  } catch (err) {
    res.status(500).json({ message: "Error fetching donors" });
  }
};

// 🏥 Get All Facilities (Pending + Approved)
export const getAllFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find();
    res.status(200).json({ facilities });
  } catch (err) {
    res.status(500).json({ message: "Error fetching facilities" });
  }
};

// ✅ Approve a Facility
export const approveFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ message: "Facility not found" });

    facility.status = "approved";

    // HISTORY LOGIC DELETED

    await facility.save();

    res.status(200).json({ message: "Facility approved", facility });
  } catch (err) {
    console.error("Facility Approval Error:", err);
    res.status(500).json({ message: "Error approving facility" });
  }
};

// ❌ Reject / Update Facility Status to Rejected
export const rejectFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ message: "Facility not found" });

    const { rejectionReason } = req.body;
    if (!rejectionReason) return res.status(400).json({ message: "Rejection reason is required." });

    facility.status = "rejected";
    facility.rejectionReason = rejectionReason;

    // HISTORY LOGIC DELETED

    await facility.save();

    res.status(200).json({ message: "Facility rejected and status updated", facility });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error rejecting facility" });
  }
};

export const verifyDonorMedical = async (req, res) => {
  const { donorId, status } = req.body; // approved / rejected

  const donor = await Donor.findById(donorId);
  if (!donor) return res.status(404).json({ message: "Donor not found" });

  donor.medicalVerified = status === "approved";
  donor.medicalVerificationStatus = status;

  await donor.save();

  res.json({
    success: true,
    message: `Medical certificate ${status}`
  });
};

// ============================================================================
// 🏕️ NEW: Admin Camp Management
// ============================================================================

export const getAllCamps = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [camps, total] = await Promise.all([
      BloodCamp.find(filter)
        .populate('hospital', 'name email phone')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BloodCamp.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      camps,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Admin getAllCamps Error:", error);
    res.status(500).json({ success: false, message: "Error fetching camps", error: error.message });
  }
};

export const deleteCampAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCamp = await BloodCamp.findByIdAndDelete(id);

    if (!deletedCamp) {
      return res.status(404).json({ success: false, message: "Camp not found" });
    }

    res.status(200).json({ success: true, message: "Camp deleted successfully by admin" });
  } catch (error) {
    console.error("Admin deleteCamp Error:", error);
    res.status(500).json({ success: false, message: "Error deleting camp", error: error.message });
  }
};

// ============================================================================
// 📜 NEW: Admin Global Donation History
// ============================================================================

export const getGlobalDonationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 1. Find relevant donors first (filtering by search if needed)
    let donorFilter = {};
    if (search) {
      donorFilter = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // 2. Aggregate all donations
    // Since donationHistory is an array inside Donor documents, we need to unwind it.
    const pipeline = [
      { $match: donorFilter },
      { $unwind: "$donationHistory" },
      { $sort: { "donationHistory.donationDate": -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      // Lookup facility details for each donation
      {
        $lookup: {
          from: "facilities",
          localField: "donationHistory.facility",
          foreignField: "_id",
          as: "facilityDetails"
        }
      },
      {
        $project: {
          _id: 0,
          donationId: "$donationHistory._id",
          donorName: "$fullName",
          donorEmail: "$email",
          donationDate: "$donationHistory.donationDate",
          bloodGroup: "$donationHistory.bloodGroup", // Use record's blood group
          quantity: "$donationHistory.quantity",
          facilityName: { $arrayElemAt: ["$facilityDetails.name", 0] },
          status: "$donationHistory.verified"
        }
      }
    ];

    const history = await Donor.aggregate(pipeline);

    // Count total donations (approximate for pagination logic with search, exact without)
    // Counting unwound documents with filter is expensive, doing a simplified count 
    // or just total donations count if no search.
    let total = 0;
    if (!search) {
      const donors = await Donor.find({}, 'donationHistory');
      total = donors.reduce((acc, curr) => acc + (curr.donationHistory ? curr.donationHistory.length : 0), 0);
    } else {
      // For search, we might just return the count of pages we found or 
      // do a separate aggregation count which is heavy. Let's simplify for now
      // and just return length of current page as total if it's the last page, or more.
      // Actually, let's do a proper count aggregation.
      const countPipeline = [
        { $match: donorFilter },
        { $unwind: "$donationHistory" },
        { $count: "total" }
      ];
      const countResult = await Donor.aggregate(countPipeline);
      total = countResult.length > 0 ? countResult[0].total : 0;
    }

    res.status(200).json({
      success: true,
      history,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Admin getGlobalDonationHistory Error:", error);
    res.status(500).json({ success: false, message: "Error fetching history", error: error.message });
  }
};
