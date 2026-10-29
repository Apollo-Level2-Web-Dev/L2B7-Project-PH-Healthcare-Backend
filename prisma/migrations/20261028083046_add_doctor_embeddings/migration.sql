-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "doctor_embeddings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT,
    "metadata" JSONB,
    "embedding" vector NOT NULL,

    CONSTRAINT "doctor_embeddings_pkey" PRIMARY KEY ("id")
);
