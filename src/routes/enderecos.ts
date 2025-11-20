import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"

const router = Router()


router.get(
  "/",
  verificaToken,
  requireRole("CLIENTE"),
  asyncHandler(async (req, res) => {
    const cli = await prisma.cliente.findUnique({
      where: { usuarioId: req.user!.id },
    })

    if (!cli) return res.status(403).json({ erro: "Cliente inválido" })

    const list = await prisma.endereco.findMany({
      where: { clienteId: cli.id },
      orderBy: { apelido: "asc" },
    })

    res.json(list)
  })
)



router.post(
  "/",
  verificaToken,
  requireRole("CLIENTE"),
  asyncHandler(async (req, res) => {
    const cli = await prisma.cliente.findUnique({
      where: { usuarioId: req.user!.id },
    })

    if (!cli) return res.status(403).json({ erro: "Cliente inválido" })

    const { apelido, rua, bairro, cidade, estado, cep, latitude, longitude } = req.body

    const novo = await prisma.endereco.create({
      data: {
        apelido,
        rua,
        bairro,
        cidade,
        estado,
        cep,
        latitude,
        longitude,
        clienteId: cli.id,
      },
    })

    res.status(201).json(novo)
  })
)



router.put(
  "/:id",
  verificaToken,
  requireRole("CLIENTE"),
  asyncHandler(async (req, res) => {
    const { id } = req.params

    const cli = await prisma.cliente.findUnique({
      where: { usuarioId: req.user!.id },
    })
    if (!cli) return res.status(403).json({ erro: "Cliente inválido" })

  
    const end = await prisma.endereco.findUnique({ where: { id } })
    if (!end || end.clienteId !== cli.id)
      return res.status(403).json({ erro: "Sem permissão" })

    const updated = await prisma.endereco.update({
      where: { id },
      data: req.body,
    })

    res.json(updated)
  })
)



router.delete(
  "/:id",
  verificaToken,
  requireRole("CLIENTE"),
  asyncHandler(async (req, res) => {
    const { id } = req.params

    const cli = await prisma.cliente.findUnique({
      where: { usuarioId: req.user!.id },
    })
    if (!cli) return res.status(403).json({ erro: "Cliente inválido" })

    const end = await prisma.endereco.findUnique({ where: { id } })
    if (!end || end.clienteId !== cli.id)
      return res.status(403).json({ erro: "Sem permissão" })

    await prisma.endereco.delete({ where: { id } })

    res.json({ ok: true })
  })
)

export default router
