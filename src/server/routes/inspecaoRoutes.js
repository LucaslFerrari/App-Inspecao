import express from "express";
import {
  getInspecao,
  getInspecaoDetalhes,
  listarInspecoes,
  reprocessarOportunidades,
  salvarInspecao,
} from "../controllers/inspecaoController.js";

const router = express.Router();

router.post("/salvar-inspecao", salvarInspecao);
router.post("/inspecoes/reprocessar-oportunidades", reprocessarOportunidades);
router.get("/inspecoes", listarInspecoes);
router.get("/inspecoes/:id", getInspecao);
router.get("/inspecoes/:id/detalhes", getInspecaoDetalhes);

export default router;
