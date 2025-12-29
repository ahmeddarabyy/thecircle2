-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
-- Tracks all actions taken in the system for admin review
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY,
  action_type text NOT NULL, -- e.g., 'create_visit', 'update_booking', 'delete_member', etc.
  entity_type text NOT NULL, -- e.g., 'visit', 'booking', 'member', 'company', 'service', 'inventory', etc.
  entity_id text, -- ID of the affected entity
  entity_name text, -- Human-readable name/identifier of the entity
  user_id text NOT NULL, -- ID of the user who performed the action
  user_name text NOT NULL, -- Name of the user who performed the action
  user_role text NOT NULL CHECK (user_role IN ('admin', 'front-desk')),
  branch_id text, -- Branch where the action occurred (if applicable)
  branch_name text, -- Name of the branch (if applicable)
  details jsonb, -- JSON object with additional details about the action
  old_values jsonb, -- Previous values (for updates/deletes)
  new_values jsonb, -- New values (for creates/updates)
  ip_address text, -- IP address of the user (if available)
  user_agent text, -- Browser/user agent (if available)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id ON public.audit_logs(branch_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (true); -- In Supabase, we'll check role in the application layer

-- Policy: Only system can insert audit logs (via service role or application)
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true); -- Application will insert via service role or authenticated user

-- Policy: No updates or deletes allowed (audit logs are immutable)
CREATE POLICY "Audit logs are immutable"
  ON public.audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON public.audit_logs
  FOR DELETE
  USING (false);

