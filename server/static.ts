import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // For unknown /api/ routes return JSON 404 — never serve HTML for API paths
  app.use("/api/{*path}", (_req, res) => {
    res.status(404).json({ message: "Route API introuvable" });
  });

  // SPA fallback: serve index.html for all non-API paths
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
