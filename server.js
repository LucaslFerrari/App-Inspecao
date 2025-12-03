import express from "express";
import cors from "cors";
import path from "path";
import apiRoutes from "./src/server/routes/index.js";
import { API_PORT, DIST_DIR, ROOT_DIR, STORAGE_DRIVER, UPLOADS_DIR, isProduction } from "./src/server/config/env.js";

const app = express();

if (!isProduction) {
  app.use(cors());
}

app.use(express.json({ limit: "25mb" }));
if ((STORAGE_DRIVER || "local").toLowerCase() === "local") {
  app.use("/uploads", express.static(UPLOADS_DIR));
}
app.use("/api", apiRoutes);

if (isProduction) {
  app.use(express.static(DIST_DIR));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
} else {
  app.get("/", (_req, res) => res.send("API em execução no modo desenvolvimento"));
}

app.listen(API_PORT, () => {
  console.log(`Servidor rodando em http://localhost:${API_PORT}`);
  if (isProduction) {
    console.log(`Servindo frontend a partir de ${path.relative(ROOT_DIR, DIST_DIR)}`);
  }
});
