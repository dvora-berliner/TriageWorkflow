import { describe, it, expect } from "vitest";
import { CategorySchema, UrgencySchema, SeveritySchema, ClassificationSchema } from "../src/types";

describe("CategorySchema", () => {
  it.each(["logistics", "medical", "rescue", "unknown"])("accepts %s", (v) => {
    expect(CategorySchema.parse(v)).toBe(v);
  });
  it("rejects invalid value", () => {
    expect(() => CategorySchema.parse("fire")).toThrow();
  });
});

describe("UrgencySchema", () => {
  it.each(["low", "medium", "critical"])("accepts %s", (v) => {
    expect(UrgencySchema.parse(v)).toBe(v);
  });
  it("rejects invalid value", () => {
    expect(() => UrgencySchema.parse("extreme")).toThrow();
  });
});

describe("SeveritySchema", () => {
  it.each(["low", "medium", "high", "catastrophic"])("accepts %s", (v) => {
    expect(SeveritySchema.parse(v)).toBe(v);
  });
  it("rejects invalid value", () => {
    expect(() => SeveritySchema.parse("apocalypse")).toThrow();
  });
});

describe("ClassificationSchema", () => {
  const valid = { 
    category: "rescue", 
    urgency: "low", 
    severity: "low",
    confidence: 0.9,
    rationale: "Clear text detailing minor rescue assistance.",
    missing_info: [], 
    summary: "s", 
    user_name: null 
  };
  it("parses valid object", () => {
    expect(ClassificationSchema.parse(valid).category).toBe("rescue");
  });
  it("accepts user_name as string", () => {
    expect(ClassificationSchema.parse({ ...valid, user_name: "Alice" }).user_name).toBe("Alice");
  });
  it("rejects missing fields", () => {
    expect(() => ClassificationSchema.parse({ category: "rescue" })).toThrow();
  });
});