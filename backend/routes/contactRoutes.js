import express from "express";
import Contact from "../models/contactModel.js";

const contactRoute = () => {
  const router = express.Router();

  /**
   * @route   POST /api/contact
   * @desc    Save contact form data
   * @access  Public
   */
  router.post("/", async (req, res) => {
    try {
      const { name, email, phone, message } = req.body;

      if (!name || !email || !phone || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const contact = await Contact.create({
        name,
        email,
        phone,
        message,
      });
      
      // 🔴 Emit real-time notification
      const io = req.app.get("io");
      io.emit("newContact", {
        name,
        email,
        message,
        time: new Date(),
      });

      res.status(201).json({
        success: true,
        message: "Message submitted successfully",
        data: contact,
      });
    } catch (error) {
      res.status(500).json({ message: "Server Error" });
    }
  });

  /**
   * @route   GET /api/contact
   * @desc    Get all contact messages (Admin)
   * @access  Private
   */
  router.get("/", async (req, res) => {
    try {
      const contacts = await Contact.find().sort({ createdAt: -1 });
      res.status(200).json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Server Error" });
    }
  });

  return router;
};

export default contactRoute;
