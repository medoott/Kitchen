-- Expand PaymentMethod with CARD
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'STRIPE', 'PAYPAL');
ALTER TABLE "payments" ALTER COLUMN "method" TYPE "PaymentMethod" USING "method"::text::"PaymentMethod";
DROP TYPE "PaymentMethod_old";

-- Expand PaymentStatus (drop COMPLETED, add PROCESSING/AWAITING_CASH_PAYMENT/PAID/CANCELLED/PARTIALLY_REFUNDED)
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'AWAITING_CASH_PAYMENT',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus"
  USING CASE "status"::text
    WHEN 'COMPLETED' THEN 'PAID'::"PaymentStatus"
    ELSE "status"::text::"PaymentStatus"
  END;
DROP TYPE "PaymentStatus_old";

-- New Payment columns
ALTER TABLE "payments" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "payments" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN "confirmedById" TEXT;
ALTER TABLE "payments" ADD COLUMN "staffNote" TEXT;
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "payments_orderId_transactionId_key" ON "payments"("orderId", "transactionId");

-- Denormalized payment snapshot on Order
ALTER TABLE "orders" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "orders" ADD COLUMN "paymentMethod" "PaymentMethod";
