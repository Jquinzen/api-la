import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { pagamentoSchema } from "../utils/validators.js"

const router = Router()


router.post("/:reserva_id", verificaToken, requireRole("CLIENTE", "PROPRIETARIO", "ADMIN"), asyncHandler(async (req, res) => {
  const { reserva_id } = req.params
  const data = pagamentoSchema.parse(req.body)

  const reserva = await prisma.reserva.findUnique({ where: { id: reserva_id } })
  if (!reserva) return res.status(404).json({ erro: "Reserva não encontrada" })
  if (reserva.pagamento_id) return res.status(400).json({ erro: "Reserva já possui pagamento" })


  if (req.user!.tipo === "CLIENTE") {
    const cli = await prisma.cliente.findUnique({ where: { usuarioId: req.user!.id } })
    if (!cli || cli.id !== reserva.cliente_id) return res.status(403).json({ erro: "Sem permissão" })
  }

  const pg = await prisma.pagamento.create({ data })
  const updated = await prisma.reserva.update({ where: { id: reserva_id }, data: { pagamento_id: pg.id } })
  res.status(201).json({ pagamento: pg, reserva: updated })
}))


router.patch("/:id", verificaToken, requireRole("PROPRIETARIO", "ADMIN"), asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status } = pagamentoSchema.pick({ status: true }).parse(req.body)
  const pg = await prisma.pagamento.update({ where: { id }, data: { status } })
  res.json(pg)
}))

export default router
