import * as readline from "readline";
import { MemorySaver, Command } from "@langchain/langgraph";
import { buildGraph } from "./graph";
import { GraphState, IncidentReport } from "./types";
import { logger } from "./logger";
import { initFileLog } from "./logFile";

// ── Sample incidents ──────────────────────────────────────────────────────────
const sampleIncidents: IncidentReport[] = [
  {
    id: "INC-001",
    raw_text: "No electricity or water for 3 hours, elderly person alone at home. Address: Herzl 12, Jerusalem. Phone: 0501234567. He is calm and breathing fine.",
    timestamp: new Date().toISOString(),
  },
  {
    id: "INC-002",
    raw_text: "Urgent transport needed to hospital, person with chest pains. Address: Ben Yehuda 4, Tel Aviv.",
    timestamp: new Date().toISOString(),
  },
  {
    id: "INC-003",
    raw_text: "Need logistics help. Bringing 20 hot meals for volunteers at the main station on Jaffa Road 42. Contact phone: 0529876543.",
    timestamp: new Date().toISOString(),
  },
];

// ── Prompt helpers ────────────────────────────────────────────────────────────
function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

async function promptCustomIncident(): Promise<IncidentReport | null> {
  const rl   = readline.createInterface({ input: process.stdin, output: process.stdout });
  const text = await ask(rl, "\nDescribe the incident: ");
  rl.close();
  if (!text) return null;
  return { id: `INC-CUSTOM`, raw_text: text, timestamp: new Date().toISOString() };
}

async function askHuman(data: { question: string; incident: IncidentReport; reason: string }): Promise<boolean> {
  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await ask(rl, `\n${"─".repeat(60)}\n\x1b[33m⏸  HUMAN APPROVAL REQUIRED\x1b[0m\n   Incident : ${data.incident.raw_text}\n   Reason   : ${data.reason}\n   Approve escalation? (y/n): `);
  rl.close();
  return ans.toLowerCase() === "y";
}

async function showMenu(): Promise<IncidentReport[]> {
  const rl     = readline.createInterface({ input: process.stdin, output: process.stdout });
  const choice = await ask(rl, "\nChoose mode:\n  1. Run sample incidents\n  2. Enter custom incident\n  3. Both\n> ");
  rl.close();

  if (choice === "2") {
    const custom = await promptCustomIncident();
    return custom ? [custom] : [];
  }
  if (choice === "3") {
    const custom = await promptCustomIncident();
    return custom ? [...sampleIncidents, custom] : sampleIncidents;
  }
  return sampleIncidents;
}

// ── Triage runner ─────────────────────────────────────────────────────────────
async function runTriage(incident: IncidentReport): Promise<void> {
  logger.divider(`Incident ${incident.id}`);
  logger.step("main", `"${incident.raw_text}"`);

  const checkpointer = new MemorySaver();
  const graph        = buildGraph(checkpointer);
  const threadCfg    = { configurable: { thread_id: incident.id } };

  const initialState: GraphState = {
    incident,
    preprocessed_text: "",
    classification: null,
    route: null,
    final_action: "",
    human_approved: null,
    phone_number: null,
  };

  for await (const _ of await graph.stream(initialState as any, threadCfg)) { }

  const graphState  = await graph.getState(threadCfg);
  const interrupted = (graphState.tasks as any[]).some(t => t.interrupts?.length > 0);

  if (interrupted) {
    const task         = (graphState.tasks as any[]).find(t => t.interrupts?.length > 0);
    const interruptData = task.interrupts[0].value;
    const approved     = await askHuman(interruptData);

    const resumeCommand = new Command({ resume: { approved} });
    for await (const _ of await graph.stream(resumeCommand as any, threadCfg)) { }
  }

  logger.info("main", "Incident processing complete.");
  logger.divider();
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const logFile  = initFileLog();
  const incidents = await showMenu();

  for (const incident of incidents) {
    await runTriage(incident);
  }

  logger.info("main", `Logs saved → ${logFile}`);
}

main().catch(err => logger.error("main", "Fatal error", err));
