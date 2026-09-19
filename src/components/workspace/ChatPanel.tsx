import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Brain, Settings2, Square } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import type { AgentSettings } from "@/lib/workspace-client";

const SUGGESTIONS = [
  "Create a Python script that scrapes a webpage and run it",
  "Set up a small Express API and test it with curl",
  "Analyze every file in the workspace and list issues",
];

export function ChatPanel({
  workspaceId,
  settings,
  onOpenSettings,
  onFilesChanged,
}: {
  workspaceId: string;
  settings: AgentSettings;
  onOpenSettings: () => void;
  onFilesChanged: () => void;
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          workspaceId,
          model: settings.model,
          reasoning: settings.reasoning,
          systemPrompt: settings.systemPrompt,
        },
      }),
    [workspaceId, settings.model, settings.reasoning, settings.systemPrompt],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    id: workspaceId,
    transport,
    onFinish: () => {
      onFilesChanged();
      textareaRef.current?.focus();
    },
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    void sendMessage({ text: value });
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Agent
          </span>
          <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {settings.model.split("/")[1]}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} aria-label="Agent settings">
          <Settings2 className="size-4" />
        </Button>
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="gap-4">
          {messages.length === 0 && (
            <div className="space-y-3 px-1 py-6">
              <p className="text-sm text-muted-foreground">
                Ask me to build, edit, analyze or run anything. I work in a real Linux sandbox.
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return <MessageResponse key={index}>{part.text}</MessageResponse>;
                  }
                  if (part.type === "reasoning" && part.text) {
                    return (
                      <div
                        key={index}
                        className="flex gap-2 border-l-2 border-border pl-3 text-xs text-muted-foreground"
                      >
                        <Brain className="mt-0.5 size-3.5 shrink-0" />
                        <span className="whitespace-pre-wrap">{part.text}</span>
                      </div>
                    );
                  }
                  if (part.type.startsWith("tool-")) {
                    const toolPart = part as unknown as {
                      type: `tool-${string}`;
                      state: "input-streaming" | "input-available" | "output-available" | "output-error";
                      input?: unknown;
                      output?: unknown;
                      errorText?: string;
                    };
                    return (
                      <Tool key={index} defaultOpen={false}>
                        <ToolHeader type={toolPart.type} state={toolPart.state} />
                        <ToolContent>
                          <ToolInput input={toolPart.input} />
                          <ToolOutput
                            output={
                              toolPart.output ? (
                                <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap">
                                  {typeof toolPart.output === "string"
                                    ? toolPart.output
                                    : JSON.stringify(toolPart.output, null, 2).slice(0, 4000)}
                                </pre>
                              ) : undefined
                            }
                            errorText={toolPart.errorText}
                          />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" && <Shimmer className="text-sm">Thinking...</Shimmer>}
          {error && (
            <p className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
              {error.message}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={(_, event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell the agent what to build..."
          />
          <PromptInputFooter className="justify-end">
            {busy ? (
              <Button type="button" size="icon-sm" variant="outline" onClick={() => stop()}>
                <Square className="size-3.5" />
              </Button>
            ) : (
              <PromptInputSubmit status={status} disabled={!input.trim()} />
            )}
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
