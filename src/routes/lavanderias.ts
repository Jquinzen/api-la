import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { lavanderiaSchema } from "../utils/validators.js"

const router = Router()

async function contadoresLavanderias(ids: string[]) {
  if (ids.length === 0) {
    return {
      ativas: new Map<string, number>(),
      totais: new Map<string, number>(),
    }
  }

  const totais = await prisma.maquina.groupBy({
    by: ["lavanderia_id"],
    _count: { _all: true },
    where: { lavanderia_id: { in: ids } },
  })

  const ativas = await prisma.maquina.groupBy({
    by: ["lavanderia_id"],
    _count: { _all: true },
    where: {
      lavanderia_id: { in: ids },
      status_maquina: "DISPONIVEL",
    },
  })

  const mapTotais = new Map<string, number>()
  const mapAtivas = new Map<string, number>()

  for (const r of totais) {
    mapTotais.set(r.lavanderia_id, r._count._all)
  }
  for (const r of ativas) {
    mapAtivas.set(r.lavanderia_id, r._count._all)
  }

  return { ativas: mapAtivas, totais: mapTotais }
}

// =============================
// LISTAGEM BÁSICA
// =============================

router.get(
  "/minhas",
  verificaToken,
  requireRole("PROPRIETARIO"),
  asyncHandler(async (req, res) => {
    // pega o proprietário pelo usuarioId do token
    const prop = await prisma.proprietario.findUnique({
      where: { usuarioId: req.user!.id },
    })

    if (!prop) {
      return res.status(403).json({ erro: "Proprietário inválido" })
    }

    const list = await prisma.lavanderia.findMany({
      where: { proprietario_id: prop.id },
      orderBy: { nomeFantasia: "asc" },
      select: {
        id: true,
        nomeFantasia: true,
        endereco: true,
        fotoUrl: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const ids = list.map((l) => l.id)

    // reusando tua lógica de contagem de máquinas
    const totais = await prisma.maquina.groupBy({
      by: ["lavanderia_id"],
      _count: { _all: true },
      where: { lavanderia_id: { in: ids } },
    })
    const ativas = await prisma.maquina.groupBy({
      by: ["lavanderia_id"],
      _count: { _all: true },
      where: { lavanderia_id: { in: ids }, status_maquina: "DISPONIVEL" },
    })

    const mapTotais = new Map<string, number>()
    const mapAtivas = new Map<string, number>()
    for (const r of totais) mapTotais.set(r.lavanderia_id, r._count._all)
    for (const r of ativas) mapAtivas.set(r.lavanderia_id, r._count._all)

    const resposta = list.map((l) => ({
      ...l,
      qntMaquinas: mapAtivas.get(l.id) ?? 0,
      qntMaquinasTotal: mapTotais.get(l.id) ?? 0,
    }))

    res.json(resposta)
  })
)

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const list = await prisma.lavanderia.findMany({
      orderBy: { nomeFantasia: "asc" },
      select: {
        id: true,
        nomeFantasia: true,
        endereco: true,
        fotoUrl: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const ids = list.map((l) => l.id)
    const { ativas, totais } = await contadoresLavanderias(ids)

    const resposta = list.map((l) => {
      return {
        id: l.id,
        nomeFantasia: l.nomeFantasia,
        endereco: l.endereco,
        fotoUrl: l.fotoUrl,
        destaque: l.destaque,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        qntMaquinas: ativas.get(l.id) ?? 0,
        qntMaquinasTotal: totais.get(l.id) ?? 0,
      }
    })

    res.json(resposta)
  })
)

// =============================
// BUSCA COM FILTROS
// =============================

// Haversine - distância em km
function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

router.get(
  "/busca",
  asyncHandler(async (req, res) => {
    const somenteDisponiveis = req.query.somenteDisponiveis as string | undefined
    const lat = req.query.lat as string | undefined
    const lng = req.query.lng as string | undefined
    const raioKm = req.query.raioKm as string | undefined
    const ordenarPor = req.query.ordenarPor as
      | "distancia"
      | "preco"
      | "avaliacao"
      | undefined
    const ordem = (req.query.ordem as "asc" | "desc" | undefined) ?? "asc"

    const filtroSomenteDisponiveis = somenteDisponiveis === "true"

    const userLat = lat ? parseFloat(lat) : undefined
    const userLng = lng ? parseFloat(lng) : undefined
    const raio = raioKm ? parseFloat(raioKm) : undefined

    const temCoordUsuario =
      typeof userLat === "number" &&
      !Number.isNaN(userLat) &&
      typeof userLng === "number" &&
      !Number.isNaN(userLng)

    // 1) Buscar lavanderias com máquinas e avaliações
    const rows = await prisma.lavanderia.findMany({
      select: {
        id: true,
        nomeFantasia: true,
        endereco: true,
        fotoUrl: true,
        destaque: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
        maquinas: {
          select: {
            status_maquina: true,
            ativa: true,
            preco: true,
          },
        },
        avaliacoes: {
          select: {
            nota: true,
          },
        },
      },
      orderBy: {
        nomeFantasia: "asc",
      },
    })

    // 2) Calcular estatísticas por lavanderia
    let lista = rows.map((l) => {
      const maquinasAtivas = l.maquinas.filter((m) => m.ativa)
      const maquinasDisponiveis = maquinasAtivas.filter(
        (m) => m.status_maquina === "DISPONIVEL"
      )

      let precoMedio: number | null = null
      if (maquinasAtivas.length > 0) {
        const soma = maquinasAtivas.reduce((acc, m) => acc + Number(m.preco), 0)
        precoMedio = soma / maquinasAtivas.length
      }

      let avaliacaoMedia: number | null = null
      if (l.avaliacoes.length > 0) {
        const somaNotas = l.avaliacoes.reduce((acc, a) => acc + a.nota, 0)
        avaliacaoMedia = somaNotas / l.avaliacoes.length
      }

      let distancia: number | null = null
      if (
        temCoordUsuario &&
        typeof l.latitude === "number" &&
        typeof l.longitude === "number"
      ) {
        distancia = distanciaKm(userLat!, userLng!, l.latitude, l.longitude)
      }

      return {
        id: l.id,
        nomeFantasia: l.nomeFantasia,
        endereco: l.endereco,
        fotoUrl: l.fotoUrl,
        destaque: l.destaque,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        qntMaquinasDisponiveis: maquinasDisponiveis.length,
        qntMaquinasTotal: maquinasAtivas.length,
        precoMedio,
        avaliacaoMedia,
        distanciaKm: distancia,
      }
    })

    // 3) Filtro: somente lavanderias com máquinas disponíveis
    if (filtroSomenteDisponiveis) {
      lista = lista.filter((l) => l.qntMaquinasDisponiveis > 0)
    }

    // 4) Filtro por raio de proximidade
    if (temCoordUsuario && typeof raio === "number" && !Number.isNaN(raio)) {
      lista = lista.filter(
        (l) =>
          l.distanciaKm !== null &&
          typeof l.distanciaKm === "number" &&
          l.distanciaKm <= raio
      )
    }

    // 5) Ordenação
    const ord = ordem === "desc" ? "desc" : "asc"

    if (ordenarPor === "distancia" && temCoordUsuario) {
      lista.sort((a, b) => {
        const da =
          typeof a.distanciaKm === "number" ? a.distanciaKm : Number.POSITIVE_INFINITY
        const db =
          typeof b.distanciaKm === "number" ? b.distanciaKm : Number.POSITIVE_INFINITY
        return da - db
      })
    } else if (ordenarPor === "preco") {
      lista.sort((a, b) => {
        const pa =
          typeof a.precoMedio === "number"
            ? a.precoMedio
            : ord === "asc"
            ? Number.POSITIVE_INFINITY
            : Number.NEGATIVE_INFINITY

        const pb =
          typeof b.precoMedio === "number"
            ? b.precoMedio
            : ord === "asc"
            ? Number.POSITIVE_INFINITY
            : Number.NEGATIVE_INFINITY

        if (ord === "asc") {
          return pa - pb
        } else {
          return pb - pa
        }
      })
    } else if (ordenarPor === "avaliacao") {
      lista.sort((a, b) => {
        const na =
          typeof a.avaliacaoMedia === "number"
            ? a.avaliacaoMedia
            : ord === "asc"
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY

        const nb =
          typeof b.avaliacaoMedia === "number"
            ? b.avaliacaoMedia
            : ord === "asc"
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY

        if (ord === "asc") {
          return na - nb
        } else {
          return nb - na
        }
      })
    }

    res.json(lista)
  })
)



router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const lav = await prisma.lavanderia.findUnique({
      where: { id },
      select: {
        id: true,
        nomeFantasia: true,
        razaoSocial: true,
        endereco: true,
        fotoUrl: true,
        telefone: true,
        horarioAbertura: true,
        horarioFechamento: true,
        descricao: true,
        latitude: true,
        longitude: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
        proprietario: { select: { id: true, usuarioId: true } },
      },
    })

    if (!lav) {
      return res.status(404).json({ erro: "Lavanderia não encontrada" })
    }

    const qAtivas = await prisma.maquina.count({
      where: { lavanderia_id: id, status_maquina: "DISPONIVEL" },
    })
    const qTotal = await prisma.maquina.count({
      where: { lavanderia_id: id },
    })

    const resposta = {
      id: lav.id,
      nomeFantasia: lav.nomeFantasia,
      razaoSocial: lav.razaoSocial,
      endereco: lav.endereco,
      fotoUrl: lav.fotoUrl,
      telefone: lav.telefone,
      horarioAbertura: lav.horarioAbertura,
      horarioFechamento: lav.horarioFechamento,
      descricao: lav.descricao,
      latitude: lav.latitude,
      longitude: lav.longitude,
      destaque: lav.destaque,
      createdAt: lav.createdAt,
      updatedAt: lav.updatedAt,
      proprietario: lav.proprietario,
      qntMaquinas: qAtivas,
      qntMaquinasTotal: qTotal,
    }

    res.json(resposta)
  })
)

// =============================
// CRIAÇÃO
// =============================

router.post(
  "/",
  verificaToken,
  requireRole("PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req: any, res) => {
    const data = lavanderiaSchema.parse(req.body)

    let proprietarioId = data.proprietario_id

    if (req.user!.tipo === "PROPRIETARIO") {
      const me = await prisma.proprietario.findUnique({
        where: { usuarioId: req.user!.id },
      })
      if (!me) {
        return res.status(403).json({ erro: "Proprietário inválido" })
      }
      proprietarioId = me.id
    } else {
      if (!proprietarioId) {
        return res
          .status(400)
          .json({ erro: "proprietario_id é obrigatório para ADMIN" })
      }
      const existe = await prisma.proprietario.findUnique({
        where: { id: proprietarioId },
        select: { id: true },
      })
      if (!existe) {
        return res.status(400).json({ erro: "proprietario_id inexistente" })
      }
    }

    const lav = await prisma.lavanderia.create({
      data: {
        nomeFantasia: data.nomeFantasia,
        razaoSocial: data.razaoSocial,
        endereco: data.endereco,
        telefone: data.telefone,
        horarioAbertura: data.horarioAbertura,
        horarioFechamento: data.horarioFechamento,
        descricao: data.descricao,
        fotoUrl: data.fotoUrl,
        latitude: data.latitude,
        longitude: data.longitude,
        proprietario_id: proprietarioId!,
        destaque: data.destaque ?? false,
      },
      select: {
        id: true,
        nomeFantasia: true,
        endereco: true,
        fotoUrl: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const qAtivas = await prisma.maquina.count({
      where: { lavanderia_id: lav.id, status_maquina: "DISPONIVEL" },
    })
    const qTotal = await prisma.maquina.count({
      where: { lavanderia_id: lav.id },
    })

    const resposta = {
      id: lav.id,
      nomeFantasia: lav.nomeFantasia,
      endereco: lav.endereco,
      fotoUrl: lav.fotoUrl,
      destaque: lav.destaque,
      createdAt: lav.createdAt,
      updatedAt: lav.updatedAt,
      qntMaquinas: qAtivas,
      qntMaquinasTotal: qTotal,
    }

    res.status(201).json(resposta)
  })
)

// =============================
// EDIÇÃO
// =============================

router.put(
  "/:id",
  verificaToken,
  requireRole("PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const data = lavanderiaSchema.parse(req.body)

    if (req.user!.tipo === "PROPRIETARIO") {
      const lav = await prisma.lavanderia.findUnique({ where: { id } })
      if (!lav) {
        return res.status(404).json({ erro: "Lavanderia não encontrada" })
      }
      if (lav.proprietario_id !== data.proprietario_id) {
        return res
          .status(403)
          .json({ erro: "Somente o proprietário dono pode editar" })
      }
    }

    const updated = await prisma.lavanderia.update({
      where: { id },
      data: {
        nomeFantasia: data.nomeFantasia,
        razaoSocial: data.razaoSocial,
        endereco: data.endereco,
        telefone: data.telefone,
        horarioAbertura: data.horarioAbertura,
        horarioFechamento: data.horarioFechamento,
        descricao: data.descricao,
        fotoUrl: data.fotoUrl,
        latitude: data.latitude,
        longitude: data.longitude,
        proprietario_id: data.proprietario_id,
        destaque: data.destaque ?? false,
      },
      select: {
        id: true,
        nomeFantasia: true,
        endereco: true,
        fotoUrl: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json(updated)
  })
)

// =============================
// EXCLUSÃO
// =============================

router.delete(
  "/:id",
  verificaToken,
  requireRole("PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params

    if (req.user!.tipo === "PROPRIETARIO") {
      const lav = await prisma.lavanderia.findUnique({ where: { id } })
      if (!lav) {
        return res.status(404).json({ erro: "Lavanderia não encontrada" })
      }
      const prop = await prisma.proprietario.findUnique({
        where: { usuarioId: req.user!.id },
      })
      if (!prop || lav.proprietario_id !== prop.id) {
        return res
          .status(403)
          .json({ erro: "Somente o proprietário dono pode excluir" })
      }
    }

    await prisma.lavanderia.delete({ where: { id } })
    res.json({ ok: true })
  })
)

// =============================
// TOGGLE DESTAQUE (ADMIN)
// =============================

router.patch(
  "/:id/destaque",
  verificaToken,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const atual = await prisma.lavanderia.findUnique({
      where: { id },
      select: { id: true, destaque: true },
    })

    if (!atual) {
      return res.status(404).json({ erro: "Lavanderia não encontrada" })
    }

    const novo = await prisma.lavanderia.update({
      where: { id },
      data: { destaque: !atual.destaque },
      select: {
        id: true,
        nomeFantasia: true,
        endereco: true,
        fotoUrl: true,
        destaque: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json(novo)
  })
)

export default router
