// ── ANSI colours ────────────────────────────────────────────────────────────
const R = "\x1b[0m", B = "\x1b[1m", DIM = "\x1b[2m";
const GREEN = "\x1b[32m", YELLOW = "\x1b[33m", RED = "\x1b[31m";
const CYAN = "\x1b[36m", MAGENTA = "\x1b[35m", BLUE = "\x1b[34m";

// ── Sinks (pluggable outputs) ─────────────────────────────────────────────────
const sinks: Array<(line: string) => void> = [];
export const addLogSink = (fn: (line: string) => void) => sinks.push(fn);

// ── Helpers ───────────────────────────────────────────────────────────────────
let isFirstLog = true;
const ts = () => {
  const [d, t] = new Date().toISOString().replace("T", " ").slice(0, 16).split(" ");
  return isFirstLog ? (isFirstLog = false, `${d} ${t}`) : t;
};

const fmt  = (level: string, color: string, node: string, msg: string) =>
  `${DIM}${ts()}${R} ${color}${B}[${level}]${R} ${CYAN}[${node}]${R} ${msg}`;
function emit(consoleFn: (s: string) => void, colored: string, data?: unknown): void {
  consoleFn(colored);
  sinks.forEach(fn => fn(colored));

  if (data !== undefined) {
    const out = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
    console.log(`${DIM}  → ${out}${R}`);
    sinks.forEach(fn => fn(`  → ${out}`));
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export const logger = {
  step     : (node: string, msg: string, data?: unknown) => emit(console.log,   fmt("STEP", BLUE,    node, msg), data),
  info     : (node: string, msg: string, data?: unknown) => emit(console.log,   fmt("INFO", GREEN,   node, msg), data),
  warn     : (node: string, msg: string, data?: unknown) => emit(console.warn,  fmt("WARN", YELLOW,  node, msg), data),
  error    : (node: string, msg: string, data?: unknown) => emit(console.error, fmt("ERR ", RED,     node, msg), data),
  interrupt: (node: string, msg: string, data?: unknown) => emit(console.log,   fmt("⏸   ", YELLOW,  node, msg), data),

  divider(label?: string): void {
    const W = 60;
    if (!label) {
      const l = `${DIM}${"─".repeat(W)}${R}`;
      console.log(l);
      sinks.forEach(fn => fn("─".repeat(W)));
      return;
    }
    const pad  = ` ${label} `;
    const side = Math.floor((W - pad.length) / 2);
    const l    = `${B}${"─".repeat(side)}${pad}${"─".repeat(W - side - pad.length)}${R}`;
    console.log(l);
    sinks.forEach(fn => fn(`${"─".repeat(side)}${pad}${"─".repeat(W - side - pad.length)}`));
  },
};
