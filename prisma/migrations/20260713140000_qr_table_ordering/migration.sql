-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'ORDERING', 'WAITING_FOOD', 'WAITING_WAITER', 'READY_TO_PAY', 'CLOSED');

-- CreateEnum
CREATE TYPE "CallWaiterStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED');

-- AlterTable orders
ALTER TABLE "orders" ADD COLUMN     "tableId" TEXT,
ADD COLUMN     "tableSessionId" TEXT;

-- AlterTable tables (qrToken backfilled for existing rows)
ALTER TABLE "tables" ADD COLUMN "qrToken" TEXT;
UPDATE "tables" SET "qrToken" = gen_random_uuid()::text WHERE "qrToken" IS NULL;
ALTER TABLE "tables" ALTER COLUMN "qrToken" SET NOT NULL;
ALTER TABLE "tables" ADD COLUMN "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE';

-- CreateTable
CREATE TABLE "table_sessions" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "cart" JSONB,
    "status" "TableStatus" NOT NULL DEFAULT 'ORDERING',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_waiter_requests" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" "CallWaiterStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "call_waiter_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "table_sessions_sessionToken_key" ON "table_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "tables_qrToken_key" ON "tables"("qrToken");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "table_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_waiter_requests" ADD CONSTRAINT "call_waiter_requests_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
