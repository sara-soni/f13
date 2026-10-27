import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createSwaggerRouter(): Router {
  const router = Router();
  let yamlPath = path.join(__dirname, "openapi.yaml");
  if (!fs.existsSync(yamlPath)) {
    yamlPath = path.resolve(__dirname, "../../src/docs/openapi.yaml");
  }
  const swaggerDocument = YAML.load(yamlPath);

  router.use("/", swaggerUi.serve);
  router.get("/", swaggerUi.setup(swaggerDocument, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "LeaveFlow API Docs",
  }));

  // Expose JSON spec
  router.get("/spec.json", (_req, res) => {
    res.json(swaggerDocument);
  });

  return router;
}
