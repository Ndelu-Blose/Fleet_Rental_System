// Vitest setup file
// This runs before all tests

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test"
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret"
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

