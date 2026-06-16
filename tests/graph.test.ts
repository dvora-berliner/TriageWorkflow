import { describe, it, expect, vi } from "vitest";

vi.mock("../src/googleSheets", () => ({ appendRowToGoogleSheet: vi.fn() }));
vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: class {
    withStructuredOutput() { return { invoke: vi.fn() }; }
  },
}));

import { buildGraph, routingEdge, postApprovalEdge, last } from "../src/graph";
import { MemorySaver } from "@langchain/langgraph";
import { GraphState } from "../src/types";

const base: GraphState = {
  incident: { id: "T-001", raw_text: "test", timestamp: "" },
  preprocessed_text: "", classification: null, route: null,
  final_action: "", phone_number: null, human_approved: null,
};

describe("buildGraph", () => {
  it("builds without throwing", () => {
    expect(() => buildGraph()).not.toThrow();
  });
  it("builds with MemorySaver checkpointer", () => {
    expect(() => buildGraph(new MemorySaver())).not.toThrow();
  });
});

describe("routingEdge", () => {
  it("returns request_info when escalate_to_human", () => {
    expect(routingEdge({ ...base, route: "escalate_to_human" })).toBe("request_info");
  });
  it("returns dispatch otherwise", () => {
    expect(routingEdge({ ...base, route: "auto_dispatch" })).toBe("dispatch");
  });
});

describe("postApprovalEdge", () => {
  it("returns escalate when approved", () => {
    expect(postApprovalEdge({ ...base, human_approved: true })).toBe("escalate");
  });
  it("returns manual when not approved", () => {
    expect(postApprovalEdge({ ...base, human_approved: false })).toBe("manual");
  });
});

describe("last", () => {
  it("returns b when b is defined", () => { expect(last("a", "b")).toBe("b"); });
  it("returns a when b is null", () => { expect(last("a", null)).toBe("a"); });
  it("returns a when b is undefined", () => { expect(last("a", undefined)).toBe("a"); });
});
