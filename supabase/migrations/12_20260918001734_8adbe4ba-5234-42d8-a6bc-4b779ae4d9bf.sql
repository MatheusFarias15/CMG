REVOKE EXECUTE ON FUNCTION private.protect_activity_assignment_fields() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.protect_activity_assignment_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION private.protect_activity_assignment_fields() FROM authenticated;
REVOKE EXECUTE ON FUNCTION private.protect_activity_assignment_fields() FROM service_role;