import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai-gateway.server";
import { DEFAULT_MODEL } from "@/lib/models";

const SYSTEM = `You are Nova, an elite autonomous coding agent running inside a real cloud Linux sandbox.

Workspace root: /home/user/workspace — every relative path is inside it.

How you work:
- Plan briefly, then ACT with tools. Never ask permission for ordinary file or command work.
- Inspect before editing: list_files / read_file first when you are unsure.
- write_file replaces the entire file content, so always send the complete final file.
- run_command gives you a real shell (bash, node, python3, npm, pip, git, curl). Use it to install packages, run tests, and verify your work.
- After changing code, verify by running it. Report real output, never imagined output.
- Keep answers short and concrete. Use markdown, fenced code for snippets.
- Match the user's language (including Urdu/Hinglish) in your replies.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI is not configured." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body = (await request.json()) as {
          messages: UIMessage[];
          workspaceId: string;
          model?: string;
          reasoning?: "low" | "medium" | "high";
          systemPrompt?: string;
        };

        const workspaceId = body.workspaceId;
        if (!workspaceId) {
          return new Response(JSON.stringify({ error: "Missing workspace." }), { status: 400 });
        }

        const sandboxModule = await import("@/lib/sandbox.server");

        const runIdFetch = createLovableAiGatewayRunIdFetch();
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: {
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
          fetch: runIdFetch.fetch,
        });

        const tools = {
          list_files: tool({
            description: "List every file in the workspace with its size.",
            inputSchema: z.object({}),
            execute: async () => ({ files: await sandboxModule.listFiles(workspaceId) }),
          }),
          read_file: tool({
            description: "Read the full contents of one file.",
            inputSchema: z.object({ path: z.string().describe("Relative path, e.g. src/app.py") }),
            execute: async ({ path }) => {
              try {
                return { path, content: await sandboxModule.readFile(workspaceId, path) };
              } catch (error) {
                return { path, error: (error as Error).message };
              }
            },
          }),
          write_file: tool({
            description: "Create or overwrite a file with the complete final content.",
            inputSchema: z.object({
              path: z.string().describe("Relative path inside the workspace"),
              content: z.string().describe("Full file content"),
            }),
            execute: async ({ path, content }) => {
              const saved = await sandboxModule.writeFile(workspaceId, path, content);
              return { path: saved, bytes: content.length, saved: true };
            },
          }),
          delete_file: tool({
            description: "Delete a file from the workspace.",
            inputSchema: z.object({ path: z.string() }),
            execute: async ({ path }) => ({
              path: await sandboxModule.deleteFile(workspaceId, path),
              deleted: true,
            }),
          }),
          run_command: tool({
            description:
              "Run a shell command in the real Linux sandbox (cwd = workspace root). Returns exit code, stdout and stderr.",
            inputSchema: z.object({
              command: z.string().describe("The shell command, e.g. 'python3 main.py'"),
            }),
            execute: async ({ command }) => {
              try {
                return await sandboxModule.runCommand(workspaceId, command);
              } catch (error) {
                return { exitCode: 1, stdout: "", stderr: (error as Error).message };
              }
            },
          }),
        };

        try {
          const result = streamText({
            model: lovable.responses(body.model || DEFAULT_MODEL),
            system: body.systemPrompt?.trim() ? `${SYSTEM}\n\n${body.systemPrompt.trim()}` : SYSTEM,
            messages: await convertToModelMessages(body.messages),
            tools,
            stopWhen: stepCountIs(50),
            abortSignal: request.signal,
            providerOptions: {
              openai: {
                store: false,
                include: ["reasoning.encrypted_content"],
                forceReasoning: true,
                reasoningEffort: body.reasoning ?? "medium",
                reasoningSummary: "auto",
              },
            },
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages,
            sendReasoning: true,
          });
        } catch (error) {
          if ((error as Error).name === "AbortError") return new Response(null, { status: 499 });
          return new Response(
            JSON.stringify({ error: (error as Error).message || "The agent failed to respond." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
