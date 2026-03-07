-- CreateTable
CREATE TABLE "flagged_keywords" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flagged_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flagged_keywords_facility_id_phrase_key" ON "flagged_keywords"("facility_id", "phrase");

-- AddForeignKey
ALTER TABLE "flagged_keywords" ADD CONSTRAINT "flagged_keywords_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_keywords" ADD CONSTRAINT "flagged_keywords_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
