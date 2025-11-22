import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"

const router = Router()


router.get(
  "/",
  verificaToken,
  asyncHandler(async (req, res) => {
    const list = await prisma.notificacao.findMany({
      where: { usuarioId: req.user!.id },
      orderBy: { createdAt: "desc" },
    })

    res.json(list)
  })
)



router.patch(
  "/:id/lida",
  verificaToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params

    const notif = await prisma.notificacao.findUnique({ where: { id } })
    if (!notif || notif.usuarioId !== req.user!.id)
      return res.status(403).json({ erro: "Sem permissão" })

    const updated = await prisma.notificacao.update({
      where: { id },
      data: { lida: true },
    })

    res.json(updated)
  })
)



router.post(
  "/",
  verificaToken,
  requireRole("ADMIN", "PROPRIETARIO"),
  asyncHandler(async (req, res) => {
    const { usuarioId, titulo, mensagem, tipo } = req.body

    const notif = await prisma.notificacao.create({
      data: { usuarioId, titulo, mensagem, tipo },
    })

    res.status(201).json(notif)
  })
)



router.delete(
  "/:id",
  verificaToken,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.notificacao.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  })
)

export default router
