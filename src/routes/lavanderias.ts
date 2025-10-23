import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { lavanderiaSchema } from "../utils/validators.js"

const router = Router()

// Helpers: contadores por lavanderia
async function contadoresLavanderias(ids: string[]) {
  if (ids.length === 0) return { ativas: new Map<string, number>(), totais: new Map<string, number>() }

  const totais = await prisma.maquina.groupBy({
    by: ["lavanderia_id"],
    _count: { _all: true },
    where: { lavanderia_id: { in: ids } }
  })
  const ativas = await prisma.maquina.groupBy({
    by: ["lavanderia_id"],
    _count: { _all: true },
    where: { lavanderia_id: { in: ids }, status_maquina: "DISPONIVEL" }
  })

  const mapTotais = new Map<string, number>()
  const mapAtivas = new Map<string, number>()
  for (const r of totais) mapTotais.set(r.lavanderia_id, r._count._all)
  for (const r of ativas) mapAtivas.set(r.lavanderia_id, r._count._all)
  return { ativas: mapAtivas, totais: mapTotais }
}


router.get("/", asyncHandler(async (_req, res) => {
  const list = await prisma.lavanderia.findMany({
    orderBy: { nomeFantasia: "asc" },
    select: {
      id: true, nomeFantasia: true, endereco: true, fotoUrl: true, destaque: true,
      createdAt: true, updatedAt: true
    }
  })
  const ids = list.map(l => l.id)
  const { ativas, totais } = await contadoresLavanderias(ids)
  const resposta = list.map(l => ({
    ...l,
    qntMaquinas: ativas.get(l.id) ?? 0,
    qntMaquinasTotal: totais.get(l.id) ?? 0
  }))
  res.json(resposta)
}))


router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params
  const lav = await prisma.lavanderia.findUnique({
    where: { id },
    select: {
      id: true, nomeFantasia: true, razaoSocial: true, endereco: true, fotoUrl: true,
      telefone: true, horarioAbertura: true, horarioFechamento: true, descricao: true,
      latitude: true, longitude: true, destaque: true, createdAt: true, updatedAt: true,
      proprietario: { select: { id: true, usuarioId: true } }
    }
  })
  if (!lav) return res.status(404).json({ erro: "Lavanderia não encontrada" })

  const [qAtivas, qTotal] = await Promise.all([
    prisma.maquina.count({ where: { lavanderia_id: id, status_maquina: "DISPONIVEL" } }),
    prisma.maquina.count({ where: { lavanderia_id: id } })
  ])
  res.json({ ...lav, qntMaquinas: qAtivas, qntMaquinasTotal: qTotal })
}))


router.post("/", verificaToken, requireRole("PROPRIETARIO", "ADMIN"), asyncHandler(async (req: any, res) => {
  const data = lavanderiaSchema.parse(req.body)
  const lav = await prisma.lavanderia.create({
    data: {
      ...data,
      destaque: data.destaque ?? false
    },
    select: {
      id: true, nomeFantasia: true, endereco: true, fotoUrl: true, destaque: true,
      createdAt: true, updatedAt: true
    }
  })
  const [qAtivas, qTotal] = await Promise.all([
    prisma.maquina.count({ where: { lavanderia_id: lav.id, status_maquina: "DISPONIVEL" } }),
    prisma.maquina.count({ where: { lavanderia_id: lav.id } })
  ])
  res.status(201).json({ ...lav, qntMaquinas: qAtivas, qntMaquinasTotal: qTotal })
}))


router.put("/:id", verificaToken, requireRole("PROPRIETARIO", "ADMIN"), asyncHandler(async (req, res) => {
  const { id } = req.params
  const data = lavanderiaSchema.parse(req.body)

  // Se for proprietario, exige que a lavanderia seja dele
  if (req.user!.tipo === "PROPRIETARIO") {
    const lav = await prisma.lavanderia.findUnique({ where: { id } })
    if (!lav) return res.status(404).json({ erro: "Lavanderia não encontrada" })
    if (lav.proprietario_id !== data.proprietario_id) {
      return res.status(403).json({ erro: "Somente o proprietário dono pode editar" })
    }
  }

  const updated = await prisma.lavanderia.update({
    where: { id },
    data: {
      ...data,
      destaque: data.destaque ?? false
    },
    select: {
      id: true, nomeFantasia: true, endereco: true, fotoUrl: true, destaque: true,
      createdAt: true, updatedAt: true
    }
  })
  res.json(updated)
}))


router.delete("/:id", verificaToken, requireRole("PROPRIETARIO", "ADMIN"), asyncHandler(async (req, res) => {
  const { id } = req.params

  if (req.user!.tipo === "PROPRIETARIO") {
    const lav = await prisma.lavanderia.findUnique({ where: { id } })
    if (!lav) return res.status(404).json({ erro: "Lavanderia não encontrada" })
    // garante posse
    const prop = await prisma.proprietario.findUnique({ where: { usuarioId: req.user!.id } })
    if (!prop || lav.proprietario_id !== prop.id) {
      return res.status(403).json({ erro: "Somente o proprietário dono pode excluir" })
    }
  }

  await prisma.lavanderia.delete({ where: { id } })
  res.json({ ok: true })
}))

// destaque toggle (ADMIN apenas)
router.patch("/:id/destaque", verificaToken, requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { id } = req.params
  const atual = await prisma.lavanderia.findUnique({ where: { id }, select: { id: true, destaque: true } })
  if (!atual) return res.status(404).json({ erro: "Lavanderia não encontrada" })
  const novo = await prisma.lavanderia.update({
    where: { id },
    data: { destaque: !atual.destaque },
    select: {
      id: true, nomeFantasia: true, endereco: true, fotoUrl: true, destaque: true,
      createdAt: true, updatedAt: true
    }
  })
  res.json(novo)
}))

export default router
