import express from "express";
import {
  getAllLabs,
  getFacilityDashboard,
  getProfile,
  updateProfile,
  deleteFacility,
  getDeletedFacilities,
  restoreFacility,
  getAllFacilitiesAdmin,
  getScheduledAppointments,
  recordDonation
} from "../controllers/facilityController.js";
import { protectFacility } from "../middlewares/facilityMiddleware.js";
import { protectAdmin } from "../middlewares/adminMiddleware.js";


const router = express.Router();

/**
 * @route   GET /api/facility/dashboard
 * @desc    Get facility dashboard stats
 * @access  Private (facility only)
 */
router.get("/dashboard", protectFacility, getFacilityDashboard);

/**
 * @route   GET /api/facility/profile
 * @desc    Get facility profile details
 * @access  Private
 */
router.get("/profile", protectFacility, getProfile);

/**
 * @route   PUT /api/facility/profile
 * @desc    Update facility profile
 * @access  Private
 */
router.put("/profile", protectFacility, updateProfile);

router.get("/labs", protectFacility , getAllLabs);

router.get("/admin/all-facilities", protectAdmin, getAllFacilitiesAdmin);

router.delete("/:facilityId", protectAdmin, deleteFacility);
router.get("/deleted", protectAdmin, getDeletedFacilities);
router.patch("/:facilityId/restore", protectAdmin, restoreFacility);

router.get("/scheduled-appointments", protectFacility, getScheduledAppointments);

router.patch("/donations/:appointmentId/complete", protectFacility, recordDonation);
export default router;
