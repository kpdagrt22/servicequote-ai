import { describe, it, expect } from "vitest";
import {
  QUOTE_STATUSES,
  canTransitionQuoteStatus,
  getAllowedTransitions,
  getQuoteStatusLabel,
  getQuoteStatusBadgeVariant,
  getTransitionActionLabel,
  isQuoteEditable,
  isQuoteStatus,
} from "@/lib/quotes/status";

describe("quote status set", () => {
  it("contains the full lifecycle", () => {
    expect(QUOTE_STATUSES).toEqual([
      "draft",
      "ready",
      "sent",
      "accepted",
      "rejected",
      "archived",
    ]);
  });
  it("isQuoteStatus guards unknown values", () => {
    expect(isQuoteStatus("draft")).toBe(true);
    expect(isQuoteStatus("nope")).toBe(false);
    expect(isQuoteStatus(42)).toBe(false);
  });
});

describe("canTransitionQuoteStatus — allowed", () => {
  const allowed: Array<[string, string]> = [
    ["draft", "ready"],
    ["ready", "sent"],
    ["sent", "accepted"],
    ["sent", "rejected"],
    ["draft", "archived"],
    ["ready", "archived"],
    ["sent", "archived"],
    ["rejected", "archived"],
    ["accepted", "archived"],
    ["rejected", "draft"], // reopen to revise
    ["ready", "draft"], // reopen to edit
    ["archived", "draft"], // restore
  ];
  it.each(allowed)("allows %s -> %s", (from, to) => {
    expect(canTransitionQuoteStatus(from as never, to as never)).toBe(true);
  });
});

describe("canTransitionQuoteStatus — forbidden", () => {
  const forbidden: Array<[string, string]> = [
    ["accepted", "draft"],
    ["accepted", "sent"],
    ["rejected", "accepted"],
    ["archived", "accepted"],
    ["archived", "sent"],
    ["draft", "accepted"],
    ["draft", "sent"], // must go through ready
    ["sent", "draft"],
  ];
  it.each(forbidden)("forbids %s -> %s", (from, to) => {
    expect(canTransitionQuoteStatus(from as never, to as never)).toBe(false);
  });
  it("forbids a no-op transition", () => {
    expect(canTransitionQuoteStatus("draft", "draft")).toBe(false);
  });
});

describe("status helpers", () => {
  it("labels every status", () => {
    for (const s of QUOTE_STATUSES) expect(getQuoteStatusLabel(s)).toBeTruthy();
  });
  it("maps each status to a badge variant", () => {
    expect(getQuoteStatusBadgeVariant("accepted")).toBe("green");
    expect(getQuoteStatusBadgeVariant("rejected")).toBe("red");
    expect(getQuoteStatusBadgeVariant("archived")).toBe("slate");
    expect(getQuoteStatusBadgeVariant("ready")).toBe("amber");
  });
  it("only drafts are editable", () => {
    expect(isQuoteEditable("draft")).toBe(true);
    expect(isQuoteEditable("ready")).toBe(false);
    expect(isQuoteEditable("sent")).toBe(false);
  });
  it("uses reopen/restore wording for → draft", () => {
    expect(getTransitionActionLabel("rejected", "draft")).toBe("Reopen as draft");
    expect(getTransitionActionLabel("archived", "draft")).toBe("Restore to draft");
    expect(getTransitionActionLabel("draft", "ready")).toBe("Mark ready");
    expect(getTransitionActionLabel("sent", "accepted")).toBe("Mark accepted");
  });
  it("getAllowedTransitions never includes the current status", () => {
    for (const s of QUOTE_STATUSES) {
      expect(getAllowedTransitions(s)).not.toContain(s);
    }
  });
});
