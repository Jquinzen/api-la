import { NextFunction, Request, Response } from "express"

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)
  if (err?.name === "ZodError") {
    const flat = err.flatten?.()
    return res.status(400).json({ erro: "Dados inválidos", detalhes: flat?.fieldErrors ?? err.errors })
  }
  if (err?.code?.startsWith?.("P")) {

    return res.status(400).json({ erro: "Erro de banco", code: err.code, meta: err.meta })
  }
  res.status(500).json({ erro: "Erro interno" })
}
