-- =====================================================
-- Migration: Add senior-leader relationship and helper RPCs
-- Date: 2025-09-25
-- Safe to run multiple times (idempotent where possible)
-- =====================================================

BEGIN;

-- 1) Add column profiles.senior_id (nullable) with FK and index
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS senior_id UUID;

-- Add FK constraint (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_senior_id_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_senior_id_fkey
      FOREIGN KEY (senior_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Index on senior_id
CREATE INDEX IF NOT EXISTS idx_profiles_senior_id ON profiles(senior_id);

-- 2) Comment on column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'senior_id'
  ) THEN
    COMMENT ON COLUMN profiles.senior_id IS 'ID del Senior asignado para el líder (nullable)';
  END IF;
END$$;

-- 3) RLS policy: seniors can view their assigned leaders
-- Drop existing policy with same name to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Seniors can view assigned leaders'
  ) THEN
    DROP POLICY "Seniors can view assigned leaders" ON profiles;
  END IF;
END$$;

CREATE POLICY "Seniors can view assigned leaders" ON profiles
  FOR SELECT USING (
    role = 'lider' AND senior_id = auth.uid()
  );

-- 4) RPC: get_leaders_for_senior(p_senior_id)
CREATE OR REPLACE FUNCTION get_leaders_for_senior(p_senior_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  generation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.name, p.email, p.generation
  FROM profiles p
  WHERE p.role = 'lider' AND p.senior_id = p_senior_id
  ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_leaders_for_senior IS 'Lista los líderes asignados a un senior específico';

COMMIT;


