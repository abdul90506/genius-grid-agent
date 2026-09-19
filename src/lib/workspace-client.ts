import { supabase } from "@/integrations/supabase/client";

const KEY = "nova.workspace.id";

export async function ensureWorkspace(): Promise<string> {
  const existing = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  if (existing) {
    const { data } = await supabase.from("workspaces").select("id").eq("id", existing).maybeSingle();
    if (data?.id) return data.id;
  }
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: "My Workspace" })
    .select("id")
    .single();
  if (error) throw error;
  localStorage.setItem(KEY, data.id);
  return data.id;
}

export type WorkspaceFile = { id: string; path: string; content: string };

export async function fetchFiles(workspaceId: string): Promise<WorkspaceFile[]> {
  const { data, error } = await supabase
    .from("files")
    .select("id, path, content")
    .eq("workspace_id", workspaceId)
    .order("path");
  if (error) throw error;
  return (data ?? []).map((f) => ({ id: f.id, path: f.path, content: f.content ?? "" }));
}

export type AgentSettings = {
  model: string;
  reasoning: "low" | "medium" | "high";
  systemPrompt: string;
};

const SETTINGS_KEY = "nova.settings";

export function loadSettings(defaults: AgentSettings): AgentSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<AgentSettings>) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: AgentSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
