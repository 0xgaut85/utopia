# Utopia network simulator

A 24/7 Railway worker that fills the app over five days while real people can still use it. This file is the spec. It is not executable and it contains no keys.

Clock: **T+0** is the first successful worker start, stored once in the app DB. The run lasts **five days** (T+0 through T+4 23:59, timezone **Europe/Warsaw**). If we start late, the same offsets apply. Do not hard-code calendar dates. Restarts must not reset T+0.

## Goals

| Metric | By T+4 23:59 Europe/Warsaw |
| --- | --- |
| Users | **300** (27 at bootstrap, 273 jittered after) |
| Bounties | **75** |
| Fee (analytics) | **$1,005.00** |
| Reward volume | **$10,050** |
| Launch snapshot | **7** open bounties, **20** pending clips, ready before the X post |

Fee is 10% of the posted reward (`platformFeeOn` in `lib/app/payments.ts`). The contributor is paid the posted reward only.

## In / out

**In:** synthetic users and bounties (`isSeed: false`, `isSynthetic: true`), real funding and payout txs, closes that move points, leaderboard, data collected, fee, volume, on offer.

**Out:** `isSeed: true`. Fake explorer hashes. Auto-accepting a real person. You funding agent wallets by hand. Creating a key at runtime.

## Hard rules (from review)

1. **One Railway replica.** Two workers break the $650 float.
2. **Spendable check before every escrow send.** `spendable = on-chain balance − sum(bountyDepositTotal of open real tasks on that chain)`. Real means `isSynthetic === false`. Refuse the move if spendable is below the next send. Never sweep the wallet.
3. **Job journal, not wallet guessing.** Persist each money job (`WorkerJob`) with step + tx hashes **before** broadcast. On boot, resume the open row. Do not infer “finish the return” only from a balance.
4. **T+0 is a row.** `WorkerState.startedAt` written once. Scheduler reads that, never `Date.now()` as day zero.
5. **Admin queue is real people only.** Filter out `user.isSynthetic` and `task.isSynthetic`. Accepting a fake clip closes the bounty with no chain payout.
6. **Wallets are attached, never created.** 300 rows already in the wallet DB. User `i` gets `walletIndex` `i`. Launch does not generate a key.
7. **Accept after the return confirms.** Close order ends with `acceptSubmission`. Not before.
8. **Usernames** are `^[a-zA-Z0-9_]{3,20}$` and keep the casing people typed. Unique case-insensitively. A few `0xName` handles are fine (`0xDaegon`). Reject `0x` plus hex-only (looks like a wallet). Reserved in `sim/plan/users.json`. On collision with a real signup, skip that name.

## What you fund (only this)

Two addresses, three chain balances. All **300 wallets are generated before the worker runs**, loaded into a **separate Railway Postgres**, and backed up in a file you keep. The worker only signs with a key it already loaded. It tops up **that user’s** wallet from escrow only when they are about to send.

| Chain | Address | Put on it | Why that amount |
| --- | --- | --- | --- |
| Base | `0x8ac4F91442f4Ef4EfDa321d019A0B056fC3BF57E` | **$650 USDC** + **0.08 ETH** | Peak send is $550 ($500 + 10%). $100 slack. ETH is for gas top-ups only. |
| Robinhood | same address, chain id **4663** | **$120 USDG** + **0.015 ETH** | Peak send $110 if a $100 bounty lands here. ETH on RH is **not** the Base ETH. |
| Solana | `DXszVtcKYSwi1hkMWCp8S2YmAN7UACau8sSHnaSbof8w` | **$120 USDC** + **0.25 SOL** | Peak $110. Extra SOL covers first-time USDC token accounts. |

You set `ESCROW_KEY_EVM`, `ESCROW_KEY_SOLANA`, `SIM_WALLET_SECRET`, app `DATABASE_URL`, and `SIM_WALLET_DATABASE_URL` on Railway. You never send to user addresses yourself.

**Do not drain escrow by hand while the worker is running.** A real user deposit during the week is fine. The worker never sweeps the whole balance.

## How money moves

Escrow is the only bank (the public deposit addresses). One **global money lock** in the app DB (not just process memory): create and close never overlap. Only one USDC/USDG movement is in flight at a time.

Token contracts are the ones in `lib/app/verify-deposit.ts` (Base USDC, Solana USDC mint, Robinhood USDG). Amounts: create uses `bountyDepositTotal(price)`, close uses `priceUsdc`.

**Order for every user send (create or close):**

1. If Base/RH ETH `< 0.0003`, escrow sends **exactly 0.0004 ETH**. If Solana SOL `< 0.002`, escrow sends **exactly 0.005 SOL** and creates the USDC ATA if missing.
2. Then the stablecoin hop.

Wallets stay empty until they create or win. No airdrop. No “send the whole gas bag.”

**Create (serial, one `WorkerJob`):**

1. Gas / ATA for the creator.
2. Escrow → creator: `bountyDepositTotal(reward)`.
3. Creator → escrow: same amount. This hash is `depositTxHash`.
4. Insert the `Task` with `fundedAt`, `depositNetwork`, that real hash, `isSynthetic: true`, `maxSubmissions: 20`.
5. Release the lock only after step 3 confirms.

Net stablecoin on escrow is unchanged. Peak out: **$550** on Base.

**Close (serial, same lock, same job style):**

1. Gas / ATA for the winner.
2. Escrow → winner: **reward only**.
3. Winner → escrow: **reward only**.
4. `acceptSubmission` (rejects other pending clips, awards points, sets `status: closed`).

Net unchanged. Explorer shows a payout.

### Winner rule (strict, one function, no fallback)

The worker may accept a winner only if **all** of these are true:

1. `task.isSynthetic === true`
2. `user.isSynthetic === true` and they have a `SimWallet` row
3. `user.id !== task.creatorId`
4. They are **not** a real Privy user (`privyId` starts with `sim:`)

Prefer a synthetic who has **not** won yet. If that user has no clip on the task yet, the worker writes one, then accepts it. Real submissions are never in the pick list. If something fails, the bounty stays open.

### Recovery after a crash

On every boot, before the scheduler:

1. Read `WorkerState.startedAt`. If missing, this boot **is** T+0. Write it.
2. If a `WorkerJob` is open, resume at the next unfinished step. Do not start a second top-up when the journal already has the first tx.
3. Idempotent on username, slug, `depositTxHash`, job id.

Balance-only heuristics are a last-ditch log, not the recovery path.

### On-chain vs analytics

Creates and payouts net to zero. Base escrow stays about **$650**. Analytics **Fee** is still **$1,005** because it is 10% of `Task.priceUsdc`, not the wallet balance. Do not fund $1,005 unless you want the wallet to display that number.

## Catalog (checked three ways)

Prices: 2, 3, 5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 500. No $750. No $1,000. Harder brief → higher price.

| Price | Count | Rewards | Fee |
| --- | --- | --- | --- |
| $2 | 3 | $6 | $0.60 |
| $3 | 3 | $9 | $0.90 |
| $5 | 4 | $20 | $2.00 |
| $10 | 5 | $50 | $5.00 |
| $15 | 6 | $90 | $9.00 |
| $20 | 5 | $100 | $10.00 |
| $25 | 6 | $150 | $15.00 |
| $50 | 6 | $300 | $30.00 |
| $75 | 5 | $375 | $37.50 |
| $100 | 5 | $500 | $50.00 |
| $150 | 4 | $600 | $60.00 |
| $200 | 8 | $1,600 | $160.00 |
| $250 | 5 | $1,250 | $125.00 |
| $500 | 10 | $5,000 | $500.00 |
| **Total** | **75** | **$10,050** | **$1,005.00** |

### Chains

**60 Base / 11 Solana / 4 Robinhood.**

Every bounty **≥ $150** is Base (27 of them).  
The **48** bounties at **$2–$100** split 33 Base / 11 Solana / 4 Robinhood.  
Worker rejects any Solana/RH task above $100. Lists keep Sol/RH at **≤ $75** so the $120 float has slack.

Exact chain, `creatorKind`, hidden `funder`, and close flags live in `sim/plan/bounties.json`.

## Launch snapshot (T+0 bootstrap)

Once, resumable if it dies mid-way.

1. Create the **27** launch users from `users.json`. Attach the seeded `SimWallet` at `walletIndex`. `privyId = sim:<username>`, `isSeed: false`, `isSynthetic: true`. Copy **public** addresses only onto `wallet` / payout fields (EVM onto Base and RH, Solana onto Solana).
2. Fund the **7** launch bounties (gas + create loop). Deadlines **21 days** out.
3. Write **20** pending submissions from the other launch users. Counts: **2, 4, 3, 5, 1, 3, 2**. `maxSubmissions = 20`. Creator never submits to self.
4. **Do not accept** any launch clip.

| # | Price | Clips | Stay open |
| --- | --- | --- | --- |
| 1 | $500 | 2 | yes |
| 2 | $500 | 4 | yes |
| 3 | $250 | 3 | yes |
| 4 | $200 | 5 | yes |
| 5 | $100 | 1 | yes |
| 6 | $50 | 3 | yes (Solana) |
| 7 | $25 | 2 | yes (Robinhood) |

Rewards **$1,625**. Fee **$162.50**. On offer **$1,625**. Clips submitted **20**. Contributors **20**. Leaderboard empty.

Public activity is the **count** on the card. Media is admin-only. `photo` is a tiny placeholder; `sizeBytes` is 40–120 MB. Analytics must sum **`sizeBytes`**, not `LENGTH(photo)`.

## Five-day bounty schedule (exact)

15 / day. Monday is the 7 launch + the other **8 × $500**.

| Day | Bounties posted | Rewards | Fee | Fee cumulative |
| --- | --- | --- | --- | --- |
| T+0 | Launch 7, then 8 × $500 | $5,625 | $562.50 | **$562.50** |
| T+1 | 250×2, 200×2, 150, 100, 75, 50, 25, 20, 15, 10, 5, 3, 2 | $1,355 | $135.50 | **$698.00** |
| T+2 | 250, 200×2, 150, 100, 75, 50, 25, 20, 15×2, 10, 5, 3, 2 | $1,120 | $112.00 | **$810.00** |
| T+3 | 250, 200×2, 150, 100, 75, 50, 25, 20, 15, 10, 5×2, 3, 2 | $1,110 | $111.00 | **$921.00** |
| T+4 | 200, 150, 100, 75×2, 50×2, 25×2, 20×2, 15×2, 10×2 | $840 | $84.00 | **$1,005.00** |

Times inside each day are the `offsetMinutes` in the JSON (spaced so the money lock can finish). Other deadlines: 7–21 days from post time.

## Users and wallets

Each synthetic user has their own wallet so ~50 closes become ~50 leaderboard names.

Marketplace creator is a label only: **AI Lab**, **Robotics Team**, or **Private**. Not a username, not on the leaderboard. `funder` in `bounties.json` is the hidden wallet that signs the deposit. Briefs ask for phone **video**, not stills.

**Wallets exist before any USDC moves.**

1. `sim/secrets/` is gitignored **before** any generate script runs.
2. A local script writes `sim/secrets/wallets.json`: 300 EVM + 300 Solana pairs. You keep that file. Keys are not pasted in chat.
3. Railway CLI creates a **second Postgres**. Seed 300 rows (addresses public, private keys encrypted with `SIM_WALLET_SECRET` as AES-256-GCM, nonce stored).
4. Worker creates the `User` and copies only the public address. It does not insert a `SimWallet`.
5. Before `escrow → winner`, decrypt and **test-sign**. Do not send if that fails.

If the wallet DB is wiped, re-seed from your file. If you lose the file **and** that DB, in-flight USDC can be stuck.

After five days: **300** accounts, **300** wallets, **~50** winners. Mix of username styles in `users.json`. Avatars later in `public/sim-avatars/`.

## Closes

Close **50 / 75**. Leave **25** open, including **both launch $500s**.

Leftover (on offer **$2,237**): 2×$500, 1×$250, 2×$200, 1×$150, 1×$100, 1×$75, 2×$50, 2×$25, 2×$20, 2×$15, 2×$10, 2×$5, 2×$3, 3×$2.

Closed rewards **$7,813** → **781,300** points. Flags are on each row in `bounties.json`. Closes start after bootstrap, gated by the lock. Mostly $15–$250.

A worker bounty is never closed with a real user’s clip.

## What the app already does (worker must match)

- Marketplace / analytics / leaderboard: `isSeed: false` only.
- Fee card: `sum(platformFeeOn(priceUsdc))` on every non-seed task, including ones left open.
- Volume / on offer: sum of `priceUsdc` (all / open via `isBountyOpen`).
- Points: `taskPoints = round(priceUsdc * 100)` on accept.
- `isBountyOpen` also hides a card at `submissionCount >= maxSubmissions`. Keep max at 20.
- Title 8–90, brief 40–1200, category `location` | `object` | `coverage`, no em dashes.
- Create API is Privy-only. The worker writes Prisma itself and must still set `fundedAt` and a real `depositTxHash`.

## App changes (still to build)

- `User.isSynthetic`, `Task.isSynthetic`, `Submission.sizeBytes`, `WorkerJob`, `WorkerState`. `WorkerEvent` is already in the schema.
- Analytics GB: `sum(sizeBytes)`, not `LENGTH(photo)`.
- Admin queue: hide synthetics.
- `isSynthetic` is **not** a marketplace filter.
- Wallet DB (worker only): `SimWallet`. Next.js never gets `SIM_WALLET_DATABASE_URL`.
- `publicUser` must never grow a private-key field.
- Worker logs `WorkerEvent` with its own Prisma client on the app DB. `node sim/worker.mjs` cannot import `@/lib/app/worker-log`. Kinds: `heartbeat`, `tick`, `user.join`, `bounty.create`, `clip.submit`, `fund`, `payout`, `close`, `error`. Heartbeat every 60s.

## Railway

New worker service, **replicas = 1**, no public domain, restart always:

```
node sim/worker.mjs
```

Env: app `DATABASE_URL`, `SIM_WALLET_DATABASE_URL`, `ESCROW_KEY_EVM`, `ESCROW_KEY_SOLANA`, `SIM_WALLET_SECRET`, `BASE_RPC_URL`, `HELIUS_RPC_URL`, `ROBINHOOD_RPC_URL`.

## Private keys

Never in git, never in `sim/plan/*.json`, never in chat.

1. `sim/secrets/` is in `.gitignore` before generate runs.
2. You receive keys as that local file, not in this chat.
3. Escrow keys stay Railway env only.
4. If a 64-hex key appears in `git diff`, do not commit.

## Approval files

- `sim/plan/users.json` — 300 rows, no keys. **Locked 2026-08-24.**
- `sim/plan/bounties.json` — 75 rows, no keys. **Locked 2026-08-24.**

Worker does not run until the schema/queue work is deployed and the three escrow balances are funded.

## Build order

1. `.gitignore` for `sim/secrets/` (done).
2. Name + bounty lists (done).
3. Lists locked 2026-08-24 (done).
4. Generate 300 wallets → `sim/secrets/wallets.json` (done locally). Back that file up.
5. Railway wallet Postgres + `SIM_WALLET_SECRET` + seed (done). Service `Postgres-BYsN`. Keys encrypted at rest.
6. App schema (`isSynthetic`, `sizeBytes`, `WorkerJob`, `WorkerState`) + analytics GB + admin queue filter (done in code).
7. Worker.
8. You fund the three escrows. Deploy. Tweet when the 7 cards show counts.
