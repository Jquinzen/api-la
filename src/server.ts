import { app } from "./app.js"

const PORT = Number(process.env.PORT ?? 3333)
app.listen(PORT, () => {
  console.log(`HTTP server rodando em http://localhost:${PORT}`)
})
