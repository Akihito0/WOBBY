-- ============================================================================
-- WOBBY DATABASE MIGRATIONS
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to create the required tables
-- for tracking runs and workouts
-- ============================================================================

-- Create runs table for storing tracked run data
CREATE TABLE IF NOT EXISTS public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Workout Metadata
  title text NOT NULL,
  description text,
  workout_type text DEFAULT 'Run', -- 'Run', 'Cycle', 'Hike', etc.
  
  -- Distance & Duration
  distance numeric NOT NULL, -- in kilometers
  duration integer NOT NULL, -- in seconds
  pace text, -- formatted as "MM'SS""
  
  -- Elevation Data
  elevation_gain integer DEFAULT 0, -- in meters
  elevation_loss integer DEFAULT 0, -- in meters
  min_elevation integer DEFAULT 0, -- in meters
  max_elevation integer DEFAULT 0, -- in meters
  average_elevation integer, -- in meters
  
  -- Route Data
  route_coordinates jsonb, -- Array of {latitude, longitude, altitude} objects
  
  -- Timestamps
  started_at timestamp with time zone,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Additional fields for future features
  is_public boolean DEFAULT false,
  share_url text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON public.runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON public.runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_user_created ON public.runs(user_id, created_at DESC);

-- Enable RLS (Row Level Security) on runs table
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for runs table
-- Allow users to insert their own runs
CREATE POLICY "Users can create their own runs"
  ON public.runs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own runs and public runs
CREATE POLICY "Users can view their own runs and public runs"
  ON public.runs
  FOR SELECT
  USING (
    auth.uid() = user_id OR is_public = true
  );

-- Allow users to update their own runs
CREATE POLICY "Users can update their own runs"
  ON public.runs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own runs
CREATE POLICY "Users can delete their own runs"
  ON public.runs
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- OPTIONAL: Create run_stats view for easier querying of aggregate data
-- ============================================================================

CREATE VIEW IF NOT EXISTS public.run_stats AS
SELECT
  user_id,
  COUNT(*) as total_runs,
  ROUND(SUM(distance)::numeric, 2) as total_distance,
  SUM(duration) as total_duration,
  ROUND(AVG(distance)::numeric, 2) as average_distance,
  ROUND(AVG(pace::numeric), 2) as average_pace,
  SUM(elevation_gain) as total_elevation_gain,
  COUNT(DISTINCT DATE(created_at)) as days_active,
  MAX(created_at) as last_run,
  MIN(created_at) as first_run
FROM public.runs
WHERE user_id = auth.uid()
GROUP BY user_id;

-- ============================================================================
-- NOTES:
-- 1. Run this script in your Supabase SQL Editor
-- 2. Make sure your profiles table exists (created during initial setup)
-- 3. The route_coordinates field stores GeoJSON-like coordinate data
-- 4. Elevation metrics are automatically calculated by the Run feature
-- 5. Background location tracking works with foreground permissions
-- ============================================================================
