import { describe, it, expect } from "vitest";
import {
  canShareQuote,
  canCustomerRespond,
  buildSharePath,
  buildShareUrl,
} from "@/lib/quotes/sharing";

describe("quote sharing helpers", () => {
  it("only shares quotes that are ready or further along (never drafts)", () => {
    expect(canShareQuote("draft")).toBe(false);
    expect(canShareQuote("ready")).toBe(true);
    expect(canShareQuote("sent")).toBe(true);
    expect(canShareQuote("accepted")).toBe(true);
    expect(canShareQuote("rejected")).toBe(true);
    expect(canShareQuote("archived")).toBe(false);
  });

  it("lets the customer respond only while the quote is sent", () => {
    expect(canCustomerRespond("sent")).toBe(true);
    expect(canCustomerRespond("ready")).toBe(false);
    expect(canCustomerRespond("accepted")).toBe(false);
    expect(canCustomerRespond("draft")).toBe(false);
  });

  it("builds the public path and absolute url", () => {
    expect(buildSharePath("abc")).toBe("/p/abc");
    expect(buildShareUrl("https://app.example.com", "tok")).toBe("https://app.example.com/p/tok");
  });

  it("does not double up slashes when appUrl has a trailing slash", () => {
    expect(buildShareUrl("https://app.example.com/", "tok")).toBe("https://app.example.com/p/tok");
    expect(buildShareUrl("https://app.example.com///", "tok")).toBe("https://app.example.com/p/tok");
  });
});
