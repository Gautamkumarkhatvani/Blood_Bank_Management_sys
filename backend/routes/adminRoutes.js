import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getAllFacilities,
  approveFacility,
  rejectFacility,
  getDashboardStats,
  getAllDonors,
  getAllCamps,            // ADD THIS
  deleteCampAdmin,        // ADD THIS
  getGlobalDonationHistory // ADD THIS
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/facilities", protect, getAllFacilities);
router.put("/facility/approve/:id", protect, approveFacility);
router.put("/facility/reject/:id", protect, rejectFacility);
router.get("/dashboard", protect, getDashboardStats);
router.get("/donors", getAllDonors);

// NEW Admin Routes
router.get("/camps", protect, getAllCamps);
router.delete("/camps/:id", protect, deleteCampAdmin);
router.get("/history", protect, getGlobalDonationHistory);

export default router;
