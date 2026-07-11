-- Updated Waste dMRV Database Schema
-- Incorporates custom tables: users, projects, collection_records, evidence, anomalies, audit_logs.
-- Sets up RLS policies and configures storage bucket: evidence-photos.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'field_worker')) DEFAULT 'field_worker' NOT NULL,
    status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Table: projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name TEXT NOT NULL,
    site_name TEXT NOT NULL,
    address TEXT,
    gps_latitude NUMERIC(10,7),
    gps_longitude NUMERIC(10,7),
    waste_type TEXT CHECK (waste_type IN ('municipal_solid', 'organic', 'plastic', 'construction', 'mixed')),
    operator_name TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Table: collection_records
CREATE TABLE IF NOT EXISTS public.collection_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT NOT NULL,
    worker_id UUID REFERENCES public.users(id) ON DELETE RESTRICT NOT NULL,
    waste_type TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit TEXT CHECK (unit IN ('kg', 'ton')) DEFAULT 'kg' NOT NULL,
    notes TEXT,
    gps_latitude NUMERIC(10,7),
    gps_longitude NUMERIC(10,7),
    collected_at TIMESTAMPTZ NOT NULL,
    verification_status TEXT CHECK (verification_status IN ('verified', 'pending_review', 'rejected')) DEFAULT 'pending_review' NOT NULL,
    risk_score TEXT CHECK (risk_score IN ('normal', 'warning', 'high_risk')) DEFAULT 'normal' NOT NULL,
    sync_status TEXT CHECK (sync_status IN ('draft', 'pending_sync', 'synced')) DEFAULT 'draft' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Table: evidence
CREATE TABLE IF NOT EXISTS public.evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES public.collection_records(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Table: anomalies
CREATE TABLE IF NOT EXISTS public.anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES public.collection_records(id) ON DELETE CASCADE NOT NULL,
    anomaly_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('warning', 'high_risk')),
    status TEXT CHECK (status IN ('open', 'resolved', 'dismissed')) DEFAULT 'open' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Table: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance & audit searches
CREATE INDEX IF NOT EXISTS idx_users_mobile ON public.users(mobile);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_records_project ON public.collection_records(project_id);
CREATE INDEX IF NOT EXISTS idx_records_worker ON public.collection_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON public.collection_records(verification_status);
CREATE INDEX IF NOT EXISTS idx_evidence_record ON public.evidence(record_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_record ON public.anomalies(record_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- RLS POLICIES FOR USERS TABLE
-- ----------------------------------------------------
CREATE POLICY "Users can read own row" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admin can read all rows in users" 
ON public.users FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can manage users" 
ON public.users FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----------------------------------------------------
-- RLS POLICIES FOR PROJECTS TABLE
-- ----------------------------------------------------
CREATE POLICY "All authenticated users can read projects" 
ON public.projects FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only admin can create/update/delete projects" 
ON public.projects FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----------------------------------------------------
-- RLS POLICIES FOR COLLECTION_RECORDS TABLE
-- ----------------------------------------------------
CREATE POLICY "Workers can view own records" 
ON public.collection_records FOR SELECT 
USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create own records" 
ON public.collection_records FOR INSERT 
WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Admin can read all collection records" 
ON public.collection_records FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can manage all collection records" 
ON public.collection_records FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----------------------------------------------------
-- RLS POLICIES FOR EVIDENCE TABLE
-- ----------------------------------------------------
CREATE POLICY "Authenticated users can read evidence" 
ON public.evidence FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Workers can add evidence for their own records" 
ON public.evidence FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collection_records r
    WHERE r.id = record_id AND r.worker_id = auth.uid()
  )
);

CREATE POLICY "Admin can delete/update evidence" 
ON public.evidence FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----------------------------------------------------
-- RLS POLICIES FOR ANOMALIES TABLE
-- ----------------------------------------------------
CREATE POLICY "Workers can view anomalies for their own records" 
ON public.anomalies FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.collection_records r
    WHERE r.id = record_id AND r.worker_id = auth.uid()
  )
);

CREATE POLICY "Admin can manage all anomalies" 
ON public.anomalies FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----------------------------------------------------
-- RLS POLICIES FOR AUDIT_LOGS TABLE
-- ----------------------------------------------------
CREATE POLICY "Admin can manage audit logs" 
ON public.audit_logs FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----------------------------------------------------
-- SUPABASE STORAGE BUCKET CONFIGURATION
-- ----------------------------------------------------
-- Insert bucket definition
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'evidence-photos', 
    'evidence-photos', 
    true, -- public read
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket objects
CREATE POLICY "Allow public read for evidence photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'evidence-photos');

CREATE POLICY "Allow authenticated uploads for evidence photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "Allow admin to manage evidence photos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'evidence-photos' AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
