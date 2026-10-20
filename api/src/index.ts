import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import health from "./routes/health";
import { districtsRouter } from "./routes/districts";
import { kpisRouter } from "./routes/kpis";
import { scoreRouter, templateRouter } from "./routes/score";
import { exportRouter } from "./routes/export";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173", exposedHeaders: ["Content-Disposition"] }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use("/api/health", health);
app.use("/api/districts", districtsRouter);
app.use("/api/kpis", kpisRouter);
app.use("/api/score", scoreRouter);
app.use("/api/template", templateRouter);
app.use("/api/export", exportRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

// Body-parser and unexpected errors, in the same { error: { code, message } } shape.
app.use((err: { status?: number; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500;
  const code = status === 413 ? "PAYLOAD_TOO_LARGE" : status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR";
  if (status === 500) console.error(err);
  res.status(status).json({ error: { code, message: status === 500 ? "Internal server error" : err.message } });
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));