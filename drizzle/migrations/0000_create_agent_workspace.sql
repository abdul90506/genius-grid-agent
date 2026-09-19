CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Workspace',
  sandbox_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, path)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_ws ON public.files(workspace_id);
CREATE INDEX idx_messages_ws ON public.messages(workspace_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;
GRANT ALL ON public.workspaces TO service_role;
GRANT ALL ON public.files TO service_role;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces open" ON public.workspaces FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "files open" ON public.files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "messages open" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);