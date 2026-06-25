# Validation Plan — ServiceQuote AI

The goal of the MVP is **learning, not scale**. Build only after proof that
contractors will pay. This document is the playbook.

## Principle

> Manually onboard a handful of real contractors, generate real quotes with them,
> confirm the quotes are accurate and useful, and charge money — **before**
> automating anything further.

The product is intentionally useful *before* full automation: the founder can
sit with a contractor, build their price book, and produce real quotes using the
exact same app. That's the wedge.

## Step-by-step

### 1. Recruit 5 founding contractors
- Focus on **electrical and HVAC** (the trades the app is tuned for).
- Solo or small shops who quote regularly and feel the pain.
- Offer "Founding Contractor" terms (see the landing page CTA).

### 2. Manually build each price book
- Use the **Price book** page together (screen share or in person).
- Start from "Load example items," then edit to their real prices.
- This is the accuracy layer — invest here. The founder does the typing.
- Optionally charge the **$199 done-for-you setup** fee for this.

### 3. Generate 3 real quotes per contractor (15 total)
- Use actual jobs they're quoting that week.
- Run the job notes through the flow; edit line items together.
- Produce the branded PDF and have them send it (their decision, not auto-send).

### 4. Ask the hard question
For each quote: **"Is this price accurate enough to send as-is?"**
- Track yes/no and what they changed.
- If they consistently rewrite a line, fix the price book or the mock rules.
- Capture which `risk_flags` / questions were actually useful.

### 5. Charge
- Convert to a **founding subscription** (Starter $39 / Pro $99) and/or collect
  the setup fee.
- **Proof of payment is the signal.** Verbal interest is not.

### 6. Only then, build more
- Prioritize the next features from what these 5 contractors actually asked for
  while paying — not from a roadmap written in advance.

## What to measure

| Metric | Target signal |
| --- | --- |
| Time to first quote (onboarding → PDF) | < 15 min with founder assist |
| Quotes that were sent without major edits | majority |
| Line-item edits per quote | trending down as price books improve |
| Contractors who paid (sub or setup) | ≥ 3 of 5 |
| Quotes generated per paying contractor / week | ≥ 2 (habit forming) |

## Anti-goals during validation

- Don't build scheduling, CRM, mobile apps, or accounting sync.
- Don't add trades beyond electrical/HVAC until those two are loved.
- Don't automate onboarding until the manual version reliably produces
  accurate quotes.
- Don't promise guaranteed pricing — ever.

## Instrumentation already in place

- `ai_extraction_logs` + the `/admin` page show AI confidence, fallbacks, and
  errors per organization.
- `quote_events` records the full lifecycle (created, ai_generated, edited,
  status changes, message copied) for every quote — your raw validation data.
- `/admin` shows onboarding status per organization at a glance.

---

## First 10 contractors — exact plan (alpha)

**Target niche.** US **residential electricians and HVAC techs**, solo or 2–5 person
shops, who quote several jobs a week and currently write estimates by hand or in a
notes app. Find them in local trade Facebook groups, r/electricians / r/HVAC, supply
houses, and warm intros.

**Outreach message (DM/email):**
> "Hey — I built a tool that turns your job notes into an editable, branded quote +
> PDF in a couple minutes, using YOUR prices. Not a CRM, no accounting setup. Can I
> show you a 5-minute demo and set up your price book with you for free? If it saves
> you time, I'd ask you to try it on 3 real jobs."

**Demo flow.** Run `docs/DEMO_SCRIPT.md` (5 minutes, mock AI, no keys needed).

**Build their price book WITH them** (concierge) — this is the accuracy layer and the
wedge. Offer the $199 done-for-you setup or do it free for founding contractors.

**Then have them generate 3 real quotes** for jobs they're actually quoting that week.

**Questions to ask after each quote:**
1. Would you send this to the customer as-is, or what did you change?
2. How long would this have taken you by hand?
3. Did the line items / scope match how you think about the job?
4. Were the AI's risk flags / questions useful?
5. What's missing that would make this a daily tool?

**Willingness-to-pay test.** After the 3rd quote: "This is $39/mo (Starter) or $99/mo
(Pro). Want to start now as a founding contractor?" Collect a card or a setup fee.
**Verbal interest doesn't count — payment does.**

**Success criteria (proceed):**
- ≥ 3 of 10 pay (subscription or setup fee).
- Majority of quotes sent with only minor edits.
- Median time-to-quote under ~10 minutes with the price book built.
- At least 2 contractors generate ≥ 2 quotes/week unprompted (habit).

**Kill / pivot criteria:**
- < 2 of 10 will pay after a concierge setup + 3 real quotes.
- Contractors consistently rewrite most line prices (price book/AI not trusted).
- "Nice but I won't change my workflow" is the dominant response.
- Quotes aren't actually sent to customers.

**Anti-goals during validation:** no scheduling, CRM, accounting sync, mobile app, or
extra trades until electrical + HVAC are loved and paid for.
