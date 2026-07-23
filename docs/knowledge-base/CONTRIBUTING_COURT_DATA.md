# Contributing Verified Court Data to the eCourts Registry

This is the one process for adding real court geography/jurisdiction data to NextCaseHQ's eCourts registry (`apps/web/src/lib/ecourts-registry/`) — whether that data comes from a future licensed data-sharing arrangement, a partnership with NIC/the eCommittee, or manual verification by someone on the team, one district or High Court bench at a time.

## Why this process exists

The registry's core rule, established from its first config (`district-courts.ts`) and unchanged since: **never guess a court name.** Every entry in a real (non-free-text) dropdown must be a fact, sourced, and checkable — not an inference from "most districts probably have a court named X." Today only Ernakulam (Kerala) has a real Court Establishment list; every other district, every High Court bench, and every District Consumer Commission falls back to free-text specifically because nobody has sourced and verified that data yet. This document is how that changes safely, one verified batch at a time, without ever compromising the rule.

## Is there an authoritative bulk source today?

As of this writing, no bulk, licensed, machine-readable export of the complete eCourts hierarchy (every state → district → court complex → court establishment → bench) is confirmed available to NextCaseHQ. What's known, and worth your team verifying directly (this could not be confirmed from the engineering environment this recommendation was written in, which has no outbound internet access):

- **services.ecourts.gov.in** (NIC, under the Supreme Court's eCommittee) is the live, authoritative public source — its own cascading dropdowns *are* the ground truth this registry already verifies single entries against. It is a public search portal, not a documented bulk-export API.
- **data.gov.in** (India's Open Government Data Platform, under the National Data Sharing and Accessibility Policy) has hosted various NIC/judiciary-adjacent datasets in the past. Whether a current, complete court-hierarchy dataset exists there, and under what license, needs direct verification — search it, or ask a data.gov.in point of contact.
- **Direct engagement with NIC or the eCommittee, Supreme Court of India** is the most likely path to a genuine, current, licensed bulk feed, if one is wanted — this is a partnerships/legal conversation, not an engineering task.
- **Scraping the public portal's internal endpoints** was deliberately not pursued as an engineering shortcut: the endpoints are undocumented, unversioned, and outside NextCaseHQ's control — a scraper could break silently, and depending on the portal's terms of service, could carry legal/compliance risk a licensed integration wouldn't. If your team decides this route is acceptable after a real ToS review, this document's schema below is still the right shape for whatever the scraper produces — it converts to verified config entries the same way.

Until one of those paths produces real data, the honest, workable path is incremental manual verification — exactly how Ernakulam was built — using the tooling below to make each addition quick and low-risk.

## The contribution format

Whoever is adding a batch of verified court data (a district's establishments, a High Court's bench list, etc.) writes one JSON file describing it, with an explicit source citation per real-world court system:

```json
{
  "system": "district-courts",
  "district": "Kollam",
  "source": "https://kollam.dcourts.gov.in/court-establishments/",
  "verifiedDate": "2026-08-01",
  "establishments": [
    { "name": "Principal District Court, Kollam", "type": "District & Sessions Court" },
    { "name": "Munsiff Court, Kollam", "type": "Civil Court" }
  ]
}
```

Run it through the validator:

```
node scripts/ecourts-registry/validate-court-data.js path/to/kollam.json
```

The script checks the same things a reviewer would check by hand — every field present, a real source URL, no duplicate establishment names, a recognized court `type` — and, once it passes, prints a ready-to-paste TypeScript object literal for the relevant config file (`configs/district-courts.ts`'s `COURT_ESTABLISHMENTS_BY_DISTRICT`, or the equivalent map in `configs/high-courts.ts`/`configs/consumer-commissions.ts`). A human still pastes it in and opens the PR — the script's job is to make sure nothing unsourced or malformed gets that far, not to silently rewrite source files.

## What "verified" means here

A source is a URL an advocate could visit today and see the same court name and type — an official court website, the eCourts portal's own listing for that district, or an equivalent authoritative reference. "I'm fairly confident this exists" is not verification. If in doubt, leave it as free-text (the existing fallback) rather than add an unverified entry — a advocate typing a court name they know is always safer than the product asserting a wrong one.
