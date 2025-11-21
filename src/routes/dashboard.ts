// src/routes/dashboard.ts
import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"

const router = Router()


type UserPayload = {
  id: string
  tipo: "CLIENTE" | "PROPRIETARIO" | "ADMIN"
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload
    }
  }
}


async function getContextoProprietario(usuarioId: string) {
  const prop = await prisma.proprietario.findUnique({
    where: { usuarioId },
  })

  if (!prop) return null

  const lavs = await prisma.lavanderia.findMany({
    where: { proprietario_id: prop.id },
    select: { id: true },
  })

  const lavIds = lavs.map((l) => l.id)

  return { proprietarioId: prop.id, lavanderiaIds: lavIds }
}


router.get(
  "/proprietario/gerais",
  verificaToken,
  requireRole("PROPRIETARIO"),
  asyncHandler(async (req, res) => {
    const usuarioId = req.user!.id

    const ctx = await getContextoProprietario(usuarioId)
    if (!ctx || ctx.lavanderiaIds.length === 0) {
      return res.json({
        clientes: 0,
        lavanderias: 0,
        maquinas: 0,
        reservas: 0,
      })
    }

    const { lavanderiaIds } = ctx

    const [maquinas, reservas, clientesGroup] = await Promise.all([
      prisma.maquina.count({
        where: { lavanderia_id: { in: lavanderiaIds } },
      }),
      prisma.reserva.count({
        where: { maquina: { lavanderia_id: { in: lavanderiaIds } } },
      }),
 
      prisma.reserva.groupBy({
        by: ["cliente_id"],
        where: { maquina: { lavanderia_id: { in: lavanderiaIds } } },
      }),
    ])

    res.json({
      clientes: clientesGroup.length,
      lavanderias: lavanderiaIds.length,
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
    const usuarioId = req.user!.id

    const ctx = await getContextoProprietario(usuarioId)
    if (!ctx || ctx.lavanderiaIds.length === 0) {
      return res.json([])
    }

    const { lavanderiaIds } = ctx

    const maquinas = await prisma.maquina.findMany({
      where: {
        lavanderia_id: { in: lavanderiaIds },
      },
      include: { lavanderia: true },
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
    const usuarioId = req.user!.id

    const ctx = await getContextoProprietario(usuarioId)
    if (!ctx || ctx.lavanderiaIds.length === 0) {
      return res.json([])
    }

    const { lavanderiaIds } = ctx

    const rows = await prisma.reserva.groupBy({
      by: ["status"],
      _count: { status: true },
      where: {
        maquina: {
          lavanderia_id: { in: lavanderiaIds },
        },
      },
    })

    const resultado = rows.map((r) => ({
      status: r.status,       
      num: r._count.status,
    }))

    res.json(resultado)
  })
)

export default router
