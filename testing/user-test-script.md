# Pockets — User Test Script

**App version:** 1.0.0
**Platform:** Android
**Tester:**
**Date:**

---

## How to Use This Script

- Work through each section in order — later tests depend on data created earlier.
- Mark each test: **PASS** / **FAIL** / **SKIP**
- Note any unexpected behaviour in the Comments column.
- Negative tests (marked ⛔) expect the app to reject or handle gracefully — a rejection is a PASS.

---

## Section 1 — Initial State

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 1.1 | Launch the app | App opens, shows "Total Amount" header with **$0.00**, Accounts tab selected, empty list | | |
| 1.2 | Tap the Purposes tab | List switches to Purposes, still empty | | |
| 1.3 | Tap the Accounts tab | Returns to Accounts tab | | |

---

## Section 2 — Add Accounts

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 2.1 | Tap "+ Add" on Accounts tab | Modal opens with "Name" field | | |
| 2.2 | Type `Savings` and tap Add | Modal closes, "Savings" appears in list with **$0.00** | | |
| 2.3 | Tap "+ Add", type `Wallet`, tap Add | "Wallet" appears in list | | |
| 2.4 | Tap "+ Add", type `Emergency`, tap Add | "Emergency" appears in list | | |
| 2.5 ⛔ | Tap "+ Add", leave Name blank, tap Add | Toast: "Name is required" — modal stays open | | |
| 2.6 ⛔ | Tap "+ Add", type `Savings` (duplicate), tap Add | Toast: "Label already exists" — modal stays open | | |
| 2.7 ⛔ | Tap "+ Add", type `   ` (spaces only), tap Add | Toast: "Name is required" | | |

---

## Section 3 — Add Purposes

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 3.1 | Switch to Purposes tab, tap "+ Add" | Modal opens with "Name" and "Target Amount" fields | | |
| 3.2 | Type `Groceries`, leave Target Amount blank, tap Add | "Groceries" appears with **$0.00** (no target shown) | | |
| 3.3 | Tap "+ Add", type `Rent`, enter target `1500.00`, tap Add | "Rent" appears with **$0.00 / $1,500.00** (target in gray) | | |
| 3.4 | Tap "+ Add", type `Entertainment`, enter target `200.00`, tap Add | "Entertainment" appears with **$0.00 / $200.00** (target in gray) | | |
| 3.5 ⛔ | Tap "+ Add", leave Name blank, enter target `50.00`, tap Add | Toast: "Name is required" | | |
| 3.6 ⛔ | Tap "+ Add", type `Groceries` (duplicate), tap Add | Toast: "Label already exists" | | |
| 3.7 ⛔ | Tap "+ Add", type `Test`, enter target `-50`, tap Add | Target treated as 0 — "Test" added with no target display | | |

---

## Section 4 — Deposit

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 4.1 | Tap **Deposit** in the bottom taskbar | Phase 1 modal opens: account picker + amount field | | |
| 4.2 | Select `Savings`, enter `3000`, tap Next | Phase 2 opens: purpose distribution grid showing all purposes | | |
| 4.3 | Allocate: Groceries `500`, Rent `1500`, Entertainment `200`, remaining `800` to any purpose | Remainder indicator shows **$0.00** | | |
| 4.4 | Tap Confirm | Modal closes. Savings shows **$3,000.00**. Total header updates | | |
| 4.5 | Tap **Deposit**, select `Wallet`, enter `1000`, allocate fully, Confirm | Wallet shows **$1,000.00**, total updates | | |
| 4.6 ⛔ | Tap **Deposit**, select `Savings`, enter `0`, tap Next | Should reject — amount must be > 0 | | |
| 4.7 ⛔ | Tap **Deposit**, select account, enter amount, do NOT fully allocate, tap Confirm | Confirm button disabled until remainder is $0.00 | | |

---

## Section 5 — Expand Rows & Slice View

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 5.1 | On Accounts tab, tap `Savings` row | Row expands, shows slice breakdown by purpose | | |
| 5.2 | Tap `Savings` again | Row collapses | | |
| 5.3 | Switch to Purposes tab, tap `Rent` row | Expands, shows slice breakdown by account | | |
| 5.4 | Check Rent display | Shows **$1,500.00 / $1,500.00** with target in **green** (goal met) | | |
| 5.5 | Check Entertainment display | Shows **$0.00 / $200.00** with target in **gray** (below goal) | | |
| 5.6 | Check Groceries display | Shows only **$500.00** (no target display) | | |

---

## Section 6 — Spend

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 6.1 | Tap **Spend** in taskbar | Phase 1: account picker + amount field | | |
| 6.2 | Select `Wallet`, enter `200`, tap Next | Phase 2: purpose distribution grid | | |
| 6.3 | Allocate `200` to Groceries, tap Confirm | Wallet reduces by $200, Groceries reduces by $200, total updates | | |
| 6.4 ⛔ | Tap **Spend**, select `Emergency` (balance $0), enter `100`, tap Next | Phase 2 opens but Confirm should be disabled — no funds to draw from | | |
| 6.5 ⛔ | Tap **Spend**, select `Wallet`, enter amount greater than Wallet balance | App should prevent over-spending (negative slice not allowed) | | |

---

## Section 7 — Account Rebalance (Update)

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 7.1 | On Accounts tab, tap **Update** next to `Savings` | Modal opens with new-total input and purpose grid | | |
| 7.2 | Enter new total `3500` (increase by $500) | Purpose grid shows $500 remainder to distribute | | |
| 7.3 | Allocate +$500 to `Entertainment`, tap Confirm | Savings = $3,500, Entertainment slice grows, total header updates | | |
| 7.4 | Check Entertainment on Purposes tab | Should now show **$700.00 / $200.00** in green | | |
| 7.5 ⛔ | Tap **Update** on Savings, enter new total, do NOT fully distribute, tap Confirm | Confirm disabled until remainder = $0.00 | | |

---

## Section 8 — Account Transfer

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 8.1 | Tap **Transfer** in taskbar | Account transfer modal opens | | |
| 8.2 | Select source `Savings`, target `Emergency`, transfer $500 across any purposes, Confirm | Savings decreases $500, Emergency increases $500, fund total unchanged | | |
| 8.3 ⛔ | Tap **Transfer**, select same account as both source and target | Should be prevented or show validation | | |
| 8.4 ⛔ | Tap **Transfer**, enter amount exceeding source balance | Should reject or prevent confirmation | | |

---

## Section 9 — Purpose Re-tag (Transfer)

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 9.1 | Tap **Re-tag** in taskbar | Phase 1: select source and target purpose | | |
| 9.2 | Select source `Entertainment`, target `Groceries` | Phase 2: account slice grid shows accounts with Entertainment slices | | |
| 9.3 | Move $200 from Entertainment (Savings) to Groceries, Confirm | Entertainment total decreases $200, Groceries increases $200, fund total unchanged | | |
| 9.4 ⛔ | Tap **Re-tag**, select same purpose as source and target | Should be prevented | | |

---

## Section 10 — Edit Account

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 10.1 | Tap ⚙ on `Wallet` | Edit modal opens with current name pre-filled | | |
| 10.2 | Clear name, type `Cash`, tap Save | Row label updates to "Cash" | | |
| 10.3 ⛔ | Tap ⚙ on any account, clear name, tap Save | Toast: "Name is required" | | |
| 10.4 ⛔ | Tap ⚙ on an account, rename to an existing account name, tap Save | Toast: "Label already exists" | | |

---

## Section 11 — Edit Purpose (with Target)

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 11.1 | Tap ⚙ on `Groceries` | Edit modal opens — Target Amount field is blank | | |
| 11.2 | Enter target `600`, tap Save | Groceries now shows **current / $600.00** — color depends on current balance | | |
| 11.3 | Tap ⚙ on `Rent` | Edit modal opens with Target Amount pre-filled as `1500.00` | | |
| 11.4 | Change target to `2000`, tap Save | Rent now shows **$1,500.00 / $2,000.00** in gray | | |
| 11.5 | Tap ⚙ on `Entertainment`, clear Target Amount, tap Save | Entertainment reverts to showing only the balance (no target display) | | |

---

## Section 12 — Delete

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 12.1 | Tap ⚙ on `Test` purpose (created in 3.7), tap **Delete Purpose** | Confirmation alert appears | | |
| 12.2 | Tap Delete in the alert | "Test" removed from list, fund total unchanged (had $0) | | |
| 12.3 | Tap ⚙ on `Emergency` account, tap **Delete Account**, confirm | "Emergency" removed; any slices deleted; total updates accordingly | | |
| 12.4 ⛔ | Tap ⚙ on `Savings` (has balance), tap Delete, tap Cancel in alert | Account NOT deleted — remains in list | | |

---

## Section 13 — Persistence (App Restart)

| # | Action | Expected Result | Result | Comments |
|---|--------|----------------|--------|----------|
| 13.1 | Note the current fund total and a few account/purpose balances | — | | |
| 13.2 | Force-close the app and reopen | App restores to the same state — same total, same accounts, same purposes with correct balances and targets | | |

---

## Summary

| Section | Total Tests | Passed | Failed | Skipped |
|---------|------------|--------|--------|---------|
| 1 — Initial State | 3 | | | |
| 2 — Add Accounts | 7 | | | |
| 3 — Add Purposes | 7 | | | |
| 4 — Deposit | 7 | | | |
| 5 — Expand & Slices | 6 | | | |
| 6 — Spend | 5 | | | |
| 7 — Rebalance | 5 | | | |
| 8 — Account Transfer | 4 | | | |
| 9 — Purpose Re-tag | 4 | | | |
| 10 — Edit Account | 4 | | | |
| 11 — Edit Purpose | 5 | | | |
| 12 — Delete | 4 | | | |
| 13 — Persistence | 2 | | | |
| **Total** | **63** | | | |

---

## Issues Log

| # | Section | Description | Severity (High/Med/Low) |
|---|---------|-------------|------------------------|
| | | | |
