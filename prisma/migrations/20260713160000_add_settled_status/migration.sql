-- Add the SETTLED (Paid / Settled) order status — the terminal stage
-- that follows PICKED_UP (and DELIVERED) once payment is confirmed.
ALTER TYPE "OrderStatus" ADD VALUE 'SETTLED';
