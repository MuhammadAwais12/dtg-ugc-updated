import { Client } from "@notionhq/client";

// ============================================================================
// NOTION SCHEMA (confirmed against the real database):
//   - Name:    title
//   - Email:   email
//   - CR-Code: unique_id  (Notion's built-in auto-numbering field, prefix "CR")
//
// unique_id is NOT a plain string field. Reads come back as { prefix, number };
// filters take just the number; and Notion assigns the number itself on page
// creation — there is no manual "find the max and add 1" logic needed here.
// ============================================================================
const NAME_PROPERTY = "Name";
const EMAIL_PROPERTY = "Email";
const CODE_PROPERTY = "CR-Code";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_CREATORS_DATABASE_ID || "";

function requireConfig() {
  if (!process.env.NOTION_API_KEY || !DATABASE_ID) {
    throw new Error("NOTION_API_KEY and NOTION_CREATORS_DATABASE_ID must be configured");
  }
}

export interface NotionCreator {
  pageId: string;
  name: string;
  email: string;
  code: string; // formatted as "CR-<number>"
}

// Accepts "CR-134", "cr134", "134", etc. and returns the bare number Notion's
// unique_id filter expects. Returns null if no digits are found.
export function extractCodeNumber(input: string): number | null {
  if (!input) return null;
  const match = input.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function extractTitle(page: any, property: string): string {
  return page.properties?.[property]?.title?.[0]?.plain_text?.trim() || "";
}
function extractEmail(page: any, property: string): string {
  return page.properties?.[property]?.email?.trim() || "";
}
function extractUniqueId(page: any, property: string): string {
  const uid = page.properties?.[property]?.unique_id;
  if (!uid || uid.number === null || uid.number === undefined) return "";
  const prefix = uid.prefix ? `${uid.prefix}-` : "";
  return `${prefix}${uid.number}`;
}

function pageToCreator(page: any): NotionCreator {
  return {
    pageId: page.id,
    name: extractTitle(page, NAME_PROPERTY),
    email: extractEmail(page, EMAIL_PROPERTY),
    code: extractUniqueId(page, CODE_PROPERTY),
  };
}

export async function findCreatorByCode(
  code: string,
): Promise<NotionCreator | null> {
  requireConfig();
  const number = extractCodeNumber(code);
  if (number === null) return null;

  const res = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: CODE_PROPERTY,
      number: {
        equals: number,
      },
    },
    page_size: 1,
  });

  if (!res.results.length) return null;
  return pageToCreator(res.results[0]);
}
export async function authenticateCreator(
  code: string,
  name: string
): Promise<NotionCreator | null> {
  requireConfig();
  const creator = await findCreatorByCode(code);
  if (!creator) {
    return null;
  }
  const normalizedStoredName = creator.name.trim().toLocaleLowerCase();
  const normalizedEnteredName = name.trim().toLocaleLowerCase();
  if (normalizedStoredName !== normalizedEnteredName) {
    return null;
  }
  return creator;
}

export async function findCreatorByEmail(
  email: string,
): Promise<NotionCreator | null> {
  requireConfig();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const res = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: EMAIL_PROPERTY, email: { equals: normalized } },
    page_size: 1,
  });

  if (!res.results.length) return null;
  return pageToCreator(res.results[0]);
}

// Creates the creator's Notion record. CR-Code is auto-assigned by Notion itself
// (unique_id field) — no code generation or collision handling needed here.
export async function createCreator(name: string, email: string): Promise<NotionCreator> {
  requireConfig();

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      [NAME_PROPERTY]: { title: [{ text: { content: name } }] },
      [EMAIL_PROPERTY]: { email },
    },
  });

  // The create response doesn't reliably include the freshly-assigned unique_id
  // in all API versions, so re-fetch the page to read it back reliably.
  const fullPage = await notion.pages.retrieve({ page_id: page.id });
  return pageToCreator(fullPage);
}
