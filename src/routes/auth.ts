import { Router, Request, Response } from "express"
import { prisma } from "../lib/prisma.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { loginSchema, usuarioCreateSchema } from "../utils/validators.js"
import { validaSenha } from "../utils/validaSenha.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const router = Router()


router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const data = usuarioCreateSchema.parse(req.body)


    const errosSenha = validaSenha(data.senha)
    if (errosSenha.length > 0) {
      return res.status(400).json({ erro: "Senha inválida", detalhes: errosSenha })
    }

  
    const emailJaExiste = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (emailJaExiste) return res.status(409).json({ erro: "E-mail já cadastrado" })


    const hash = await bcrypt.hash(data.senha, 10)

    const usuario = await prisma.usuario.create({
      data: { nome: data.nome, email: data.email, senha: hash, tipo: data.tipo },
    })

    // cria registro do papel
    if (data.tipo === "CLIENTE") {
      await prisma.cliente.create({ data: { usuarioId: usuario.id } })
    } else if (data.tipo === "PROPRIETARIO") {
      await prisma.proprietario.create({ data: { usuarioId: usuario.id } })
    } else {
      await prisma.admin.create({ data: { usuarioId: usuario.id } })
    }

    res.status(201).json({ ok: true, id: usuario.id })
  })
)


router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, senha } = loginSchema.parse(req.body)

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario) return res.status(401).json({ erro: "Credenciais inválidas" })

    const ok = await bcrypt.compare(senha, usuario.senha)
    if (!ok) return res.status(401).json({ erro: "Credenciais inválidas" })

    const token = jwt.sign({ id: usuario.id, tipo: usuario.tipo }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    })

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
    })
  })
)

export default router
