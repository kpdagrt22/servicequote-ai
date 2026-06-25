# Founder Demo Script — ServiceQuote AI

A tight 5-minute live demo for a contractor. Works **without any API keys**
(mock AI) and **without manual setup** if you click **Seed demo data** first.

## Before the call (1 min)

- `npm run dev` (or your deployed URL).
- Sign in. On the dashboard, click **Seed demo data** — this creates a demo
  customer, a starter price book for your trade, and one generated draft quote,
  then drops you on that quote. (You can instead do it live in step 6–7.)
- Have the sample job notes ready (below).

## The 5-minute flow

1. **Landing page.** "This is for contractors who lose jobs because quoting is
   slow." Show the hero + how-it-works.
2. **Sign in → Dashboard.** "Here's the pipeline: drafts, sent, accepted,
   estimated value."
3. **Price book.** "This is the accuracy layer — your services, your prices. The
   AI prefers these." Show the example items; mention CSV import.
4. **Create customer.** Customers → Add customer (or reuse the demo customer).
5. **New quote → describe the job.** Paste:

   > Customer wants 6 recessed lights installed in a living room, one dimmer
   > switch, and replacement of two old outlets. Single-story home. Drywall
   > ceiling. Customer wants clean finish.

6. **Generate draft quote.** "A few seconds, and it's broken into line items
   from your price book."
7. **Show AI line items + warnings.** Point out the **AI insights** panel: risk
   flags, questions for the customer, "couldn't price" items, confidence. "It
   never guesses a price it isn't sure about — it flags it for you."
8. **Edit one line item.** Change a quantity or unit price; totals update live.
   "You're always in control. Nothing is sent automatically."
9. **Mark ready → Generate proposal.** Click **Preview & download PDF**.
10. **Show the branded proposal.** Logo, customer, scope, line items, assumptions,
    exclusions, totals, validity date, **signature block**, disclaimer. "Save as
    PDF and text it to the customer."
11. **Copy customer message.** Show the ready-to-send message.
12. **The value, in one line:** "Faster quotes, your pricing, a professional
    proposal — so you win the job before the other guy even writes his up."

## What to say about pricing accuracy

> "It doesn't guarantee prices — it drafts from your price book and your notes,
> and you review every line. That's the point: you stay in control."

## Quick reset between demos

- Use a fresh org, or duplicate the demo quote (**Duplicate quote**) to start
  clean while keeping the data.
- Re-run **Seed demo data** anytime (it reuses the demo customer and only adds
  example items if your book is empty).

## Sample notes for other trades

- **HVAC:** "Install a smart thermostat and do a full AC tune-up before summer.
  Two-story home, single system, weak airflow upstairs."
- **Plumbing:** "Replace a 50-gallon water heater and fix a leaking kitchen
  faucet. Garage install."
