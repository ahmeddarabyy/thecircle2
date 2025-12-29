-- =====================================================
-- Inventory History Table
-- =====================================================
-- Tracks all changes to inventory items including:
-- - Stock additions
-- - Stock reductions
-- - Item updates
-- - Who made the change
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory_history (
  id text PRIMARY KEY,
  inventory_item_id text NOT NULL, -- FK to inventory_items
  change_type text NOT NULL CHECK (change_type IN ('add', 'reduce', 'update', 'create', 'delete')),
  previous_stock numeric DEFAULT 0,
  new_stock numeric DEFAULT 0,
  quantity_changed numeric DEFAULT 0, -- Positive for add, negative for reduce
  changed_by_user_id text, -- FK to users (who made the change)
  changed_by_user_name text, -- Store user name for quick reference
  reason text, -- Optional reason for the change
  notes text, -- Additional notes
  branch_id text, -- Which branch this change occurred at
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_history_item_id ON public.inventory_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON public.inventory_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_history_branch_id ON public.inventory_history(branch_id);

-- Enable RLS
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for inventory_history" ON "public"."inventory_history";
CREATE POLICY "Enable all access for inventory_history" ON "public"."inventory_history"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

