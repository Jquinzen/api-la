import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { avaliacaoSchema } from "../utils/validators.js"

const router = Router()


router.post("/", verificaToken, requireRole("CLIENTE"), asyncHandler(async (req, res) => {
  const data = avaliacaoSchema.parse(req.body)
  const cli = await prisma.cliente.findUnique({ where: { usuarioId: req.user!.id } })
  if (!cli || cli.id !== data.cliente_id) return res.status(403).json({ erro: "Sem permissão" })

  const av = await prisma.avaliacao.create({ data })
  res.status(201).json(av)
}))


router.get("/lavanderia/:lavanderia_id", asyncHandler(async (req, res) => {
  const { lavanderia_id } = req.params
  const list = await prisma.avaliacao.findMany({
    where: { lavanderia_id },
    orderBy: { createAt: "desc" },
    include: { cliente: { include: { usuario: true } } }
  })
  res.json(list)
}))

export default router
