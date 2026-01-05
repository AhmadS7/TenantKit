-- Enable Row Level Security on all tables
-- This migration enables RLS and creates policies for tenant isolation

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policy for tenants table: tenants can only see themselves
CREATE POLICY tenants_isolation_policy ON tenants
    FOR ALL
    USING (id = current_setting('app.current_tenant')::uuid);

-- Enable RLS on users table (global table, but still needs protection)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users table policy: allow access when tenant context is set
-- This allows users to be accessed across tenants for membership management
CREATE POLICY users_access_policy ON users
    FOR ALL
    USING (current_setting('app.current_tenant')::uuid IS NOT NULL);

-- Enable RLS on memberships table
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Policy for memberships table: only allow access to memberships of current tenant
CREATE POLICY memberships_tenant_isolation_policy ON memberships
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Create a role for the application that does NOT have SUPERUSER or BYPASSRLS
-- Note: This should be run by a superuser, then the app should connect as this role
DO $$
BEGIN
    -- Create the application role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cortex_app') THEN
        CREATE ROLE cortex_app LOGIN PASSWORD 'change_this_password';
    END IF;

    -- Ensure the role does NOT have SUPERUSER privileges
    ALTER ROLE cortex_app NOSUPERUSER;

    -- Ensure the role does NOT have BYPASSRLS privileges
    ALTER ROLE cortex_app NOBYPASSRLS;

    -- Grant necessary permissions to the application role
    GRANT CONNECT ON DATABASE cortex TO cortex_app;
    GRANT USAGE ON SCHEMA public TO cortex_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cortex_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cortex_app;

    -- Grant permissions on future tables/sequences
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cortex_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cortex_app;
END $$;

-- Create a special policy for the migrations table to allow the app role to bypass RLS
-- This assumes you'll have a migrations table for tracking schema changes
-- If using TypeORM migrations, this table is typically created automatically
DO $$
BEGIN
    -- Check if migrations table exists and create bypass policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations') THEN
        ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;
        CREATE POLICY migrations_bypass_policy ON migrations
            FOR ALL
            USING (true); -- Allow all operations on migrations table
    END IF;
END $$;