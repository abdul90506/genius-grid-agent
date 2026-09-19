import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ShellInput = z.object({ workspaceId: z.string().uuid(), command: z.string().min(1) });

export const runShellCommand = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ShellInput.parse(input))
  .handler(async ({ data }) => {
    const { runCommand } = await import("@/lib/sandbox.server");
    try {
      return await runCommand(data.workspaceId, data.command);
    } catch (error) {
      return { exitCode: 1, stdout: "", stderr: (error as Error).message };
    }
  });

const SaveInput = z.object({
  workspaceId: z.string().uuid(),
  path: z.string().min(1),
  content: z.string(),
});

export const saveWorkspaceFile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data }) => {
    const { writeFile } = await import("@/lib/sandbox.server");
    return { path: await writeFile(data.workspaceId, data.path, data.content) };
  });

const DeleteInput = z.object({ workspaceId: z.string().uuid(), path: z.string().min(1) });

export const deleteWorkspaceFile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ data }) => {
    const { deleteFile } = await import("@/lib/sandbox.server");
    return { path: await deleteFile(data.workspaceId, data.path) };
  });
