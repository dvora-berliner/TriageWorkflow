import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, addLogSink } from "../src/logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => { logSpy = vi.spyOn(console, "log").mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });

  it("step", () => { logger.step("n", "msg"); expect(logSpy).toHaveBeenCalled(); });
  it("info", () => { logger.info("n", "msg"); expect(logSpy).toHaveBeenCalled(); });
  it("interrupt", () => { logger.interrupt("n", "msg"); expect(logSpy).toHaveBeenCalled(); });
  it("divider without label", () => { logger.divider(); expect(logSpy).toHaveBeenCalled(); });
  it("divider with label", () => { logger.divider("TEST"); expect(logSpy).toHaveBeenCalled(); });
  it("logs extra data object on second call", () => {
    logger.info("n", "msg", { x: 1 });
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it("logs extra data string on second call", () => {
    logger.info("n", "msg", "some string");
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it("warn", () => {
    const s = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("n", "msg");
    expect(s).toHaveBeenCalled();
    s.mockRestore();
  });

  it("error", () => {
    const s = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("n", "msg");
    expect(s).toHaveBeenCalled();
    s.mockRestore();
  });

  it("sink receives plain log, data log, and divider", () => {
    const sink = vi.fn();
    addLogSink(sink);
    logger.info("n", "hello");
    logger.info("n", "with obj", { x: 1 });
    logger.info("n", "with str", "text");
    logger.divider();
    logger.divider("LABEL");
    expect(sink).toHaveBeenCalled();
  });
});
