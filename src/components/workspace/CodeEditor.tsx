import { useEffect, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { saveWorkspaceFile } from "@/lib/workspace.functions";
import type { WorkspaceFile } from "@/lib/workspace-client";

export function CodeEditor({
  workspaceId,
  file,
  onSaved,
}: {
  workspaceId: string;
  file: WorkspaceFile | null;
  onSaved: () => void;
}) {
  const save = useServerFn(saveWorkspaceFile);
  const [content, setContent] = useState(file?.content ?? "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContent(file?.content ?? "");
    setDirty(false);
  }, [file?.id, file?.content]);

  async function handleSave() {
    if (!file || saving) return;
    setSaving(true);
    try {
      await save({ data: { workspaceId, path: file.path, content } });
      setDirty(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (!file) {
    return (
      <div className="relative flex h-full items-center justify-center bg-card">
        <div className="hairline-grid pointer-events-none absolute inset-0" />
        <p className="relative text-sm text-muted-foreground">
          Select a file to view and edit it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="truncate font-mono text-xs text-foreground">{file.path}</span>
        <Button
          size="sm"
          variant={dirty ? "default" : "ghost"}
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : dirty ? (
            <Save className="size-3.5" />
          ) : (
            <Check className="size-3.5" />
          )}
          {dirty ? "Save" : "Saved"}
        </Button>
      </div>
      <textarea
        value={content}
        spellCheck={false}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            void handleSave();
          }
        }}
        className="flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-relaxed outline-none"
      />
    </div>
  );
}
