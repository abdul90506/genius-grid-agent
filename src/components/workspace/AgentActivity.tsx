import { useState } from "react";
import {
  Braces,
  Check,
  ChevronRight,
  CircleAlert,
  FileCode2,
  FolderSearch2,
  Globe2,
  LoaderCircle,
  MemoryStick,
  Search,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

export type ActivityPart = {
  type: `tool-${string}`;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

type AnyRecord = Record<string, unknown>;

function record(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

function fileKind(path: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const labels: Record<string, string> = {
    ts: "TS", tsx: "TSX", js: "JS", jsx: "JSX", py: "PY", css: "CSS",
    html: "HTML", json: "JSON", md: "MD", go: "GO", rs: "RS", sh: "SH",
  };
  return labels[extension] ?? (extension.slice(0, 4).toUpperCase() || "FILE");
}

function display(part: ActivityPart) {
  const name = part.type.replace(/^tool-/, "");
  const input = record(part.input);
  const output = record(part.output);
  const path = String(output.path ?? input.path ?? "");
  const command = String(input.command ?? output.command ?? "command");
  const query = String(input.query ?? output.query ?? "workspace");
  const pending = part.state === "input-streaming" || part.state === "input-available";

  if (name === "write_file") {
    return {
      icon: FileCode2,
      verb: pending ? "Editing" : output.action === "created" ? "Created" : "Edited",
      subject: path,
      badge: fileKind(path),
      additions: Number(output.additions ?? 0),
      deletions: Number(output.deletions ?? 0),
    };
  }
  if (name === "delete_file") return { icon: Trash2, verb: pending ? "Deleting" : "Deleted", subject: path };
  if (name === "run_command") return { icon: TerminalSquare, verb: pending ? "Running" : "Ran", subject: command };
  if (name === "search_code") return { icon: Search, verb: pending ? "Searching" : "Searched", subject: query };
  if (name === "index_codebase") {
    const count = Number(output.fileCount ?? 0);
    return { icon: FolderSearch2, verb: pending ? "Analyzing codebase" : "Analyzed", subject: count ? `${count} files` : "codebase" };
  }
  if (name === "search_web") return { icon: Globe2, verb: pending ? "Searching web" : "Searched web", subject: query };
  if (name === "remember") return { icon: MemoryStick, verb: pending ? "Updating memory" : "Remembered", subject: String(input.memory ?? "workspace context") };
  if (name === "read_memory") return { icon: MemoryStick, verb: pending ? "Reading memory" : "Recalled", subject: "workspace memory" };
  if (name === "list_files") return { icon: FolderSearch2, verb: pending ? "Exploring" : "Explored", subject: `${Array.isArray(output.files) ? output.files.length : ""} files`.trim() };
  if (name === "read_file") return { icon: FileCode2, verb: pending ? "Reading" : "Read", subject: path, badge: fileKind(path) };
  return { icon: Braces, verb: pending ? "Working" : "Completed", subject: name.replaceAll("_", " ") };
}

export function AgentActivity({ part }: { part: ActivityPart }) {
  const [open, setOpen] = useState(false);
  const item = display(part);
  const Icon = item.icon;
  const pending = part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error";

  return (
    <div className="w-full py-0.5 text-[13px]">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-start gap-2 px-0 py-1.5 font-normal hover:bg-transparent"
        onClick={() => setOpen((value) => !value)}
      >
        {pending ? (
          <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
        ) : failed ? (
          <CircleAlert className="size-3.5 text-destructive" />
        ) : (
          <Check className="size-3.5 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">{item.verb}</span>
        <Icon className="size-3.5 text-muted-foreground" />
        {item.badge && <span className="font-mono text-xs font-semibold text-primary">{item.badge}</span>}
        <span className="min-w-0 truncate font-mono text-foreground">{item.subject}</span>
        {typeof item.additions === "number" && (
          <span className="ml-1 font-mono text-success">+{item.additions}</span>
        )}
        {typeof item.deletions === "number" && (
          <span className="font-mono text-destructive">-{item.deletions}</span>
        )}
        <ChevronRight className={cn("ml-auto size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
      </Button>
      {open && (
        <div className="ml-5 border-l border-border py-2 pl-4">
          {part.errorText ? (
            <p className="text-xs text-destructive">{part.errorText}</p>
          ) : (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
              {JSON.stringify(part.output ?? part.input ?? {}, null, 2).slice(0, 3000)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}