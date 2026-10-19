import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import health from "./routes/health";
import { districtsRouter } from "./routes/districts";
import { kpisRouter } from "./routes/kpis";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use("/api/health", health);
app.use("/api/districts", districtsRouter);
app.use("/api/kpis", kpisRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));