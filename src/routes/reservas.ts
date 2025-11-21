import { Router } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verificaToken } from "../middlewares/verificaToken.js"
import { requireRole } from "../middlewares/requireRole.js"
import { reservaCreateSchema } from "../utils/validators.js"
import { Status_maquina, Status_reserva, TipoNotificacao } from "@prisma/client"

const router = Router()

// =====================================
// Função auxiliar: verifica conflito
// =====================================
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

// =====================================
// LISTAR RESERVAS DO PROPRIETÁRIO
// GET /reservas
// =====================================
router.get(
  "/",
  verificaToken,
  requireRole("PROPRIETARIO"),
  asyncHandler(async (req, res) => {
    const prop = await prisma.proprietario.findUnique({
      where: { usuarioId: req.user!.id },
    })

    if (!prop) {
      return res.status(403).json({ erro: "Proprietário inválido" })
    }

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

// =====================================
// CRIAR RESERVA (CLIENTE)
// POST /reservas
// =====================================
router.post(
  "/",
  verificaToken,
  requireRole("CLIENTE"),
  asyncHandler(async (req, res) => {
    const payload = reservaCreateSchema.parse(req.body)

    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.user!.id },
    })
    if (!cliente) {
      return res.status(403).json({ erro: "Cliente inválido" })
    }

    const maquina = await prisma.maquina.findUnique({
      where: { id: payload.maquina_id },
    })
    if (!maquina) return res.status(404).json({ erro: "Máquina não encontrada" })
    if (maquina.status_maquina !== Status_maquina.DISPONIVEL) {
      return res.status(400).json({ erro: "Máquina indisponível" })
    }

    // define tempo padrão do ciclo da máquina
    const inicio = new Date(payload.inicio)
    const tempoOperacaoMin = maquina.tipo === "LAVADORA" ? 45 : 30
    const fim = new Date(inicio.getTime() + tempoOperacaoMin * 60 * 1000)

    // verifica conflitos
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

    // ========== CRIA NOTIFICAÇÃO PARA O USUÁRIO ==========
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

// =====================================
// MINHAS RESERVAS (CLIENTE)
// GET /reservas/minhas
// =====================================
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

// =====================================
// HORÁRIOS OCUPADOS
// GET /reservas/ocupados
// =====================================
router.get(
  "/ocupados",
  verificaToken,
  requireRole("CLIENTE", "PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { maquina_id, data } = req.query

    if (!maquina_id || !data) {
      return res
        .status(400)
        .json({ erro: "maquina_id e data são obrigatórios" })
    }

    const inicioDia = new Date(`${data}T00:00:00`)
    const fimDia = new Date(`${data}T23:59:59`)

    const reservas = await prisma.reserva.findMany({
      where: {
        maquina_id: String(maquina_id),
        status: { not: Status_reserva.CANCELADA },
        inicio: { gte: inicioDia },
        fim: { lte: fimDia },
      },
      select: {
        inicio: true,
        fim: true,
      },
    })

    const format = (d: Date) => d.toISOString().substring(11, 16)

    res.json(
      reservas.map((r) => ({
        inicio: format(r.inicio),
        fim: format(r.fim),
      }))
    )
  })
)

// =====================================
// CANCELAR RESERVA (CLIENTE, PROPRIETARIO, ADMIN)
// DELETE /reservas/:id
// =====================================
router.delete(
  "/:id",
  verificaToken,
  requireRole("CLIENTE", "PROPRIETARIO", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const mensagem =
      typeof req.body?.mensagem === "string" ? req.body.mensagem.trim() : ""

    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: {
        cliente: {
          include: {
            usuario: true,
          },
        },
        maquina: {
          include: {
            lavanderia: true,
          },
        },
      },
    })

    if (!reserva) return res.status(404).json({ erro: "Reserva não encontrada" })

    // Cliente: só cancela se a reserva for dele
    if (req.user!.tipo === "CLIENTE") {
      const cli = await prisma.cliente.findUnique({
        where: { usuarioId: req.user!.id },
      })

      if (!cli || cli.id !== reserva.cliente_id) {
        return res.status(403).json({ erro: "Sem permissão" })
      }
    }

    // Proprietário: só cancela se a máquina for de uma lavanderia dele
    // e é OBRIGADO a mandar mensagem (motivo)
    if (req.user!.tipo === "PROPRIETARIO") {
      const prop = await prisma.proprietario.findUnique({
        where: { usuarioId: req.user!.id },
      })

      if (
        !prop ||
        reserva.maquina.lavanderia.proprietario_id !== prop.id
      ) {
        return res.status(403).json({ erro: "Sem permissão" })
      }

      if (!mensagem) {
        return res
          .status(400)
          .json({ erro: "Mensagem obrigatória ao cancelar a reserva." })
      }
    }

    // ADMIN pode cancelar qualquer reserva (já passou no requireRole)

    await prisma.reserva.update({
      where: { id },
      data: { status: Status_reserva.CANCELADA },
    })

    // Se foi o PROPRIETARIO que cancelou, cria notificação para o cliente
    if (req.user!.tipo === "PROPRIETARIO" && reserva.cliente?.usuario) {
      await prisma.notificacao.create({
        data: {
          usuarioId: reserva.cliente.usuario.id,
          titulo: "Sua reserva foi cancelada",
          mensagem: mensagem,
          tipo: TipoNotificacao.ALERTA,
        },
      })
    }

    res.json({ mensagem: "Reserva cancelada com sucesso" })
  })
)

// =====================================
// JOB: FINALIZAR + LEMBRETES
// POST /reservas/job
// =====================================
router.post(
  "/job",
  verificaToken,
  requireRole("ADMIN"), // só ADMIN pode rodar esse job manualmente
  asyncHandler(async (req, res) => {
    const agora = new Date()
    const daqui15 = new Date(agora.getTime() + 15 * 60 * 1000)

    // 1) "Finalizar" reservas cujo fim já passou
    // (no painel você exibe CANCELADA como "Finalizada")
    const finalizadas = await prisma.reserva.updateMany({
      where: {
        fim: { lt: agora },
        status: { not: Status_reserva.CANCELADA },
      },
      data: { status: Status_reserva.CANCELADA },
    })

    // 2) Lembrete: reservas que começam em até 15min
    const reservasProximas = await prisma.reserva.findMany({
      where: {
        inicio: { gte: agora, lte: daqui15 },
        status: { not: Status_reserva.CANCELADA },
      },
      include: {
        cliente: {
          include: {
            usuario: true,
          },
        },
        maquina: true,
      },
    })

    const janelaNotificacao = new Date(agora.getTime() - 20 * 60 * 1000)
    let lembretesEnviados = 0

    for (const reserva of reservasProximas) {
      const usuario = reserva.cliente?.usuario
      if (!usuario) continue

      // já tem notificação recente desse tipo pra esse usuário?
      const existeNotif = await prisma.notificacao.findFirst({
        where: {
          usuarioId: usuario.id,
          titulo: "Sua reserva começa em breve",
          createdAt: { gte: janelaNotificacao },
        },
      })

      if (existeNotif) continue

      const horarioFormatado = reserva.inicio.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })

      await prisma.notificacao.create({
        data: {
          usuarioId: usuario.id,
          titulo: "Sua reserva começa em breve",
          mensagem: `Sua reserva para a máquina ${reserva.maquina.tipo} está marcada para ${horarioFormatado}.`,
          tipo: TipoNotificacao.ALERTA,
        },
      })

      lembretesEnviados++
    }

    return res.json({
      ok: true,
      horarioExecucao: agora.toISOString(),
      reservasFinalizadas: finalizadas.count,
      lembretesEnviados,
    })
  })
)

export default router
