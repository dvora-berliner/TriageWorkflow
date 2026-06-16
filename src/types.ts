import { z } from "zod";

export const CategorySchema = z.enum(["logistics", "medical", "rescue", "unknown"]);
export const UrgencySchema = z.enum(["low", "medium", "critical"]);

export const ClassificationSchema = z.object({
  category: CategorySchema,
  urgency: UrgencySchema,
  missing_info: z.array(z.string()),
  summary: z.string(),
  user_name: z.string().nullable().describe("The name of the person reporting or involved, if mentioned. Null if not mentioned."), 
});

export type Category = z.infer<typeof CategorySchema>;
export type Urgency = z.infer<typeof UrgencySchema>;
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
