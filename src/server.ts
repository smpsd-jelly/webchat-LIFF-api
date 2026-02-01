import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import loginAuthRoutes from "./routes/loginAuth";
import authUserRoutes from "./routes/authUser";
import lineAuthRoutes from "./routes/lineAuth";
import lineOaInfoRoutes from "./routes/lineOaInfo";
import messagesRoutes from "./routes/messages";
import adminInboxRoutes from "./routes/adminInbox";
import lineWebhookRoutes from "./routes/lineWebhook";
import messagesReadRoutes from "./routes/messagesRead";

import { initDb } from "./db";

dotenv.config();

const app = express();

const allowOrigins = [
  process.env.WEB_ORIGIN,   
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[];


app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

app.options(/.*/, cors());

app.use(
  express.json({
    limit: "2mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(cookieParser());


app.use("/auth", loginAuthRoutes);
app.use("/auth", authUserRoutes); 
app.use("/auth", lineAuthRoutes)
app.use("/auth", lineOaInfoRoutes);

app.use("/", messagesRoutes);
app.use("/", messagesReadRoutes);
app.use("/", adminInboxRoutes);

app.use("/", lineWebhookRoutes);

async function bootstrap() {
  await initDb();

  const PORT = Number(process.env.PORT || 4000);
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((e) => {
  console.error("bootstrap error:", e);
  process.exit(1);
});