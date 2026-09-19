import { useEffect, useRef, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { runShellCommand } from "@/lib/workspace.functions";

type Line = { kind: "cmd" | "out" | "err"; text: string };

export function Terminal({
  workspaceId,
  onCommandDone,
}: {
  workspaceId: string;
  onCommandDone: () => void;
}) {
  const run = useServerFn(runShellCommand);
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "Cloud sandbox ready — /home/user/workspace" },
  ]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const command = value.trim();
    if (!command || busy) return;
    setValue("");
    setLines((l) => [...l, { kind: "cmd", text: command }]);
    setBusy(true);
    try {
      const result = await run({ data: { workspaceId, command } });
      setLines((l) => [
        ...l,
        ...(result.stdout ? [{ kind: "out" as const, text: result.stdout }] : []),
        ...(result.stderr ? [{ kind: "err" as const, text: result.stderr }] : []),
        ...(!result.stdout && !result.stderr
          ? [{ kind: "out" as const, text: `exit ${result.exitCode}` }]
          : []),
      ]);
      onCommandDone();
    } catch (error) {
      setLines((l) => [...l, { kind: "err", text: (error as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Terminal
        </span>
        {busy && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed">
        {lines.map((line, i) => (
          <pre
            key={i}
            className={
              line.kind === "cmd"
                ? "text-primary"
                : line.kind === "err"
                  ? "text-destructive"
                  : "text-foreground"
            }
          >
            {line.kind === "cmd" ? `$ ${line.text}` : line.text}
          </pre>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border px-3 py-2">
        <ChevronRight className="size-4 shrink-0 text-primary" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ls -la"
          spellCheck={false}
          className="flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  );
}
