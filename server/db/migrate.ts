import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema';

/**
 * Database Migration Script for Develoop Take-off Pro
 * 
 * This script performs the following migrations:
 * 1. Adds userId column to projects table
 * 2. Adds deletedAt column to projects table (soft delete)
 * 3. Creates audit_logs table
 * 4. Adds indexes for performance
 */

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client, { schema });

  console.log('🔄 Starting database migration...');

  try {
    // Migration 1: Add userId to projects table if not exists
    console.log('\n📦 Migration 1: Adding userId to projects table...');
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'projects' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE projects ADD COLUMN user_id VARCHAR(255) REFERENCES users(id);
          CREATE INDEX idx_projects_user_id ON projects(user_id);
          RAISE NOTICE 'Added user_id column to projects table';
        ELSE
          RAISE NOTICE 'user_id column already exists in projects table';
        END IF;
      END $$;
    `;
    console.log('✅ Migration 1 complete');

    // Migration 2: Add deletedAt to projects table if not exists
    console.log('\n📦 Migration 2: Adding deletedAt to projects table...');
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'projects' AND column_name = 'deleted_at'
        ) THEN
          ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP;
          CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
          RAISE NOTICE 'Added deleted_at column to projects table';
        ELSE
          RAISE NOTICE 'deleted_at column already exists in projects table';
        END IF;
      END $$;
    `;
    console.log('✅ Migration 2 complete');

    // Migration 3: Create audit_logs table if not exists
    console.log('\n📦 Migration 3: Creating audit_logs table...');
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'audit_logs'
        ) THEN
          CREATE TABLE audit_logs (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) REFERENCES users(id),
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            old_values JSONB,
            new_values JSONB,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX idx_audit_user ON audit_logs(user_id);
          CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
          CREATE INDEX idx_audit_created ON audit_logs(created_at);
          
          RAISE NOTICE 'Created audit_logs table';
        ELSE
          RAISE NOTICE 'audit_logs table already exists';
        END IF;
      END $$;
    `;
    console.log('✅ Migration 3 complete');

    // Migration 4: Ensure critical_paths table exists
    console.log('\n📦 Migration 4: Ensuring critical_paths table exists...');
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'critical_paths'
        ) THEN
          CREATE TABLE critical_paths (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id),
            task_id INTEGER NOT NULL REFERENCES tasks(id),
            earliest_start TIMESTAMP NOT NULL,
            earliest_finish TIMESTAMP NOT NULL,
            latest_start TIMESTAMP NOT NULL,
            latest_finish TIMESTAMP NOT NULL,
            slack INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX idx_critical_path_project ON critical_paths(project_id);
          CREATE INDEX idx_critical_path_task ON critical_paths(task_id);
          
          RAISE NOTICE 'Created critical_paths table';
        ELSE
          RAISE NOTICE 'critical_paths table already exists';
        END IF;
      END $$;
    `;
    console.log('✅ Migration 4 complete');

    // Migration 5: Add resource_assignments table if not exists
    console.log('\n📦 Migration 5: Ensuring resource_assignments table exists...');
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'resource_assignments'
        ) THEN
          CREATE TABLE resource_assignments (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES tasks(id),
            resource_id INTEGER NOT NULL REFERENCES resources(id),
            hours INTEGER NOT NULL
          );
          
          CREATE INDEX idx_resource_assignment_task ON resource_assignments(task_id);
          CREATE INDEX idx_resource_assignment_resource ON resource_assignments(resource_id);
          
          RAISE NOTICE 'Created resource_assignments table';
        ELSE
          RAISE NOTICE 'resource_assignments table already exists';
        END IF;
      END $$;
    `;
    console.log('✅ Migration 5 complete');

    // Migration 6: Ensure resources table exists
    console.log('\n📦 Migration 6: Ensuring resources table exists...');
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'resources'
        ) THEN
          CREATE TABLE resources (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            cost_per_hour DECIMAL(10, 2) NOT NULL
          );
          
          RAISE NOTICE 'Created resources table';
        ELSE
          RAISE NOTICE 'resources table already exists';
        END IF;
      END $$;
    `;
    console.log('✅ Migration 6 complete');

    // Migration 7: Add updated_at trigger for critical_paths
    console.log('\n📦 Migration 7: Adding updated_at trigger for critical_paths...');
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'critical_paths' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE critical_paths ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        END IF;
        
        -- Create or replace the trigger function
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        -- Drop trigger if exists to avoid errors
        DROP TRIGGER IF EXISTS update_critical_paths_updated_at ON critical_paths;
        
        -- Create the trigger
        CREATE TRIGGER update_critical_paths_updated_at
          BEFORE UPDATE ON critical_paths
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
          
        RAISE NOTICE 'Added updated_at trigger for critical_paths';
      END $$;
    `;
    console.log('✅ Migration 7 complete');

    // Verify all tables
    console.log('\n🔍 Verifying database schema...');
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log('\n📋 Existing tables:');
    tables.forEach((t: any) => console.log(`   - ${t.table_name}`));

    // Verify indexes
    const indexes = await client`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;
    
    console.log('\n📋 Custom indexes:');
    indexes.forEach((i: any) => console.log(`   - ${i.tablename}: ${i.indexname}`));

    console.log('\n✅ All migrations completed successfully!');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await client.end();
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

export { migrate };
