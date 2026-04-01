import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import clientRoutes from "./routes/clients";
import projectRoutes from "./routes/projects";
import documentRoutes from "./routes/documents";
import documentFieldRoutes from "./routes/documentFields";
import publicRoutes from "./routes/public";
import invoiceRoutes from "./routes/invoices";
import workspaceRoutes from "./routes/workspace";
import morgan from "morgan";

dotenv.config();

console.log(process.env.AWS_S3_BUCKET);
const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3001",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "freelanceflow-api" });
});

app.use("/auth", authRoutes);
app.use("/clients", clientRoutes);
app.use("/projects", projectRoutes);
app.use("/documents", documentRoutes);
app.use("/documents", documentFieldRoutes);
app.use("/public", publicRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/workspace", workspaceRoutes);

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
