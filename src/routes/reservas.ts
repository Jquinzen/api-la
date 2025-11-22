import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { reservaCreateSchema } from "../utils/validators.js"
import { Status_maquina, Status_reserva, TipoNotificacao } from "@prisma/client"

const router = Router()

async function existeConflito(maquina_id: string, inicio: Date, fim: Date) {
  const margemMs = 5 * 60 * 1000
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



router.get(
  "/",
  verificaToken,
  requireRole("PROPRIETARIO"),
  asyncHandler(async (req, res) => {
    const prop = await prisma.proprietario.findUnique({
      where: { usuarioId: req.user!.id },
    })

    if (!prop) return res.status(403).json({ erro: "Proprietário inválido" })

    const reservas = await prisma.reserva.findMany({
      where: {
        maquina: {
          lavanderia: {
            proprietario_id: prop.id,
          },
        },
      },
      orderBy: { inicio: "desc" },
      include: {
        maquina: {
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
        },
        cliente: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
                fotoUrl: true,
              },
            },
          },
        },
        pagamento: true,
      },
    })

    res.json(reservas)
  })
)



router.post(
  "/",
  verificaToken,
  requireRole("CLIENTE"),
  asyncHandler(async (req, res) => {
    const payload = reservaCreateSchema.parse(req.body)

    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.user!.id },
    })
    if (!cliente) return res.status(403).json({ erro: "Cliente inválido" })

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
      return res.status(400).json({ erro: "Horário indisponível" })
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

    const horarioFormatado = inicio.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    await prisma.notificacao.create({
      data: {
        usuarioId: req.user!.id,
        titulo: "Reserva criada",
        mensagem: `Sua reserva para a máquina ${maquina.tipo} foi criada para ${horarioFormatado}.`,
        tipo: TipoNotificacao.ALERTA,
      },
    })

    res.status(201).json({
      mensagem: "Reserva criada com sucesso!",
      tolerancia: "Cliente deve chegar até 10 minutos após o início.",
      reserva: {
        ...reserva,
        valor: reserva.maquina.preco,
      },
    })
  })
)



router.get(
  "/minhas",
  verificaToken,
  requireRole("CLIENTE"),
  asyncHandler(async (req, res) => {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.user!.id },
    })
    if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" })

    const reservas = await prisma.reserva.findMany({
      where: { cliente_id: cliente.id },
      orderBy: { inicio: "desc" },
      include: {
        maquina: {
          select: {
            id: true,
            tipo: true,
            lavanderia: { select: { id: true, nomeFantasia: true } },
          },
        },
        pagamento: { select: { id: true, status: true, valor: true } },
      },
    })

    res.json(reservas)
  })
)



router.delete(
  "/:id",
  verificaToken,
  requireRole("CLIENTE", "PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const mensagem = typeof req.body?.mensagem === "string" ? req.body.mensagem.trim() : ""

    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: {
        cliente: { include: { usuario: true } },
        maquina: { include: { lavanderia: true } },
      },
    })

    if (!reserva) return res.status(404).json({ erro: "Reserva não encontrada" })

    if (req.user!.tipo === "CLIENTE") {
      const cli = await prisma.cliente.findUnique({
        where: { usuarioId: req.user!.id },
      })
      if (!cli || cli.id !== reserva.cliente_id) {
        return res.status(403).json({ erro: "Sem permissão" })
      }
    }

    if (req.user!.tipo === "PROPRIETARIO") {
      const prop = await prisma.proprietario.findUnique({
        where: { usuarioId: req.user!.id },
      })

      if (!prop || reserva.maquina.lavanderia.proprietario_id !== prop.id) {
        return res.status(403).json({ erro: "Sem permissão" })
      }

      if (!mensagem) {
        return res.status(400).json({ erro: "Mensagem obrigatória" })
      }
    }

    await prisma.reserva.update({
      where: { id },
      data: { status: Status_reserva.CANCELADA },
    })

    if (req.user!.tipo === "PROPRIETARIO" && reserva.cliente?.usuario) {
      await prisma.notificacao.create({
        data: {
          usuarioId: reserva.cliente.usuario.id,
          titulo: "Sua reserva foi cancelada",
          mensagem,
          tipo: TipoNotificacao.ALERTA,
        },
      })
    }

    res.json({ mensagem: "Reserva cancelada com sucesso" })
  })
)



router.get(
  "/job",
  asyncHandler(async (req, res) => {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ erro: "Unauthorized" })
    }

    const agora = new Date()
    const daqui15 = new Date(agora.getTime() + 15 * 60 * 1000)

    console.log("### CRON executado:", agora.toISOString())

    // FINALIZAR
    const reservasParaFinalizar = await prisma.reserva.findMany({
      where: {
        fim: { lt: agora },
        status: Status_reserva.EM_ANDAMENTO,
      },
    })

    const idsReservas = reservasParaFinalizar.map((r) => r.id)
    const idsMaquinas = reservasParaFinalizar.map((r) => r.maquina_id)

    let reservasMarcadasComoFeitas = 0

    if (idsReservas.length > 0) {
      const res1 = await prisma.reserva.updateMany({
        where: { id: { in: idsReservas } },
        data: { status: Status_reserva.FEITA },
      })

      reservasMarcadasComoFeitas = res1.count

      await prisma.maquina.updateMany({
        where: { id: { in: idsMaquinas } },
        data: { status_maquina: Status_maquina.DISPONIVEL },
      })
    }

    // PRÓXIMAS RESERVAS
    const reservasProximas = await prisma.reserva.findMany({
      where: {
        inicio: { gte: agora, lte: daqui15 },
        status: { not: Status_reserva.CANCELADA },
      },
      include: {
        cliente: { include: { usuario: true } },
        maquina: true,
      },
    })

    const janelaNotificacao = new Date(agora.getTime() - 20 * 60 * 1000)

    let lembretesEnviados = 0

    for (const reserva of reservasProximas) {
      const usuario = reserva.cliente?.usuario
      if (!usuario) continue

      const existeNotif = await prisma.notificacao.findFirst({
        where: {
          usuarioId: usuario.id,
          titulo: "Sua reserva começa em breve",
          createdAt: { gte: janelaNotificacao },
        },
      })

      if (existeNotif) continue

      const hora = reserva.inicio.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })

      await prisma.notificacao.create({
        data: {
          usuarioId: usuario.id,
          titulo: "Sua reserva começa em breve",
          mensagem: `Sua reserva da máquina ${reserva.maquina.tipo} começa às ${hora}.`,
          tipo: TipoNotificacao.ALERTA,
        },
      })

      lembretesEnviados++
    }

    return res.json({
      ok: true,
      horarioExecucao: agora.toISOString(),
      reservasMarcadasComoFeitas,
      lembretesEnviados,
    })
  })
)

export default router
