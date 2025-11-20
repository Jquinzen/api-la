import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"

const router = Router()


router.get(
  "/me",
  verificaToken,
  requireRole("CLIENTE"),
  asyncHandler(async (req, res) => {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.user!.id },
      include: { usuario: true },
    })

    if (!cliente) {
      return res.status(404).json({ erro: "Cliente não encontrado" })
    }

    res.json(cliente)
  })
)

export default router
