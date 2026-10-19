import { Router } from "express";

const router = Router();
const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8000";

router.get("/", async (_req, res) => {
  let mlService: "up" | "down" = "down";
  let modelVersion: string | null = null;
  try {
    const r = await fetch(`${ML_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      const data = (await r.json()) as { modelVersion?: string };
      mlService = "up";
      modelVersion = data.modelVersion ?? null;
    }
  } catch {
    /* ML service unreachable */
  }
  res.json({ status: "ok", mlService, modelVersion });
});

export default router;