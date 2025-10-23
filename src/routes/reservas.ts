
import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { reservaCreateSchema } from "../utils/validators.js"
import { Status_maquina, Status_reserva } from "@prisma/client"

const router = Router()


async function existeConflito(maquina_id: string, inicio: Date, fim: Date) {
  const margemMs = 5 * 60 * 1000 // 5 minutos
  const inicioMargem = new Date(inicio.getTime() - margemMs)
  const fimMargem = new Date(fim.getTime() + margemMs)

  return prisma.reserva.findFirst({
    where: {
      maquina_id,
      status: { not: Status_reserva.CANCELADA },
      inicio: { lt: fimMargem },
      fim: { gt: inicioMargem },
    },
  })
}


router.post(
  "/",
  verificaToken,
  requireRole("CLIENTE"),
  asyncHandler(async (req, res) => {
    const payload = reservaCreateSchema.parse(req.body)

    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.user!.id },
    })
    if (!cliente || cliente.id !== payload.cliente_id) {
      return res.status(403).json({ erro: "Cliente inválido" })
    }

    const maquina = await prisma.maquina.findUnique({
      where: { id: payload.maquina_id },
    })
    if (!maquina) return res.status(404).json({ erro: "Máquina não encontrada" })
    if (maquina.status_maquina !== Status_maquina.DISPONIVEL) {
      return res.status(400).json({ erro: "Máquina indisponível" })
    }


    const inicio = new Date(payload.inicio)
    const tempoOperacaoMin = maquina.tipo === "LAVADORA" ? 45 : 30 
    const fim = new Date(inicio.getTime() + tempoOperacaoMin * 60 * 1000)

 
    const conflito = await existeConflito(maquina.id, inicio, fim)
    if (conflito) {
      return res
        .status(400)
        .json({ erro: "Horário indisponível. Máquina já reservada nesse período." })
    }


    const reserva = await prisma.reserva.create({
      data: {
        cliente_id: cliente.id,
        maquina_id: maquina.id,
        inicio,
        fim,
        status: Status_reserva.EM_ANDAMENTO,
      },
      include: { maquina: true },
    })

    res.status(201).json({
      mensagem: "Reserva criada com sucesso!",
      tolerancia: "Cliente deve chegar até 10 minutos após o início.",
      reserva,
    })
  })
)

export default router
