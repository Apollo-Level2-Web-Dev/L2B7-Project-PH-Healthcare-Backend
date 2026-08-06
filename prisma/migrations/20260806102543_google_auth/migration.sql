/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'CREDENTIAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIAL',
ADD COLUMN     "googleId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
