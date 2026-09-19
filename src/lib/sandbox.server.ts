import { Sandbox } from "novita-sandbox";
import { createServerSupabase } from "./db.server";

export const WORKDIR = "/home/user/workspace";
const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;
const SKIP = ["node_modules", ".git", "dist", ".cache", "__pycache__", ".venv"];

function apiKey() {
  const key = process.env["NOVITA_API_KEY"];
  if (!key) throw new Error("Sandbox is not configured (missing key).");
  return key;
}

export async function getSandbox(workspaceId: string) {
  const key = apiKey();
  const supabase = createServerSupabase();
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, sandbox_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (ws?.sandbox_id) {
    try {
      const existing = await Sandbox.connect(ws.sandbox_id, { apiKey: key });
      await existing.setTimeout(SANDBOX_TIMEOUT_MS);
      return existing;
    } catch {
      /* expired — create a new one below */
    }
  }

  const sandbox = await Sandbox.create({ apiKey: key, timeoutMs: SANDBOX_TIMEOUT_MS });
  await sandbox.commands.run(`mkdir -p ${WORKDIR}`);

  // Restore the persisted workspace files into the fresh sandbox.
  const { data: files } = await supabase
    .from("files")
    .select("path, content")
    .eq("workspace_id", workspaceId);
  for (const file of files ?? []) {
    try {
      await sandbox.files.write(`${WORKDIR}/${file.path}`, file.content ?? "");
    } catch {
      /* ignore individual restore failures */
    }
  }

  await supabase.from("workspaces").update({ sandbox_id: sandbox.sandboxId }).eq("id", workspaceId);
  return sandbox;
}

export async function runCommand(workspaceId: string, command: string) {
  const sandbox = await getSandbox(workspaceId);
  try {
    const result = await sandbox.commands.run(command, {
      cwd: WORKDIR,
      timeoutMs: 120_000,
    });
    await syncFromSandbox(workspaceId, sandbox);
    return {
      exitCode: result.exitCode,
      stdout: (result.stdout ?? "").slice(-8000),
      stderr: (result.stderr ?? "").slice(-4000),
    };
  } catch (error) {
    const err = error as { exitCode?: number; stdout?: string; stderr?: string; message?: string };
    return {
      exitCode: err.exitCode ?? 1,
      stdout: (err.stdout ?? "").slice(-8000),
      stderr: (err.stderr ?? err.message ?? "Command failed").slice(-4000),
    };
  }
}

/** Mirror the sandbox workspace back into the database so the editor stays in sync. */
export async function syncFromSandbox(workspaceId: string, sandbox?: Awaited<ReturnType<typeof getSandbox>>) {
  const box = sandbox ?? (await getSandbox(workspaceId));
  const supabase = createServerSupabase();
  const listing = await box.commands.run(
    `find . -type f -size -200k ${SKIP.map((s) => `-not -path './${s}/*'`).join(" ")} | head -300`,
    { cwd: WORKDIR },
  );
  const paths = (listing.stdout ?? "")
    .split("\n")
    .map((p) => p.trim().replace(/^\.\//, ""))
    .filter(Boolean);

  const rows: { workspace_id: string; path: string; content: string; updated_at: string }[] = [];
  for (const path of paths) {
    try {
      const content = await box.files.read(`${WORKDIR}/${path}`);
      rows.push({
        workspace_id: workspaceId,
        path,
        content: typeof content === "string" ? content : "",
        updated_at: new Date().toISOString(),
      });
    } catch {
      /* binary or unreadable file */
    }
  }

  if (rows.length) {
    await supabase.from("files").upsert(rows, { onConflict: "workspace_id,path" });
  }
  const keep = new Set(rows.map((r) => r.path));
  const { data: existing } = await supabase
    .from("files")
    .select("id, path")
    .eq("workspace_id", workspaceId);
  const stale = (existing ?? []).filter((f) => !keep.has(f.path)).map((f) => f.id);
  if (stale.length) await supabase.from("files").delete().in("id", stale);
  return paths;
}

export async function writeFile(workspaceId: string, path: string, content: string) {
  const clean = path.replace(/^\/+/, "");
  const supabase = createServerSupabase();
  await supabase
    .from("files")
    .upsert(
      { workspace_id: workspaceId, path: clean, content, updated_at: new Date().toISOString() },
      { onConflict: "workspace_id,path" },
    );
  try {
    const sandbox = await getSandbox(workspaceId);
    await sandbox.files.write(`${WORKDIR}/${clean}`, content);
  } catch {
    /* the file stays saved in the cloud workspace even if the sandbox is down */
  }
  return clean;
}

export async function deleteFile(workspaceId: string, path: string) {
  const clean = path.replace(/^\/+/, "");
  const supabase = createServerSupabase();
  await supabase.from("files").delete().eq("workspace_id", workspaceId).eq("path", clean);
  try {
    const sandbox = await getSandbox(workspaceId);
    await sandbox.files.remove(`${WORKDIR}/${clean}`);
  } catch {
    /* ignore */
  }
  return clean;
}

export async function listFiles(workspaceId: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("files")
    .select("path, content")
    .eq("workspace_id", workspaceId)
    .order("path");
  return (data ?? []).map((f) => ({ path: f.path, bytes: (f.content ?? "").length }));
}

export async function readFile(workspaceId: string, path: string) {
  const clean = path.replace(/^\/+/, "");
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("files")
    .select("content")
    .eq("workspace_id", workspaceId)
    .eq("path", clean)
    .maybeSingle();
  if (!data) throw new Error(`File not found: ${clean}`);
  return data.content ?? "";
}
