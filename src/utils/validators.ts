import { z } from "zod"

// Usuario
export const usuarioCreateSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email(),
  senha: z.string().min(6),
  tipo: z.enum(["CLIENTE", "PROPRIETARIO", "ADMIN"]),
})

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
})

// Lavanderia
export const lavanderiaSchema = z.object({
  nomeFantasia: z.string().min(3),


  razaoSocial: z
    .string()
    .min(3)
    .optional()
    .or(z.literal("").transform(() => undefined)),

  endereco: z.string().min(5),

  telefone: z
    .string()
    .min(8)
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),

  horarioAbertura: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),

  horarioFechamento: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),

  descricao: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),

  fotoUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),

  latitude: z.number().optional(),
  longitude: z.number().optional(),

  proprietario_id: z.string().uuid().optional(),

  destaque: z.boolean().optional(),
})

// Máquina
export const maquinaSchema = z.object({
  tipo: z.enum(["LAVADORA", "SECADORA"]).default("LAVADORA"),
  status_maquina: z
    .enum(["DISPONIVEL", "EM_USO", "EM_MANUTENCAO"])
    .default("DISPONIVEL"),
  capacidade: z.number().int().positive().default(4),
  preco: z.number().positive(),
  lavanderia_id: z.string().uuid(),
})

// Reserva
export const reservaCreateSchema = z.object({
  maquina_id: z.string().uuid(),
  inicio: z.coerce.date(),
  pagamento_id: z.string().uuid().optional(),
})

export const reservaUpdateSchema = z.object({
  status: z.enum(["FEITA", "EM_ANDAMENTO", "CANCELADA"]).optional(),
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
  maquina_id: z.string().uuid().optional(),
  pagamento_id: z.string().uuid().optional(),
})

// Pagamento
export const pagamentoSchema = z.object({
  metodo: z.enum(["PIX"]).default("PIX"),
  status: z.enum(["FEITO", "PENDENTE", "CANCELADO"]).default("PENDENTE"),
})

// Avaliação
export const avaliacaoSchema = z.object({
  nota: z.number().int().min(1).max(5),
  comentario: z.string().min(1).max(255),
  cliente_id: z.string().uuid(),
  lavanderia_id: z.string().uuid(),
})

// Proprietário
export const proprietarioSchema = z.object({
  usuarioId: z.string().uuid(),
  nivel_privilegio: z.enum(["PLANO_BASICO", "PLANO_PREMIUM"]).optional(),
})