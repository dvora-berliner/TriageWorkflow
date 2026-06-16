import { google } from "googleapis";
import { logger } from "./logger";

const SPREADSHEET_ID = "1KC-8ZaNTvZ2sm7a6k-iZEewUqcdgSehF4hP_7YOxjlA"; 

export async function appendRowToGoogleSheet( name: string, phone: string, summary: string, escalated: boolean) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: "credentials.json", 
scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:D", 
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[name, phone, summary, escalated ? "True" : "False"]],
      },
    });

    logger.info("google_sheets", "Successfully logged incident to Google Sheets!");
  } catch (error) {
    logger.error("google_sheets", "Failed to write to Google Sheets", error);
  }
}
