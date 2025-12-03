import express from "express";
import {
  getOportunidadesPorCorreia,
  patchStatusOportunidades,
} from "../controllers/oportunidadeController.js";

const router = express.Router();

router.get("/correias/:correiaId/oportunidades", getOportunidadesPorCorreia);
router.patch("/oportunidades/status", patchStatusOportunidades);

export default router;

