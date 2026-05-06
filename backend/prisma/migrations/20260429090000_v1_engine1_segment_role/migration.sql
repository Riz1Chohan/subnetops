-- V1: preserve explicit Engine 1 VLAN segment role in production migrations.
ALTER TABLE "Vlan" ADD COLUMN IF NOT EXISTS "segmentRole" TEXT;
