import express from "express";
import { 
  getDonorCamps, 
  getDonorHistory, 
  getDonorProfile, 
  getDonorStats, 
  updateDonorProfile,
  // ✅ NEW: Admin endpoints
  getAllDonorsAdmin,
  toggleDonorEligibility,
  approveDonor,
  rejectDonor,
  deleteDonor,
  getDeletedDonors,
  restoreDonor,
  getLastAdminAction,
  markNotificationsAsRead,
  scheduleDonation,
  getDonationCamps,
  getUpcomingAppointments,
  cancelAppointment,
  rescheduleAppointment,
  generateCertificate,
  getDonationStats,
  getAnalyticsData
} from "../controllers/donorController.js";
import { protectDonor } from "../middlewares/donorMiddleware.js";
import { protectAdmin } from "../middlewares/adminMiddleware.js"; // ✅ NEW: Import admin middleware

const router = express.Router();

// ============================================================================
// 👤 DONOR ROUTES (Protected by protectDonor middleware)
// ============================================================================
router.get("/notifications", protectDonor, getLastAdminAction);
router.patch("/notifications/read", protectDonor, markNotificationsAsRead);
router.get("/profile", protectDonor, getDonorProfile)
router.put("/profile", protectDonor, updateDonorProfile);
router.get("/camps", protectDonor, getDonorCamps);
router.get("/history", protectDonor, getDonorHistory);
router.get("/stats", protectDonor, getDonorStats);
// ============================================================================
// ✅ NEW: ADMIN ROUTES (Protected by protectAdmin middleware)
// ============================================================================

// Get all donors (with filters: search, bloodGroup, approvalStatus)
// GET /api/donors?search=john&bloodGroup=O+&approvalStatus=pending&page=1&limit=50
router.get(
  "/",
  protectAdmin,
  getAllDonorsAdmin
);
router.get("/admin/all-donors", protectAdmin, getAllDonorsAdmin);

// Get deleted donors (for audit/recovery)  
// GET /api/donors/deleted?page=1&limit=50
router.get(
  "/deleted",
  protectAdmin,
  getDeletedDonors
);

// Approve a donor
// PATCH /api/donors/:donorId/approve
router.patch(
  "/:donorId/approve",
  protectAdmin,
  approveDonor
);

router.patch(
  "/:donorId/toggle-eligibility",
  protectAdmin,
  toggleDonorEligibility
);

// Reject a donor
// PATCH /api/donors/:donorId/reject
// Body: { reason: "Does not meet health criteria" }
router.patch(
  "/:donorId/reject",
  protectAdmin,
  rejectDonor
);

// Delete a donor (soft delete by default)
// DELETE /api/donors/:donorId
// Body: { soft: true, reason: "Duplicate account" }
router.delete(
  "/:donorId",
  protectAdmin,
  deleteDonor
);

// Restore a soft-deleted donor
// PATCH /api/donors/:donorId/restore
router.patch(
  "/:donorId/restore",
  protectAdmin,
  restoreDonor
);

router.post("/schedule-donation", protectDonor, scheduleDonation);
router.get("/camps-schedule", protectDonor, getDonationCamps);

router.get("/appointments/upcoming", protectDonor, getUpcomingAppointments);
router.patch("/appointments/:appointmentId/cancel", protectDonor, cancelAppointment);
router.patch("/appointments/:appointmentId/reschedule", protectDonor, rescheduleAppointment);
router.get("/certificate/:donationId", protectDonor, generateCertificate);
router.get("/stats", protectDonor, getDonationStats);
router.get("/analytics", protectDonor, getAnalyticsData);
export default router;
