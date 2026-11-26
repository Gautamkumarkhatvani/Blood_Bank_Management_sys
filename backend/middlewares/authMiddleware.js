// middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import Donor from "../models/donorModel.js";
import Admin from "../models/adminModel.js";
import Facility from "../models/facilityModel.js";
import multer from "multer";
import path from "path";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/medical-certificates");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /pdf|jpg|jpeg|png/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);

  if (ext && mime) cb(null, true);
  else cb(new Error("Only PDF or image files allowed"));
};

export const uploadMedicalCertificate = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user =
        (await Donor.findById(decoded.id).select("-password")) ||
        (await Admin.findById(decoded.id).select("-password")) ||
        (await Facility.findById(decoded.id).select("-password"));

      if (!user)
        return res.status(401).json({ message: "User not found or unauthorized" });

      req.user = { id: user._id, role: decoded.role };
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(401).json({ message: "Token invalid or expired" });
    }
  } else {
    res.status(401).json({ message: "No token provided" });
  }
};
