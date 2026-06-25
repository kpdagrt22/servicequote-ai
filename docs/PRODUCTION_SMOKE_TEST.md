# Production Smoke Test — ServiceQuote AI

Run after each production deploy. Replace `<APP_URL>` with the deployed URL.
Mark each item **PASS** / **FAIL**. Stop and fix on any FAIL in sections 1–9.

Pre-req: Supabase configured + migrations `0001`–`0004` applied
(`docs/SUPABASE_PRODUCTION_RUNBOOK.md`). With `AI_PROVIDER=mock`, no AI keys needed.

---

## 1. Public routes
| Check | Result |
| --- | --- |
| Landing page `<APP_URL>/` loads | ☐ PASS ☐ FAIL |
| Pricing page `<APP_URL>/pricing` loads (Starter/Pro/Team + setup) | ☐ PASS ☐ FAIL |
| No console errors on either page | ☐ PASS ☐ FAIL |
| Mobile responsive (DevTools mobile / phone) | ☐ PASS ☐ FAIL |

## 2. Auth
| Check | Result |
| --- | --- |
| Signup works (email confirm flow if enabled) | ☐ PASS ☐ FAIL |
| Login works | ☐ PASS ☐ FAIL |
| Logout works (Sign out) | ☐ PASS ☐ FAIL |
| Visiting `/dashboard` unauthenticated → redirects to `/login` | ☐ PASS ☐ FAIL |
| Auth redirect is safe (`/login?redirectedFrom=//evil.com` does NOT leave the site) | ☐ PASS ☐ FAIL |

## 3. Onboarding
| Check | Result |
| --- | --- |
| Create organization completes | ☐ PASS ☐ FAIL |
| Business profile (name, phone, address) saved | ☐ PASS ☐ FAIL |
| Trade selection works | ☐ PASS ☐ FAIL |
| Default settings (labor rate, markup, tax, currency) saved | ☐ PASS ☐ FAIL |

## 4. Price book
| Check | Result |
| --- | --- |
| Empty state visible before any items | ☐ PASS ☐ FAIL |
| Add a price book item | ☐ PASS ☐ FAIL |
| Validation blocks negative material/labor/markup | ☐ PASS ☐ FAIL |
| Categories selectable (datalist suggestions) | ☐ PASS ☐ FAIL |
| "Load example items" populates electrician/HVAC items | ☐ PASS ☐ FAIL |

## 5. Customer
| Check | Result |
| --- | --- |
| Add a customer | ☐ PASS ☐ FAIL |
| Validation works (name required, email format) | ☐ PASS ☐ FAIL |
| Customer visible in list | ☐ PASS ☐ FAIL |
| Ownership scoped (only your org's customers shown) | ☐ PASS ☐ FAIL |

## 6. Quote workflow
Sample job notes:
> "Customer wants 6 recessed lights installed in a living room, one dimmer switch, and replacement of two old outlets. Single-story home. Drywall ceiling. Customer wants clean finish."

| Check | Result |
| --- | --- |
| Create quote request (select/new customer + notes) | ☐ PASS ☐ FAIL |
| AI/mock draft generated (line items appear) | ☐ PASS ☐ FAIL |
| Line items editable (qty, costs, unit price) | ☐ PASS ☐ FAIL |
| Totals recalculate live | ☐ PASS ☐ FAIL |
| Risk flags / missing info / can't-price shown in AI insights | ☐ PASS ☐ FAIL |
| Quote saves (draft) | ☐ PASS ☐ FAIL |

## 7. Proposal
| Check | Result |
| --- | --- |
| Proposal preview loads (`/proposal/<id>/print`) | ☐ PASS ☐ FAIL |
| Contractor + customer data present | ☐ PASS ☐ FAIL |
| Job location shown (when set) | ☐ PASS ☐ FAIL |
| Signature/acceptance block shown | ☐ PASS ☐ FAIL |
| Disclaimer shown | ☐ PASS ☐ FAIL |
| Browser "Save as PDF" produces a clean document | ☐ PASS ☐ FAIL |

## 8. Status lifecycle
| Check | Result |
| --- | --- |
| draft → ready | ☐ PASS ☐ FAIL |
| ready → sent | ☐ PASS ☐ FAIL |
| sent → accepted | ☐ PASS ☐ FAIL |
| sent → rejected (on a second quote) | ☐ PASS ☐ FAIL |
| Archive works (any active → archived) | ☐ PASS ☐ FAIL |
| Invalid transitions not offered / blocked (e.g. accepted → draft) | ☐ PASS ☐ FAIL |

## 9. Duplicate quote
| Check | Result |
| --- | --- |
| Duplicate creates a new **draft** | ☐ PASS ☐ FAIL |
| Line items copied | ☐ PASS ☐ FAIL |
| New quote number assigned | ☐ PASS ☐ FAIL |
| No cross-org leakage (copy stays in your org) | ☐ PASS ☐ FAIL |

## 10. Demo data
| Check | Result |
| --- | --- |
| "Seed demo data" works (lands on a generated draft) | ☐ PASS ☐ FAIL |
| The `docs/DEMO_SCRIPT.md` flow runs end-to-end | ☐ PASS ☐ FAIL |

## 11. Billing / pricing
| Check | Result |
| --- | --- |
| Pricing page loads | ☐ PASS ☐ FAIL |
| Missing Stripe config handled (shows "Billing not configured") | ☐ PASS ☐ FAIL |
| Checkout disabled or a useful message when Stripe not configured | ☐ PASS ☐ FAIL |

## 12. Admin / debug
| Check | Result |
| --- | --- |
| Unauthorized user blocked from `/admin` | ☐ PASS ☐ FAIL |
| `ADMIN_EMAILS` user can access `/admin` | ☐ PASS ☐ FAIL |
| No secrets shown in the admin view | ☐ PASS ☐ FAIL |

## 13. Error handling
| Check | Result |
| --- | --- |
| AI failure is graceful (falls back to mock; no crash) | ☐ PASS ☐ FAIL |
| Print/PDF issue is graceful | ☐ PASS ☐ FAIL |
| Supabase error is user-friendly | ☐ PASS ☐ FAIL |
| No raw stack traces shown to the user | ☐ PASS ☐ FAIL |

## 14. Mobile
| Check | Result |
| --- | --- |
| Dashboard usable on a phone | ☐ PASS ☐ FAIL |
| Quote workspace usable on a phone | ☐ PASS ☐ FAIL |
| Proposal preview usable on a phone | ☐ PASS ☐ FAIL |

---

**Sign-off:** ____________________  **Date:** ____________  **Deploy URL:** ____________
