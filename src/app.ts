import "dotenv/config"
import express from "express"
import morgan from "morgan"
import { errorHandler } from "./middlewares/errorHandler.js"

import auth from "./routes/auth.js"
import clientes from "./routes/clientes.js"
import proprietarios from "./routes/proprietarios.js"
import lavanderias from "./routes/lavanderias.js"
import maquinas from "./routes/maquinas.js"
import reservas from "./routes/reservas.js"
import pagamentos from "./routes/pagamentos.js"
import avaliacoes from "./routes/avaliacoes.js"
import relatorios from "./routes/relatorios.js"
import usuarios from "./routes/usuarios.js"        
import enderecos from "./routes/enderecos.js"      
import notificacoes from "./routes/notificacoes.js" 

export const app = express()

app.use(express.json())
app.use(morgan("dev"))

app.get("/health", (_req, res) => res.json({ ok: true }))

app.use("/auth", auth)
app.use("/clientes", clientes)
app.use("/proprietarios", proprietarios)
app.use("/lavanderias", lavanderias)
app.use("/maquinas", maquinas)
app.use("/reservas", reservas)
app.use("/pagamentos", pagamentos)
app.use("/avaliacoes", avaliacoes)
app.use("/relatorios", relatorios)
app.use("/usuarios", usuarios)          
app.use("/endereco", enderecos)        
app.use("/notificacoes", notificacoes)  

app.use(errorHandler)
