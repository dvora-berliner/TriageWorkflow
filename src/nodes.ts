import { ChatAnthropic } from "@langchain/anthropic";
import { interrupt } from "@langchain/langgraph";
import { config } from "./config";
import { GraphState, Classification, ClassificationSchema, Route } from "./types";
import { appendRowToGoogleSheet } from "./googleSheets";
import { logger } from "./logger";

const model = new ChatAnthropic({
  apiKey: config.anthropicApiKey,
  model: config.modelName,
  temperature: 0,
}).withStructuredOutput(ClassificationSchema as any);

const PHONE_REGEX = /(?:\+972|0)(?:5[0-9]|[2-9])-?\d{7}/g;

export function preprocessNode(state: GraphState): Partial<GraphState> {
  logger.step("preprocess", "Cleaning and normalizing input...");

  const sanitized = state.incident.raw_text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .toLowerCase();

  const phones = sanitized.match(PHONE_REGEX);
  const phone_number = phones ? phones[0] : null;

  if (phone_number) logger.info("preprocess", `Phone extracted: ${phone_number}`);

  return { preprocessed_text: sanitized, phone_number };
}

export async function classifyNode(state: GraphState): Promise<Partial<GraphState>> {
  logger.step("classify", `Invoking ${config.modelName}...`);

  const classification = (await model.invoke([
    {
      role: "system",
      content: `You are an emergency dispatcher. Classify the incident into:
- category: logistics | medical | rescue | unknown
- urgency: low | medium | critical
- missing_info: Only list [ "address", "phone"] if they are missing. Do not invent other fields.
- summary: one sentence summary in English
- user_name: Extract the person's name if they explicitly state it . If no name is mentioned, return null.`,
    },
    { role: "user", content: state.preprocessed_text },
  ])) as unknown as Classification;

  logger.info("classify", `Category: ${classification.category} | Urgency: ${classification.urgency}`);
  if (classification.missing_info.length > 0)
    logger.warn("classify", `Missing info: ${classification.missing_info.join(", ")}`);

  return { classification };
}

export function routerNode(state: GraphState): Partial<GraphState> {
  const { classification } = state;
  if (!classification) {
    logger.error("router", "No classification — escalating as fallback");
    return { route: "escalate_to_human", final_action: "No classification — escalating." };
  }

  const route: Route =
    classification.urgency === "critical" || classification.missing_info.length > 0
      ? "escalate_to_human"
      : "auto_dispatch";

  const final_action =
    route === "auto_dispatch"
      ? `Auto-dispatching: ${classification.summary}`
      : `ESCALATE — Reason: ${
          classification.urgency === "critical"
            ? "life-threatening"
            : "missing info: " + classification.missing_info.join(", ")
        }`;

  logger.step("router", `Route: ${route}`);
  return { route, final_action };
}

export function requestInfoNode(state: GraphState): Partial<GraphState> {
  logger.interrupt("request_info", "Pausing for human approval...");

const result = interrupt({
  question: "Approve escalation to human commander?",
  incident: state.incident,
  reason: state.final_action,
}) as { approved: boolean };

  if (result.approved) logger.info("request_info", "Human APPROVED escalation.");
  else logger.warn("request_info", "Human REJECTED — routing to manual logbook.");

  return { human_approved: result.approved };
}

export async function escalateNode(state: GraphState): Promise<Partial<GraphState>> {
  const name = state.classification?.user_name || "Not Mentioned";
const phone = state.phone_number || "No Phone Found";
const summary = state.classification?.summary || state.incident.raw_text;
await appendRowToGoogleSheet(name, phone, summary, true);
  logger.step("escalate", "Incident sent to human commander.");
  logger.info("escalate", state.final_action);
  return {};
}

export function dispatchNode(state: GraphState): Partial<GraphState> {
  logger.step("dispatch", "Volunteer auto-dispatched.");
  logger.info("dispatch", state.final_action);
  return {};
}
export async function manualHandlingNode(state: GraphState): Promise<Partial<GraphState>> {
logger.step("manual_handling", "Recording incident in the manual logbook.");
const name = state.classification?.user_name || "Not Mentioned"; 
const phone = state.phone_number || "No Phone Found";
const summary = state.classification?.summary || state.incident.raw_text;
  await appendRowToGoogleSheet( name, phone, summary, false);
logger.warn("manual_handling", `Duty Officer: call back manually for Incident ${state.incident.id}.`);
  return { final_action: "Sent to manual logbook for physical/phone handling." };
}