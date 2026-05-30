-- Safe helper function for tenant context
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Safe helper for user context
CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop broken policies
DROP POLICY IF EXISTS users_access_policy ON users;
DROP POLICY IF EXISTS tenants_access_policy ON tenants;
DROP POLICY IF EXISTS memberships_access_policy ON memberships;
DROP POLICY IF EXISTS tenants_isolation_policy ON tenants;
DROP POLICY IF EXISTS memberships_tenant_isolation_policy ON memberships;
DROP POLICY IF EXISTS users_isolation_policy ON users;

-- Tenants: see only your own
CREATE POLICY tenant_isolation ON tenants
FOR ALL
USING (id = current_tenant_id());

-- Memberships: see only rows in your tenant
CREATE POLICY membership_isolation ON memberships
FOR ALL
USING (tenant_id = current_tenant_id());

-- Users: see yourself + users linked via membership in current tenant
CREATE POLICY user_isolation ON users
FOR ALL
USING (
    id = current_user_id()
    OR EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.user_id = users.id
        AND m.tenant_id = current_tenant_id()
    )
);
