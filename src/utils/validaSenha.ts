// Regras: mínimo 8, pelo menos 1 minúscula, 1 maiúscula, 1 número e 1 símbolo
export function validaSenha(senha: string): string[] {
  const erros: string[] = []

  if (senha.length < 8) {
    erros.push("A senha deve ter no mínimo 8 caracteres.")
  }

  const temMinuscula = /[a-z]/.test(senha)
  const temMaiuscula = /[A-Z]/.test(senha)
  const temNumero = /[0-9]/.test(senha)
  const temSimbolo = /[^a-zA-Z0-9]/.test(senha) 

  if (!temMinuscula) erros.push("A senha deve conter pelo menos uma letra minúscula.")
  if (!temMaiuscula) erros.push("A senha deve conter pelo menos uma letra maiúscula.")
  if (!temNumero) erros.push("A senha deve conter pelo menos um número.")
  if (!temSimbolo) erros.push("A senha deve conter pelo menos um símbolo (ex: !, @, #, $, %).")

  return erros
}
