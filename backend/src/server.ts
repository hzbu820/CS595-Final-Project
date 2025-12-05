import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import eventsRouter from "./routes/events.js";
import complianceRouter from './routes/compliance.js'; 

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.use("/api", eventsRouter);
app.use("/api", complianceRouter);

app.listen(process.env.PORT ?? 4000, () =>
  console.log(`backend listening on :${process.env.PORT ?? 4000}`)
);
