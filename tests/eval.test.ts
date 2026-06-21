import { expect, test, describe } from "vitest";
import { classifyNode } from "../src/nodes";
import { GraphState } from "../src/types";

describe("Comprehensive Real LLM Evaluation Tests", { timeout: 10000 }, () => {

  test("Eval 1: Medical / Critical / Catastrophic (High Confidence)", async () => {
    const state: Partial<GraphState> = {
      preprocessed_text: "help me immediately, my grandfather collapsed on the floor and is unresponsive! breathing is shallow.",
      incident: { id: "eval-1", raw_text: "...", timestamp: "..." }
    };

    const result = await classifyNode(state as GraphState);

    expect(result.classification).toBeDefined();
    expect(result.classification?.category).toBe("medical");
    expect(result.classification?.urgency).toBe("critical");
    expect(result.classification?.severity).toBe("catastrophic");
    expect(result.classification?.confidence).toBeGreaterThan(0.8);
    expect(result.classification?.rationale).toBeTypeOf("string");
  });

  test("Eval 2: Logistics / Low / Low (High Confidence)", async () => {
    const state: Partial<GraphState> = {
      preprocessed_text: "we finished packing the food boxes for the families but we ran out of packing tape. we need 3 more rolls whenever possible.",
      incident: { id: "eval-2", raw_text: "...", timestamp: "..." }
    };

    const result = await classifyNode(state as GraphState);

    expect(result.classification).toBeDefined();
    expect(result.classification?.category).toBe("logistics");
    expect(result.classification?.urgency).toBe("low");
    expect(result.classification?.severity).toBe("low");
    expect(result.classification?.confidence).toBeGreaterThan(0.8);
  });

  test("Eval 3: Rescue / Critical / High (High Confidence)", async () => {
    const state: Partial<GraphState> = {
      preprocessed_text: "a family is stuck in their car due to the flash flood on the main highway. water is rising up to the doors but the car is heavy and not moving yet. they need rescue extraction.",
      incident: { id: "eval-3", raw_text: "...", timestamp: "..." }
    };

    const result = await classifyNode(state as GraphState);

    expect(result.classification).toBeDefined();
    expect(result.classification?.category).toBe("rescue");
    expect(result.classification?.urgency).toBe("critical");
    expect(result.classification?.severity).toBe("high");
    expect(result.classification?.confidence).toBeGreaterThan(0.8);
  });

  test("Eval 4: Logistics / Medium / Catastrophic (Reviewer Edge Case)", async () => {
    const state: Partial<GraphState> = {
      preprocessed_text: "our main regional logistics hub just completely flooded. all donation boxes, trucks, and equipment are destroyed. luckily everyone is safe and at home, so no one is in immediate danger. we can look at it tomorrow morning.",
      incident: { id: "eval-4", raw_text: "...", timestamp: "..." }
    };

    const result = await classifyNode(state as GraphState);

    expect(result.classification).toBeDefined();
    expect(result.classification?.category).toBe("logistics");
    expect(result.classification?.urgency).toBe("medium");
    expect(result.classification?.severity).toBe("catastrophic");
  });

  test("Eval 5: Unknown / Vague text (Low Confidence)", async () => {
    const state: Partial<GraphState> = {
      preprocessed_text: "i think maybe something happened down the street, or maybe not. i heard a noise, could be a small leak or someone dropping a box. can someone check eventually? or don't, i don't know.",
      incident: { id: "eval-5", raw_text: "...", timestamp: "..." }
    };

    const result = await classifyNode(state as GraphState);

    expect(result.classification).toBeDefined();
    expect(result.classification?.confidence).toBeLessThan(0.6);
    expect(result.classification?.rationale).toBeTypeOf("string");
  });

  test("Eval 6: Contact details only (Extremely Low Confidence)", async () => {
    const state: Partial<GraphState> = {
      preprocessed_text: "herzel 10 tel aviv 0521234567",
      incident: { id: "eval-6", raw_text: "...", timestamp: "..." }
    };

    const result = await classifyNode(state as GraphState);

    expect(result.classification).toBeDefined();
    expect(result.classification?.confidence).toBeLessThan(0.5);
  });
});
