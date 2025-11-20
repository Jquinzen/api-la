import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { pagamentoSchema } from "../utils/validators.js"

const router = Router()

// Criar pagamento para uma reserva
router.post(
  "/:reserva_id",
  verificaToken,
  requireRole("CLIENTE", "PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { reserva_id } = req.params
    const { metodo } = pagamentoSchema.parse(req.body)

    const reserva = await prisma.reserva.findUnique({
      where: { id: reserva_id },
      include: {
        maquina: true,
        pagamento: true,
      },
    })

    if (!reserva) {
      return res.status(404).json({ erro: "Reserva não encontrada" })
    }

    // agora a relação é via reserva.pagamento, não pagamento_id
    if (reserva.pagamento) {
      return res.status(400).json({ erro: "Reserva já possui pagamento" })
    }

    const valor = reserva.maquina.preco // Decimal do Prisma, ok pra passar direto

    // Se for CLIENTE, garante que a reserva é dele
    if (req.user!.tipo === "CLIENTE") {
      const cli = await prisma.cliente.findUnique({
        where: { usuarioId: req.user!.id },
      })
      if (!cli || cli.id !== reserva.cliente_id) {
        return res.status(403).json({ erro: "Sem permissão" })
      }
    }

    
    const pg = await prisma.pagamento.create({
      data: {
        metodo,
        valor,
        status: "FEITO",
        reservaId: reserva_id, 
      },
    })

    // Busca reserva já com o pagamento incluído
    const reservaAtualizada = await prisma.reserva.findUnique({
      where: { id: reserva_id },
      include: { pagamento: true, maquina: true },
    })

    res.status(201).json({
      pagamento: pg,
      reserva: reservaAtualizada,
    })
  })
)

// Atualizar status do pagamento
router.patch(
  "/:id",
  verificaToken,
  requireRole("PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { status } = pagamentoSchema.pick({ status: true }).parse(req.body)

    const pg = await prisma.pagamento.update({
      where: { id },
      data: { status },
    })

    res.json(pg)
  })
)

export default router
