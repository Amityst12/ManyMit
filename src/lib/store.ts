import { Low } from "lowdb";
import { JSONFilePreset } from "lowdb/node";
import path from "path";
import { mkdirSync } from "fs";

export type Automation = {
  id: string;
  keyword: string;
  triggerType: "story_reply" | "comment";
  replyMessage: string;
  buttonText: string | null;
  buttonUrl: string | null;
  isActive: boolean;
  replyCount: number;
  createdAt: string;
};

export type Profile = {
  igAccountId: string;
  igAccountName: string;
  igAvatarUrl: string | null;
  pageId: string;
  pageAccessToken: string;
  userAccessToken: string;
  connectedAt: string;
};

export type StoreData = {
  profile: Profile | null;
  automations: Automation[];
  processedEventIds: string[];
};

const defaultData: StoreData = {
  profile: null,
  automations: [],
  processedEventIds: [],
};

const DB_PATH = path.join(process.cwd(), "data", "db.json");

let dbPromise: Promise<Low<StoreData>> | null = null;

async function getDb() {
  if (!dbPromise) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    dbPromise = JSONFilePreset<StoreData>(DB_PATH, defaultData);
  }
  return dbPromise;
}

export async function getProfile(): Promise<Profile | null> {
  const db = await getDb();
  await db.read();
  return db.data.profile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDb();
  await db.read();
  db.data.profile = profile;
  await db.write();
}

export async function clearProfile(): Promise<void> {
  const db = await getDb();
  await db.read();
  db.data.profile = null;
  await db.write();
}

export async function listAutomations(): Promise<Automation[]> {
  const db = await getDb();
  await db.read();
  return db.data.automations;
}

export async function createAutomation(
  input: Omit<Automation, "id" | "replyCount" | "createdAt">
): Promise<Automation> {
  const db = await getDb();
  await db.read();
  const automation: Automation = {
    ...input,
    id: crypto.randomUUID(),
    replyCount: 0,
    createdAt: new Date().toISOString(),
  };
  db.data.automations.push(automation);
  await db.write();
  return automation;
}

export async function updateAutomation(
  id: string,
  patch: Partial<Pick<Automation, "keyword" | "replyMessage" | "buttonText" | "buttonUrl" | "isActive">>
): Promise<Automation | null> {
  const db = await getDb();
  await db.read();
  const automation = db.data.automations.find((a) => a.id === id);
  if (!automation) return null;
  Object.assign(automation, patch);
  await db.write();
  return automation;
}

export async function deleteAutomation(id: string): Promise<boolean> {
  const db = await getDb();
  await db.read();
  const before = db.data.automations.length;
  db.data.automations = db.data.automations.filter((a) => a.id !== id);
  await db.write();
  return db.data.automations.length < before;
}

export async function incrementReplyCount(id: string): Promise<void> {
  const db = await getDb();
  await db.read();
  const automation = db.data.automations.find((a) => a.id === id);
  if (automation) {
    automation.replyCount += 1;
    await db.write();
  }
}

/**
 * Meta retries webhook deliveries; this guards against sending a duplicate DM
 * for the same event. Keeps only the most recent 500 ids to avoid unbounded growth.
 */
export async function isDuplicateWebhookEvent(eventId: string): Promise<boolean> {
  const db = await getDb();
  await db.read();
  if (db.data.processedEventIds.includes(eventId)) return true;
  db.data.processedEventIds.push(eventId);
  if (db.data.processedEventIds.length > 500) {
    db.data.processedEventIds = db.data.processedEventIds.slice(-500);
  }
  await db.write();
  return false;
}
