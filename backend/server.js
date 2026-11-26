import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import donorRoutes from "./routes/donorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import facilityRoutes from "./routes/facilityRoutes.js";
import contactRoutes from "./routes/contactRoutes.js"
import http from "http";
import { Server } from "socket.io";

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use(cors({
  origin: "http://localhost:5173", // or 3000
  credentials: true,
}));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // frontend URL
    methods: ["GET", "POST"],
  },
});


app.set("io", io);
// 🧩 Routes

app.use("/api/auth", authRoutes);


app.use("/api/donor", donorRoutes);

app.use("/api/facility", facilityRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/contact", contactRoutes());


import bloodLabRoutes from "./routes/bloodLabRoutes.js";
app.use("/api/blood-lab", bloodLabRoutes);


import hospitalRoutes from "./routes/hospitalRoutes.js";
app.use("/api/hospital", hospitalRoutes);


io.on("connection", (socket) => {
  console.log("Admin connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Admin disconnected:", socket.id);
  });
});


// 🗄️ DB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("MongoDB Error ❌", err));

const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
server.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
