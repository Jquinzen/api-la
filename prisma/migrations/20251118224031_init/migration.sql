-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('CLIENTE', 'PROPRIETARIO', 'ADMIN');

-- CreateEnum
CREATE TYPE "Status_reserva" AS ENUM ('FEITA', 'EM_ANDAMENTO', 'CANCELADA');

-- CreateEnum
CREATE TYPE "Status_maquina" AS ENUM ('DISPONIVEL', 'EM_USO', 'EM_MANUTENCAO');

-- CreateEnum
CREATE TYPE "Tipo_maquina" AS ENUM ('LAVADORA', 'SECADORA');

-- CreateEnum
CREATE TYPE "Niveis_privilegio" AS ENUM ('PLANO_BASICO', 'PLANO_PREMIUM');

-- CreateEnum
CREATE TYPE "Metodo_Pagamento" AS ENUM ('PIX');

-- CreateEnum
CREATE TYPE "Status_Pagamento" AS ENUM ('FEITO', 'PENDENTE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('SISTEMA', 'PROMOCAO', 'ALERTA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(30) NOT NULL,
    "email" VARCHAR(60) NOT NULL,
    "senha" VARCHAR(72) NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "telefone" VARCHAR(20),
    "fotoUrl" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proprietario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nivel_privilegio" "Niveis_privilegio" NOT NULL DEFAULT 'PLANO_BASICO',

    CONSTRAINT "Proprietario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nivel" SMALLINT NOT NULL DEFAULT 2,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lavanderia" (
    "id" TEXT NOT NULL,
    "nomeFantasia" VARCHAR(60) NOT NULL,
    "razaoSocial" VARCHAR(100) NOT NULL,
    "endereco" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20),
    "horarioAbertura" VARCHAR(10),
    "horarioFechamento" VARCHAR(10),
    "descricao" VARCHAR(255),
    "fotoUrl" VARCHAR(255),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "proprietario_id" TEXT NOT NULL,
    "qntMaquinas" INTEGER NOT NULL DEFAULT 0,
    "destaque" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lavanderia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maquina" (
    "id" TEXT NOT NULL,
    "tipo" "Tipo_maquina" NOT NULL DEFAULT 'LAVADORA',
    "status_maquina" "Status_maquina" NOT NULL DEFAULT 'DISPONIVEL',
    "capacidade" INTEGER NOT NULL DEFAULT 4,
    "preco" DECIMAL(10,2) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "lavanderia_id" TEXT NOT NULL,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maquina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relatorio" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "proprietario_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "status" "Status_reserva" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "cliente_id" TEXT NOT NULL,
    "maquina_id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" VARCHAR(255) NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "lavanderia_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "metodo" "Metodo_Pagamento" NOT NULL DEFAULT 'PIX',
    "status" "Status_Pagamento" NOT NULL DEFAULT 'PENDENTE',
    "reservaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "mensagem" VARCHAR(255) NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL DEFAULT 'SISTEMA',
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endereco" (
    "id" TEXT NOT NULL,
    "apelido" VARCHAR(30) NOT NULL,
    "rua" VARCHAR(100) NOT NULL,
    "bairro" VARCHAR(60) NOT NULL,
    "cidade" VARCHAR(60) NOT NULL,
    "estado" VARCHAR(2) NOT NULL,
    "cep" VARCHAR(9),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "clienteId" TEXT NOT NULL,

    CONSTRAINT "Endereco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL NOT NULL,
    "adminId" TEXT NOT NULL,
    "descricao" VARCHAR(60) NOT NULL,
    "complemento" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AdminLavanderias" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_usuarioId_key" ON "Cliente"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Proprietario_usuarioId_key" ON "Proprietario"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_usuarioId_key" ON "Admin"("usuarioId");

-- CreateIndex
CREATE INDEX "Lavanderia_latitude_longitude_idx" ON "Lavanderia"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Reserva_cliente_id_inicio_idx" ON "Reserva"("cliente_id", "inicio");

-- CreateIndex
CREATE INDEX "Reserva_maquina_id_inicio_idx" ON "Reserva"("maquina_id", "inicio");

-- CreateIndex
CREATE INDEX "Reserva_status_inicio_idx" ON "Reserva"("status", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_maquina_id_inicio_key" ON "Reserva"("maquina_id", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_reservaId_key" ON "Pagamento"("reservaId");

-- CreateIndex
CREATE UNIQUE INDEX "_AdminLavanderias_AB_unique" ON "_AdminLavanderias"("A", "B");

-- CreateIndex
CREATE INDEX "_AdminLavanderias_B_index" ON "_AdminLavanderias"("B");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proprietario" ADD CONSTRAINT "Proprietario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lavanderia" ADD CONSTRAINT "Lavanderia_proprietario_id_fkey" FOREIGN KEY ("proprietario_id") REFERENCES "Proprietario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maquina" ADD CONSTRAINT "Maquina_lavanderia_id_fkey" FOREIGN KEY ("lavanderia_id") REFERENCES "Lavanderia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maquina" ADD CONSTRAINT "Maquina_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relatorio" ADD CONSTRAINT "Relatorio_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relatorio" ADD CONSTRAINT "Relatorio_proprietario_id_fkey" FOREIGN KEY ("proprietario_id") REFERENCES "Proprietario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "Maquina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_lavanderia_id_fkey" FOREIGN KEY ("lavanderia_id") REFERENCES "Lavanderia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endereco" ADD CONSTRAINT "Endereco_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdminLavanderias" ADD CONSTRAINT "_AdminLavanderias_A_fkey" FOREIGN KEY ("A") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdminLavanderias" ADD CONSTRAINT "_AdminLavanderias_B_fkey" FOREIGN KEY ("B") REFERENCES "Lavanderia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
