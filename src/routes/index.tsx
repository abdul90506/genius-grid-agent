import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Settings2, Loader2 } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { FileExplorer } from "@/components/workspace/FileExplorer";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { Terminal } from "@/components/workspace/Terminal";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { SettingsDialog } from "@/components/workspace/SettingsDialog";
import { DEFAULT_MODEL } from "@/lib/models";
import {
  ensureWorkspace,
  fetchFiles,
  loadSettings,
  saveSettings,
  type AgentSettings,
  type WorkspaceFile,
} from "@/lib/workspace-client";
import { deleteWorkspaceFile, saveWorkspaceFile } from "@/lib/workspace.functions";

export const Route = createFileRoute("/")({
  component: Index,
});

const DEFAULT_SETTINGS: AgentSettings = {
  model: DEFAULT_MODEL,
  reasoning: "medium",
  systemPrompt: "",
};

function Index() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings(DEFAULT_SETTINGS));
    ensureWorkspace()
      .then(setWorkspaceId)
      .catch((error: Error) => toast.error(error.message));
  }, []);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      setFiles(await fetchFiles(workspaceId));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate() {
    if (!workspaceId) return;
    const path = window.prompt("File path", "src/main.py");
    if (!path) return;
    await saveWorkspaceFile({ data: { workspaceId, path, content: "" } });
    setActivePath(path);
    await refresh();
  }

  async function handleDelete(path: string) {
    if (!workspaceId) return;
    await deleteWorkspaceFile({ data: { workspaceId, path } });
    if (activePath === path) setActivePath(null);
    await refresh();
  }

  const activeFile = files.find((file) => file.path === activePath) ?? null;

  if (!workspaceId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flat flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-sm bg-primary">
            <Sparkles className="size-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Nova</span>
          <span className="text-xs text-muted-foreground">
            AI agent workspace · cloud sandbox
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="size-3.5" />
          Settings
        </Button>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={18} minSize={12}>
          <FileExplorer
            files={files}
            activePath={activePath}
            onSelect={setActivePath}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onRefresh={refresh}
            busy={loading}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={25}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={65} minSize={20}>
              <CodeEditor workspaceId={workspaceId} file={activeFile} onSaved={refresh} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={35} minSize={15}>
              <Terminal workspaceId={workspaceId} onCommandDone={refresh} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={32} minSize={22}>
          <ChatPanel
            workspaceId={workspaceId}
            settings={settings}
            onOpenSettings={() => setSettingsOpen(true)}
            onFilesChanged={refresh}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={(next) => {
          setSettings(next);
          saveSettings(next);
          toast.success("Settings saved");
        }}
      />
      <Toaster />
    </div>
  );
}
