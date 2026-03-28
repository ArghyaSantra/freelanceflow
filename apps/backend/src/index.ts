import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "freelanceflow-api" });
});

app.use("/auth", authRoutes);
app.use(errorHandler);

const start = async (): Promise<void> => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 API running on port ${PORT}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    const forceExit = setTimeout(() => process.exit(1), 30000);
    server.close(() => {
      clearTimeout(forceExit);
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
