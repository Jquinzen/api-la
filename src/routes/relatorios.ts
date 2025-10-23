import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"

const router = Router()


router.post("/", verificaToken, requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { proprietario_id } = req.body as { proprietario_id: string }
  const admin = await prisma.admin.findUnique({ where: { usuarioId: req.user!.id } })
  if (!admin) return res.status(403).json({ erro: "Admin inválido" })

  const rel = await prisma.relatorio.create({
    data: { admin_id: admin.id, proprietario_id }
  })
  res.status(201).json(rel)
}))


router.get("/", verificaToken, requireRole("ADMIN", "PROPRIETARIO"), asyncHandler(async (req, res) => {
  if (req.user!.tipo === "ADMIN") {
    const admin = await prisma.admin.findUnique({ where: { usuarioId: req.user!.id } })
    const list = await prisma.relatorio.findMany({ where: { admin_id: admin!.id } })
    return res.json(list)
  } else {
    const prop = await prisma.proprietario.findUnique({ where: { usuarioId: req.user!.id } })
    const list = await prisma.relatorio.findMany({ where: { proprietario_id: prop!.id } })
    return res.json(list)
  }
}))

export default router
