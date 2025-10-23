import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { proprietarioSchema } from "../utils/validators.js"

const router = Router()


router.get("/", verificaToken, requireRole("ADMIN"), asyncHandler(async (_req, res) => {
  const list = await prisma.proprietario.findMany({ include: { usuario: true } })
  res.json(list)
}))


router.patch("/:id/plano", verificaToken, requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { nivel_privilegio } = proprietarioSchema.pick({ nivel_privilegio: true }).parse(req.body)
  const p = await prisma.proprietario.update({
    where: { id: req.params.id },
    data: { nivel_privilegio }
  })
  res.json(p)
}))

export default router
