import { FilePlus2, RefreshCw, Trash2, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspaceFile } from "@/lib/workspace-client";
import { cn } from "@/lib/utils";

type Props = {
  files: WorkspaceFile[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onCreate: () => void;
  onDelete: (path: string) => void;
  onRefresh: () => void;
  busy?: boolean;
};

export function FileExplorer({
  files,
  activePath,
  onSelect,
  onCreate,
  onDelete,
  onRefresh,
  busy,
}: Props) {
  return (
    <div className="flex h-full flex-col border-r border-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Files
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onRefresh} aria-label="Refresh files">
            <RefreshCw className={cn("size-4", busy && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onCreate} aria-label="New file">
            <FilePlus2 className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {files.length === 0 && (
          <p className="px-3 py-6 text-xs leading-relaxed text-muted-foreground">
            No files yet. Ask the agent to build something, or create a file.
          </p>
        )}
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              "group flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
              activePath === file.path
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-secondary",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(file.path)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-xs">{file.path}</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(file.path)}
              aria-label={`Delete ${file.path}`}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
