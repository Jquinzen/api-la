import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"

const router = Router()


router.get(
  "/",
  verificaToken,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const list = await prisma.usuario.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        telefone: true,
        fotoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json(list)
  })
)



router.get(
  "/me",
  verificaToken,
  asyncHandler(async (req, res) => {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        fotoUrl: true,
        tipo: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json(usuario)
  })
)



router.put(
  "/me",
  verificaToken,
  asyncHandler(async (req, res) => {
    const { nome, email, telefone, fotoUrl } = req.body

 
    if (email) {
      const existe = await prisma.usuario.findUnique({
        where: { email },
      })
      if (existe && existe.id !== req.user!.id) {
        return res.status(409).json({ erro: "E-mail já está em uso" })
      }
    }

    const updated = await prisma.usuario.update({
      where: { id: req.user!.id },
      data: {
        nome,
        email,
        telefone,
        fotoUrl,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        fotoUrl: true,
        updatedAt: true,
      },
    })

    res.json(updated)
  })
)


export default router
