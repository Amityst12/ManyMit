import type { Automation } from "@/lib/store";

/**
 * Matches keywords tolerantly: trims punctuation/emoji from the edges and
 * collapses repeated letters (e.g. "guideee" -> "guide") so typo'd or
 * excited commenters still trigger the automation.
 */
export function isFuzzyMatch(keyword: string, messageText: string): boolean {
  if (!keyword || !messageText) return false;

  function cleanAndCompress(text: string) {
    return text
      .trim()
      .toLowerCase()
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
      .replace(/(.)\1+/gu, "$1");
  }

  return cleanAndCompress(keyword) === cleanAndCompress(messageText);
}

export function findMatchingAutomation(
  automations: Automation[],
  triggerType: "story_reply" | "comment",
  messageText: string
): Automation | null {
  const normalized = (messageText || "").trim().toLowerCase();
  const candidates = automations.filter((a) => a.isActive && a.triggerType === triggerType);
  return candidates.find((a) => isFuzzyMatch(a.keyword, normalized)) || null;
}
