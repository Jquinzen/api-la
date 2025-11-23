// src/routes/dashboard.ts
import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"

const router = Router()


router.get(
  "/proprietario/gerais",
  verificaToken,
  requireRole("PROPRIETARIO"),
  asyncHandler(async (req, res) => {
    const prop = await prisma.proprietario.findUnique({
      where: { usuarioId: req.user!.id },
    })

    if (!prop) return res.status(403).json({ erro: "Proprietário inválido" })

 
    const lavs = await prisma.lavanderia.findMany({
      where: { proprietario_id: prop.id },
      select: { id: true },
    })

    const lavIds = lavs.map(l => l.id)

  
    const [maquinas, reservas, ] = await Promise.all([
      prisma.maquina.count({
        where: { lavanderia_id: { in: lavIds } },
      }),

      prisma.reserva.count({
        where: { maquina: { lavanderia_id: { in: lavIds } } },
      }),
    ])

    res.json({
      clientes: 0,
      lavanderias: lavIds.length,
      maquinas,
      reservas,
    })
  })
)


router.get(
  "/proprietario/maquinas",
  verificaToken,
  requireRole("PROPRIETARIO"),
  asyncHandler(async (req, res) => {
    const prop = await prisma.proprietario.findUnique({
      where: { usuarioId: req.user!.id },
    })

    if (!prop) return res.status(403).json({ erro: "Proprietário inválido" })

    const maquinas = await prisma.maquina.findMany({
      where: {
        lavanderia: { proprietario_id: prop.id },
      },
      include: {
        lavanderia: true,
      },
      orderBy: { createdAt: "desc" },
    })

    res.json(maquinas)
  })
)


router.get(
  "/proprietario/reservasStatus",
  verificaToken,
  requireRole("PROPRIETARIO"),
  asyncHandler(async (req, res) => {
    const prop = await prisma.proprietario.findUnique({
      where: { usuarioId: req.user!.id },
    })

    if (!prop) return res.status(403).json({ erro: "Proprietário inválido" })

   
    const lavs = await prisma.lavanderia.findMany({
      where: { proprietario_id: prop.id },
      select: { id: true },
    })

    const lavIds = lavs.map(l => l.id)

  
    const rows = await prisma.reserva.groupBy({
      by: ["status"],
      _count: { status: true },
      where: {
        maquina: {
          lavanderia_id: { in: lavIds },
        },
      },
    })

    const resultado = rows.map(r => ({
      status: r.status,
      num: r._count.status,
    }))

    res.json(resultado)
  })
)

export default router
