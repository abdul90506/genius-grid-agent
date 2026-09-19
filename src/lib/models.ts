export type ModelOption = {
  id: string;
  label: string;
  note: string;
};

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "openai/gpt-6-astra", label: "Astra (default)", note: "Most capable — deep reasoning & coding" },
  { id: "openai/gpt-5.6-sol", label: "Sol", note: "Flagship reasoning and agentic work" },
  { id: "openai/gpt-5.6-terra", label: "Terra", note: "Balanced everyday work" },
  { id: "openai/gpt-5.6-luna", label: "Luna", note: "Fast and low cost" },
  { id: "openai/gpt-5.5", label: "GPT-5.5", note: "State-of-the-art coding" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini", note: "Quick, cheap tasks" },
];

export const DEFAULT_MODEL = "openai/gpt-6-astra";

export const REASONING_LEVELS = ["low", "medium", "high"] as const;
export type ReasoningLevel = (typeof REASONING_LEVELS)[number];
