import { Request, Response, NextFunction } from "express"

export function requireRole(...roles: Array<"ADMIN" | "PROPRIETARIO" | "CLIENTE">) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tipo = req.user?.tipo
    if (!tipo || !roles.includes(tipo)) {
      return res.status(403).json({ erro: "Acesso negado" })
    }
    next()
  }
}
