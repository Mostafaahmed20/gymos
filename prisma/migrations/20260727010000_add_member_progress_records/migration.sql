CREATE TABLE "public"."MemberProgressRecord" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "beforePhotoUrl" TEXT,
    "afterPhotoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MemberProgressRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemberProgressRecord_gymId_measuredAt_deletedAt_idx" ON "public"."MemberProgressRecord"("gymId", "measuredAt", "deletedAt");
CREATE INDEX "MemberProgressRecord_memberId_measuredAt_deletedAt_idx" ON "public"."MemberProgressRecord"("memberId", "measuredAt", "deletedAt");

ALTER TABLE "public"."MemberProgressRecord" ADD CONSTRAINT "MemberProgressRecord_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "public"."Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."MemberProgressRecord" ADD CONSTRAINT "MemberProgressRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
