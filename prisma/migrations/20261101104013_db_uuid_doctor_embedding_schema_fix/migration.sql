/*
  Warnings:

  - The primary key for the `doctor_embeddings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `doctor_embeddings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "doctor_embeddings" DROP CONSTRAINT "doctor_embeddings_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "doctor_embeddings_pkey" PRIMARY KEY ("id");
