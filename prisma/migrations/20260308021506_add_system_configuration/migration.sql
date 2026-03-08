-- CreateTable
CREATE TABLE "system_configuration" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configuration_pkey" PRIMARY KEY ("key")
);
