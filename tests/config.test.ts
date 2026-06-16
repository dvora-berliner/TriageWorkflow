import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("dotenv", () => ({ config: vi.fn() }));

describe("config", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.resetModules();
    await expect(import("../src/config")).rejects.toThrow("Missing ANTHROPIC_API_KEY");
  });

  it("loads config with default model name", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.resetModules();
    const { config } = await import("../src/config");
    expect(config.anthropicApiKey).toBe("test-key");
    expect(config.modelName).toBe("claude-sonnet-4-6");
  });

  it("uses MODEL_NAME from env when set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("MODEL_NAME", "claude-opus-4-8");
    vi.resetModules();
    const { config } = await import("../src/config");
    expect(config.modelName).toBe("claude-opus-4-8");
  });
});
