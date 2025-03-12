import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a postgres client with connection pooling
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Idle connection timeout in seconds
  connect_timeout: 10, // Connection timeout in seconds
  max_lifetime: 60 * 30 // Maximum connection lifetime in seconds (30 minutes)
});

// Initialize drizzle with the query client and schema
export const db = drizzle(queryClient, { schema });

// Ping database to verify connection
queryClient`SELECT 1`.then(() => {
  console.log('Database connection established successfully');
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});