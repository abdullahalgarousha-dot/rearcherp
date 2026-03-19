-- PostgreSQL RLS Enforcement Script for REARCH
-- This script enables Row-Level Security for all multi-tenant tables.
-- Run this in your PostgreSQL terminal (psql or pgAdmin).

DO $$
DECLARE
    row RECORD;
BEGIN
    FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    AND tablename NOT IN ('_prisma_migrations', 'Tenant')
    LOOP
        -- 1. Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', row.tablename);
        
        -- 2. Create Isolation Policy (if it doesn't exist)
        EXECUTE format('
            DROP POLICY IF EXISTS tenant_isolation_policy ON %I;
            CREATE POLICY tenant_isolation_policy ON %I
            USING (
                tenant_id = current_setting(''app.current_tenant_id'', true)
                OR 
                (SELECT role FROM "User" WHERE id = current_setting(''app.current_user_id'', true)) = ''GLOBAL_SUPER_ADMIN''
            )', row.tablename, row.tablename, row.tablename);
            
        RAISE NOTICE 'RLS Enabled on table: %', row.tablename;
    END LOOP;
END $$;
