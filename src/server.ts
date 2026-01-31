import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import userAuthRoutes from "./routes/userAuth";
import authUserRoutes from "./routes/authUser";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.WEB_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());


app.use("/auth/user", userAuthRoutes);
app.use("/auth", authUserRoutes); 

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
