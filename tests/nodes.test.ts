import { describe, it, expect, vi } from "vitest";
import { GraphState } from "../src/types";

vi.mock("../src/googleSheets", () => ({
  appendRowToGoogleSheet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@langchain/langgraph", async (orig) => {
  const actual = await orig<typeof import("@langchain/langgraph")>();
  return { ...actual, interrupt: vi.fn().mockReturnValue({ approved: true }) };
});

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn().mockResolvedValue({
    category: "medical",
    urgency: "low",
    severity: "low",
    confidence: 0.9,
    rationale: "Clear test incident text.",
    missing_info: [],
    summary: "Test summary",
    user_name: "Jane",
  }),
}));

vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: class {
    withStructuredOutput() { return { invoke: mockInvoke }; }
  },
}));

import {
  preprocessNode, classifyNode, routerNode,
  requestInfoNode, escalateNode, dispatchNode, manualHandlingNode,
} from "../src/nodes";
import { appendRowToGoogleSheet } from "../src/googleSheets";
import { interrupt } from "@langchain/langgraph";

const base: GraphState = {
  incident: { id: "T-001", raw_text: "  Test   incident!!! ", timestamp: "2024-01-01" },
  preprocessed_text: "",
  classification: null,
  route: null,
  final_action: "",
  phone_number: null,
  human_approved: null,
};

const withClassification = (overrides: object): GraphState => ({
  ...base,
  preprocessed_text: "test",
  classification: {
    category: "medical" as const,
    urgency: "low" as const,
    severity: "low" as const,
    confidence: 0.9,
    rationale: "Default rationale",
    missing_info: [],
    summary: "A summary",
    user_name: null,
    ...overrides,
  },
});

describe("preprocessNode", () => {
  it("cleans whitespace, lowercases, collapses punctuation", () => {
    expect(preprocessNode(base).preprocessed_text).toBe("test incident!");
  });
  it("extracts Israeli phone (05x format)", () => {
    const s = { ...base, incident: { ...base.incident, raw_text: "call 0501234567 now" } };
    expect(preprocessNode(s).phone_number).toBe("0501234567");
  });
  it("extracts +972 format phone", () => {
    const s = { ...base, incident: { ...base.incident, raw_text: "+972501234567" } };
    expect(preprocessNode(s).phone_number).toBeTruthy();
  });
  it("returns null phone when none present", () => {
    expect(preprocessNode(base).phone_number).toBeNull();
  });
});

describe("classifyNode", () => {
  it("returns classification from model", async () => {
    const r = await classifyNode({ ...base, preprocessed_text: "someone is hurt" });
    expect(r.classification).toMatchObject({ category: "medical", urgency: "low" });
  });

  it("handles missing_info in response", async () => {
    mockInvoke.mockResolvedValueOnce({
      category: "rescue", urgency: "medium", severity: "medium", confidence: 0.8, rationale: "Missing fields text.", missing_info: ["address"], summary: "s", user_name: null,
    });
    const r = await classifyNode({ ...base, preprocessed_text: "stuck" });
    expect(r.classification?.missing_info).toContain("address");
  });
});

describe("routerNode", () => {
  it("escalates when no classification", () => {
    expect(routerNode(base).route).toBe("escalate_to_human");
  });
  it("escalates on critical urgency", () => {
    const r = routerNode(withClassification({ urgency: "critical" }));
    expect(r.route).toBe("escalate_to_human");
    expect(r.final_action).toContain("life-threatening");
  });
  it("escalates when missing_info not empty", () => {
    const r = routerNode(withClassification({ urgency: "medium", missing_info: ["address"] }));
    expect(r.route).toBe("escalate_to_human");
    expect(r.final_action).toContain("missing info");
  });
  it("escalates on low model confidence", () => {
    const r = routerNode(withClassification({ confidence: 0.4 }));
    expect(r.route).toBe("escalate_to_human");
    expect(r.final_action).toContain("low model confidence");
  });
  it("escalates on catastrophic severity level", () => {
    const r = routerNode(withClassification({ urgency: "low", severity: "catastrophic" }));
    expect(r.route).toBe("escalate_to_human");
    expect(r.final_action).toContain("catastrophic severity");
  });
  it("auto_dispatch on low urgency, no missing info, high confidence", () => {
    const r = routerNode(withClassification({ urgency: "low", severity: "low", confidence: 0.9 }));
    expect(r.route).toBe("auto_dispatch");
    expect(r.final_action).toContain("Auto-dispatching");
  });
  it("auto_dispatch on medium urgency, no missing info", () => {
    expect(routerNode(withClassification({ urgency: "medium" })).route).toBe("auto_dispatch");
  });
});

describe("requestInfoNode", () => {
  it("returns approved=true", () => {
    vi.mocked(interrupt).mockReturnValueOnce({ approved: true });
    expect(requestInfoNode({ ...base, final_action: "ESCALATE" }).human_approved).toBe(true);
  });
  it("returns approved=false", () => {
    vi.mocked(interrupt).mockReturnValueOnce({ approved: false });
    expect(requestInfoNode({ ...base, final_action: "ESCALATE" }).human_approved).toBe(false);
  });
});

describe("escalateNode", () => {
  it("calls sheet with escalated=true and correct data", async () => {
    await escalateNode({ ...withClassification({ user_name: "Alice" }), phone_number: "050", final_action: "go" });
    expect(appendRowToGoogleSheet).toHaveBeenCalledWith("Alice", "050", "A summary", true);
  });
  it("uses fallbacks when data missing", async () => {
    await escalateNode({ ...base, final_action: "go" });
    expect(appendRowToGoogleSheet).toHaveBeenCalledWith("Not Mentioned", "No Phone Found", base.incident.raw_text, true);
  });
});

describe("dispatchNode", () => {
  it("returns empty object", () => {
    expect(dispatchNode({ ...withClassification({}), final_action: "go" })).toEqual({});
  });
});

describe("manualHandlingNode", () => {
  it("calls sheet with escalated=false", async () => {
    await manualHandlingNode({ ...withClassification({ user_name: "Bob" }), phone_number: "052", final_action: "" });
    expect(appendRowToGoogleSheet).toHaveBeenCalledWith("Bob", "052", "A summary", false);
  });
  it("sets final_action to manual logbook message", async () => {
    const r = await manualHandlingNode({ ...base, final_action: "" });
    expect(r.final_action).toContain("manual logbook");
  });
});
