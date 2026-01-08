-- Create unique index to ensure only one ACTIVE contract per vehicle
-- This prevents double-booking at the database level
CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_contract_per_vehicle"
ON "RentalContract" ("vehicleId")
WHERE "status" = 'ACTIVE';
