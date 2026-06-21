import { z } from "zod";

export const CategorySchema = z.enum(["logistics", "medical", "rescue", "unknown"]);
export const UrgencySchema = z.enum(["low", "medium", "critical"]);
export const SeveritySchema = z.enum(["low", "medium", "high", "catastrophic"]);

export const ClassificationSchema = z.object({
  category: CategorySchema.describe("The core type of the emergency incident."),
  urgency: UrgencySchema.describe("How quickly the incident requires a response based on time sensitivity."),
  severity: SeveritySchema.describe("Damage impact level. Use catastrophic only for life/system failure."),
  confidence: z.number().min(0).max(1).describe("Certainty score from 0.0 to 1.0. Lower if text is vague."),
  rationale: z.string().describe("One-sentence reason for your classification choices."),
  missing_info: z.array(z.string()).describe("List of missing fields. Only allowed values are exactly 'address' and 'phone'. Leave empty if both are present."),
  summary: z.string().describe("A concise, one-sentence English summary of the incident."),
  user_name: z.string().nullable().describe("The name of the person reporting or involved, if explicitly mentioned. Null otherwise."), 
});

export type Category = z.infer<typeof CategorySchema>;
export type Urgency = z.infer<typeof UrgencySchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type Classification = z.infer<typeof ClassificationSchema>;

export type Route = "auto_dispatch" | "escalate_to_human";

export interface IncidentReport {
  id: string;
  raw_text: string;
  timestamp: string;
}

export interface GraphState {
  incident: IncidentReport;
  preprocessed_text: string;
  classification: Classification | null;
  route: Route | null;
  final_action: string;
  human_approved: boolean | null;
  phone_number: string | null;
}
