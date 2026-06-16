import * as fs   from "fs";
import * as path from "path";
import { addLogSink } from "./logger";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

export function initFileLog(): string {
  const dir  = path.join(process.cwd(), "logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file   = path.join(dir, `triage-${new Date().toISOString().slice(0, 10)}.log`);
  const stream = fs.createWriteStream(file, { flags: "a" });

  addLogSink(line => stream.write(stripAnsi(line) + "\n"));

  return file;
}
