CREATE TABLE "CollaborationComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "finaleId" TEXT NOT NULL,
    "authorId" TEXT,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborationComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CollaborationComment"
ADD CONSTRAINT "CollaborationComment_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "EnterpriseTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaborationComment"
ADD CONSTRAINT "CollaborationComment_finaleId_fkey"
FOREIGN KEY ("finaleId") REFERENCES "SimulationFinale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
