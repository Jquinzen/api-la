import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"

const router = Router()

router.get("/", verificaToken, requireRole("ADMIN"), asyncHandler(async (_req, res) => {
  const list = await prisma.usuario.findMany({ orderBy: { createdAt: "desc" } })
  res.json(list)
}))

export default router
