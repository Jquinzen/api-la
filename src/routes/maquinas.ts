import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { maquinaSchema } from "../utils/validators.js"

const router = Router()

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id;

      const maquina = await prisma.maquina.findUnique({
        where: { id },
        include: {
          lavanderia: {
            select: {
              id: true,
              nomeFantasia: true,
              endereco: true,
              fotoUrl: true,
            },
          },
        },
      });

      if (!maquina) {
        return res.status(404).json({ erro: "Máquina não encontrada" });
      }

      res.json(maquina);
    })
  );

router.get(
  "/proprietario/minhas",
  verificaToken,
  requireRole("PROPRIETARIO"),
  asyncHandler(async (req, res) => {
    const prop = await prisma.proprietario.findUnique({
      where: { usuarioId: req.user!.id },
    })
    if (!prop) return res.status(403).json({ erro: "Proprietário inválido" })

    const maquinas = await prisma.maquina.findMany({
      where: {
        lavanderia: {
          proprietario_id: prop.id,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        lavanderia: {
          select: { id: true, nomeFantasia: true },
        },
      },
    })

    res.json(maquinas)
  })
)

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, tipo, lavanderia_id } = req.query as Record<
      string,
      string | undefined
    >

    const where: any = {}

    if (status) {
      
      where.status_maquina = status
    }

    if (tipo) {
      // Tipo_maquina: "LAVADORA" | "SECADORA"
      where.tipo = tipo
    }

    if (lavanderia_id) {
      where.lavanderia_id = lavanderia_id
    }

    const list = await prisma.maquina.findMany({
      where,
      orderBy: { createdAt: "desc" }, // 👈 no schema é createdAt, não createAt
    })

    res.json(list)
  })
)

// POST /maquinas
router.post(
  "/",
  verificaToken,
  requireRole("PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const data = maquinaSchema.parse(req.body)

    // Se for PROPRIETARIO, garante que a lavanderia é dele
    if (req.user!.tipo === "PROPRIETARIO") {
      const lav = await prisma.lavanderia.findUnique({
        where: { id: data.lavanderia_id },
      })
      const prop = await prisma.proprietario.findUnique({
        where: { usuarioId: req.user!.id },
      })

      if (!lav || !prop || lav.proprietario_id !== prop.id) {
        return res.status(403).json({
          erro: "Somente o proprietário dono pode criar máquinas nessa lavanderia",
        })
      }
    }

    const created = await prisma.maquina.create({
      data,
    })

    res.status(201).json(created)
  })
)

// PUT /maquinas/:id
router.put(
  "/:id",
  verificaToken,
  requireRole("PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const data = maquinaSchema.partial().parse(req.body)

    if (req.user!.tipo === "PROPRIETARIO") {
      const maq = await prisma.maquina.findUnique({ where: { id } })
      const prop = await prisma.proprietario.findUnique({
        where: { usuarioId: req.user!.id },
      })

      if (!maq || !prop) {
        return res.status(404).json({ erro: "Máquina não encontrada" })
      }

      const lav = await prisma.lavanderia.findUnique({
        where: { id: maq.lavanderia_id },
      })

      if (!lav || lav.proprietario_id !== prop.id) {
        return res.status(403).json({ erro: "Sem permissão" })
      }
    }

    const updated = await prisma.maquina.update({
      where: { id },
      data,
    })

    res.json(updated)
  })
)

// DELETE /maquinas/:id
router.delete(
  "/:id",
  verificaToken,
  requireRole("PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params

    if (req.user!.tipo === "PROPRIETARIO") {
      const maq = await prisma.maquina.findUnique({ where: { id } })
      const prop = await prisma.proprietario.findUnique({
        where: { usuarioId: req.user!.id },
      })

      if (!maq || !prop) {
        return res.status(404).json({ erro: "Máquina não encontrada" })
      }

      const lav = await prisma.lavanderia.findUnique({
        where: { id: maq.lavanderia_id },
      })

      if (!lav || lav.proprietario_id !== prop.id) {
        return res.status(403).json({ erro: "Sem permissão" })
      }
    }

    await prisma.maquina.delete({ where: { id } })

    res.json({ ok: true })
  })
)

export default router
