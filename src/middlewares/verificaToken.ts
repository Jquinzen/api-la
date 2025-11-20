import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { JwtUser } from "../types/auth.js"

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser
    }
  }
}

export function verificaToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token ausente" })
  }

  const token = header.split(" ")[1]

  try {
    const secret = process.env.JWT_SECRET!
    const payload = jwt.verify(token, secret) as JwtUser

    if (!payload?.id || !payload?.tipo) {
      return res.status(401).json({ erro: "Token inválido" })
    }

    req.user = payload
    next()
  } catch {
    return res.status(401).json({ erro: "Token inválido" })
  }
}