# Utopia network simulator

A 24/7 Railway worker that fills the app over five days while real people can still use it. This file is the spec. It is not executable and it contains no keys.

Clock: **T+0** is the first successful worker start (intended Mon 24 Aug 2026). The run lasts **five days** (T+0 through T+4, intended Fri 28 Aug). If we start late, the same offsets apply. Do not hard-code calendar dates in the worker.

## Goals

| Metric | By T+4 23:59 |
| --- | --- |
| Users | **300** (27 at bootstrap, 273 jittered after) |
| Bounties | **75** |
| Fee (analytics) | **$1,005.00** |
| Reward volume | **$10,050** |
| Launch snapshot | **7** open bounties, **20** pending clips, ready before the X post |

Fee is 10% of the posted reward (`platformFeeOn` in `lib/app/payments.ts`). The contributor is paid the posted reward only.

## In / out

**In:** synthetic users and bounties (`isSeed: false`, `isSynthetic: true`), real funding and payout txs, closes that move points, leaderboard, data collected, fee, volume, on offer.

**Out:** `isSeed: true` (marketplace, analytics, and leaderboard hide those). Fake explorer hashes. Auto-accepting a real person. You funding agent wallets by hand.

## What you fund (only this)

Two addresses, three chain balances. All **300 wallets are generated before the worker runs**, loaded into a **separate Railway Postgres**, and backed up in a file you keep. The worker never creates a key at payout time. It only signs with a key it already loaded. The worker tops up **that user’s** wallet from escrow only when they are about to send.

| Chain | Address | Put on it | Why that amount |
| --- | --- | --- | --- |
| Base | `0x8ac4F91442f4Ef4EfDa321d019A0B056fC3BF57E` | **$650 USDC** + **0.08 ETH** | Peak send is $550 ($500 + 10%). $100 slack. ETH is for gas top-ups only. |
| Robinhood | same address, chain id 4663 | **$120 USDG** + **0.015 ETH** | Peak send $110 if a $100 bounty lands here. ETH on RH is **not** the Base ETH. |
| Solana | `DXszVtcKYSwi1hkMWCp8S2YmAN7UACau8sSHnaSbof8w` | **$120 USDC** + **0.25 SOL** | Peak $110. Extra SOL covers first-time USDC token accounts. |

You set `ESCROW_KEY_EVM`, `ESCROW_KEY_SOLANA`, `SIM_WALLET_SECRET`, app `DATABASE_URL`, and `SIM_WALLET_DATABASE_URL` on Railway. You never send to user addresses yourself.

**Do not drain escrow by hand while the worker is running.** A real user deposit during the week is fine; the worker never sweeps the whole balance.

## How money moves

Escrow is the only bank. One **global money lock**: create and close never overlap. Only one USDC/USDG movement is in flight at a time. That is what makes $650 safe. Two overlapping $500 flows would need $1,050.

**Gas, just before that user must send:**

- Base / Robinhood: if their ETH `< 0.0003`, escrow sends **exactly 0.0004 ETH**.
- Solana: if their SOL `< 0.002`, escrow sends **exactly 0.005 SOL**, and creates the USDC ATA if missing.

Wallets stay empty until they create or win. We do not pre-fund all 300. ~75 creates + ~50 payouts is about 0.05 ETH of top-ups; **0.08 ETH** on Base still covers it.

No airdrop. No “send the whole gas bag.”

**Create (serial):**

1. Escrow → **creator’s** wallet: `bountyDepositTotal(reward)` (reward + 10%)
2. Creator → escrow: same amount. This hash is `depositTxHash` on the task.
3. Release the money lock only after step 2 confirms.

Net stablecoin on escrow is unchanged. Peak out: **$550** on Base.

**Close (serial, same lock):**

4. Gas-top-up the winner if needed.
5. Escrow → winner: **reward only**.
6. Winner → escrow: **reward only**.

Net unchanged. Explorer shows a payout.

### Winner rule (strict, one function, no fallback)

The worker may accept a winner only if **all** of these are true:

1. `task.isSynthetic === true`
2. `user.isSynthetic === true` and they have a `SimWallet` row
3. `user.id !== task.creatorId`
4. They are **not** a real Privy user

Prefer a synthetic who has **not** won yet, so ~50 closes become ~50 different names on the leaderboard. If that user has no clip on the task yet, the worker writes one, then accepts it. Real submissions are never in the pick list. If something fails, the bounty stays open.

### Recovery after a crash

On every boot, before the scheduler:

- If a creator wallet still holds USDC/USDG from a top-up and that task has no `depositTxHash` yet, finish creator → escrow (do not send a second top-up).
- If a winner still holds a payout and the return is not recorded, finish winner → escrow.
- Then resume the schedule. Idempotent on username, slug, `depositTxHash`.

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

Count: 3+3+4+5+6+5+6+6+5+5+4+8+5+10 = **75**.  
Sum: 6+9+20+50+90+100+150+300+375+500+600+1,600+1,250+5,000 = **10,050**.  
Fee: 10% of each whole-dollar price, summed = **1,005.00**.

### Chains

**60 Base / 11 Solana / 4 Robinhood.**

Every bounty **≥ $150** is Base (27 of them: 4+8+5+10).  
The **48** bounties at **$2–$100** split 33 Base / 11 Solana / 4 Robinhood.  
Worker rejects any Solana/RH task above $100 (deposit would exceed the $120 float).

## Launch snapshot (T+0 bootstrap)

Once, resumable if it dies mid-way.

1. Create **27 users**, each with a new `SimWallet`. `privyId = sim:<username>`, `isSeed: false`, `isSynthetic: true`. Set `wallet` / payout addresses to the **public** address only.
2. Fund the **7** bounties from those creators’ wallets (gas + create loop). Deadlines **21 days** out.
3. Write **20** pending submissions from the other launch users. Counts: **2, 4, 3, 5, 1, 3, 2**. `maxSubmissions = 20`. Creator never submits to self.
4. **Do not accept** any launch clip. Leaderboard stays empty until later closes.

| # | Price | Clips |
| --- | --- | --- |
| 1 | $500 | 2 |
| 2 | $500 | 4 |
| 3 | $250 | 3 |
| 4 | $200 | 5 |
| 5 | $100 | 1 |
| 6 | $50 | 3 |
| 7 | $25 | 2 |

Rewards **$1,625**. Fee **$162.50**. On offer **$1,625**. Clips submitted **20**. Contributors **20**. Leaderboard still empty (0 points).

Public activity is the **count** on the card. Media is admin-only. `photo` is a tiny placeholder; `sizeBytes` is a realistic 40–120 MB so “data collected” is not zero after the schema change.

## Five-day bounty schedule (exact)

15 / day. Monday is the 7 launch + the other **8 × $500**.

| Day | Bounties posted | Rewards | Fee | Fee cumulative |
| --- | --- | --- | --- | --- |
| T+0 Mon | Launch 7, then 8 × $500 | $5,625 | $562.50 | **$562.50** |
| T+1 Tue | 250×2, 200×2, 150, 100, 75, 50, 25, 20, 15, 10, 5, 3, 2 | $1,355 | $135.50 | **$698.00** |
| T+2 Wed | 250, 200×2, 150, 100, 75, 50, 25, 20, 15×2, 10, 5, 3, 2 | $1,120 | $112.00 | **$810.00** |
| T+3 Thu | 250, 200×2, 150, 100, 75, 50, 25, 20, 15, 10, 5×2, 3, 2 | $1,110 | $111.00 | **$921.00** |
| T+4 Fri | 200, 150, 100, 75×2, 50×2, 25×2, 20×2, 15×2, 10×2 | $840 | $84.00 | **$1,005.00** |

Monday check: 10×$500 + $250+$200+$100+$50+$25 = 5,000+625 = **$5,625**.  
Tue–Fri: 1,355+1,120+1,110+840 = **$4,425**.  
Week: 5,625+4,425 = **$10,050**.  
Fees: 562.50+135.50+112+111+84 = **1,005.00**.

Times inside each day are random. Other deadlines: 7–21 days from post time.

## Users and wallets

Yes: **15 keys meant ~15 people with points.** The leaderboard is ordered by points; if only 15 ever win, only those 15 show as earners. That is why each synthetic user now gets their own wallet.

**Wallets exist before any USDC moves.**

1. A local script writes `sim/secrets/wallets.json` (gitignored): 300 EVM + 300 Solana pairs, address + private key. You keep that file. Keys are not pasted in chat.
2. Railway CLI creates a **second Postgres** (`SIM_WALLET_DATABASE_URL`). The app database never stores private keys.
3. A one-shot seed loads the 300 rows (addresses public, private keys encrypted with `SIM_WALLET_SECRET`).
4. When the worker creates the `User` in the app DB, it copies only the **public** address onto `wallet` / payout fields.
5. Before `escrow → winner`, the worker loads the key, decrypts it, and **does not send** if that fails. Then `winner → escrow` uses the same key.

You still only fund the three escrows. The 300 wallets start at **zero**. If the wallet DB is wiped, re-seed from your file. If you lose the file **and** that DB, in-flight USDC on a user address can be stuck. Keep the file.

After five days: **300** accounts, **300** wallets, **~50** different winners on the leaderboard. Mix: first names, first+last, gamer tags, `0x…`. Avatars in `public/sim-avatars/`.

### Who the worker may auto-accept

Never a real person. Never the bounty’s creator. Must be `isSynthetic` with a `SimWallet`.

Pick someone who has not won yet so the board spreads. If they have no clip on that bounty, write one, then accept it, then pay **their** wallet and send it back.

## Closes

Close **50 / 75**. Leave **25** open, including **two $500s**.

Suggested leftover (on offer **$2,237**):

2×$500, 1×$250, 2×$200, 1×$150, 1×$100, 1×$75, 2×$50, 2×$25, 2×$20, 2×$15, 2×$10, 2×$5, 2×$3, 3×$2.

Closed rewards **$7,813** → **781,300** points (100 per USDC), spread across **~50** synthetic winners so the leaderboard is a real list, not 15 names.

Closes start after bootstrap, gated by the money lock. Mostly $15–$250 so many payout txs appear.

A bounty created by the worker is never closed with a real user’s clip, even if that clip is the only one.

## What the app already does (worker must match)

- Marketplace / analytics / leaderboard: `isSeed: false` only. Synthetics must stay `isSeed: false`.
- Fee card: `sum(platformFeeOn(priceUsdc))`.
- Volume / on offer: sum of `priceUsdc` (all / open).
- Points: `taskPoints = round(priceUsdc * 100)` on accept.
- Open vs closed: `isBountyOpen` uses status, `expiresAt`, and `submissionCount >= maxSubmissions`. Keep `maxSubmissions` at 20 so 1–5 clips do not auto-close the card.
- Funding link: `depositNetwork` + `depositTxHash` (real hash).
- `Submission.photo` is required; use a tiny placeholder, not an empty string.
- Title 8–90 chars, brief 40–1200, no em dashes (even though Prisma will accept anything).

## App changes

- `User.isSynthetic`, `Task.isSynthetic` — never used as a UI filter.
- App DB: `User.isSynthetic`, `Task.isSynthetic`, `Submission.sizeBytes`, `WorkerEvent`. **No private keys.**
- Worker writes every action through `logWorkerEvent` in `lib/app/worker-log.ts` (or the same `WorkerEvent` row). Kinds: `heartbeat`, `tick`, `user.join`, `bounty.create`, `clip.submit`, `fund`, `payout`, `close`, `error`. Heartbeat at least every 60s so `/adminmode` shows Live.
- Admin polls `GET /api/app/adminmode/activity` every 2.5s. Do not skip logs for money moves.
- Wallet DB (worker only): `SimWallet` with public addresses + encrypted EVM/Solana private keys. The Next.js app never gets this URL.
- `Submission.sizeBytes` — analytics sums this for GB.
- `publicUser` must never grow a private-key field.

## Railway

New worker service, no public domain, restart always:

```
node sim/worker.mjs
```

Env (secrets): app `DATABASE_URL`, `SIM_WALLET_DATABASE_URL`, `ESCROW_KEY_EVM`, `ESCROW_KEY_SOLANA`, `SIM_WALLET_SECRET`, existing RPC URLs.

Private keys are **not** generated at payout time. They are seeded once, then only read.

## Private keys

Never in git, never in `sim/plan/*.json`, never in chat.

1. Add `sim/secrets/` to `.gitignore` **before** the generate script runs.
2. You receive keys as that local file, not in this chat.
3. Escrow keys stay Railway env only. Wallet private keys live in the **wallet** Postgres (encrypted) plus your file.
4. The Next app is never given `SIM_WALLET_DATABASE_URL`, so a bug in `/api/app/me` cannot dump keys.
5. Worker will not send `escrow → winner` unless the private key decrypts and a test sign works.
6. If a 64-hex key appears in `git diff`, do not commit.

## Approval files (next)

- `sim/plan/users.json` — 300 rows: name, style, avatar kind, join offset, `launch` (no keys)
- `sim/plan/bounties.json` — 75 rows: title, brief, location, category, price, chain, creator, deadline, schedule offset, `launch`, planned close, launch clip count

Worker does not run until you approve both and the three escrow balances are funded.

## Build order

1. `.gitignore` for `sim/secrets/` (before any keys exist).
2. Name + bounty lists for your approval (no keys).
3. Generate 300 wallets → `sim/secrets/wallets.json`. You back that file up.
4. Railway CLI: create the **wallet** Postgres, set `SIM_WALLET_SECRET`, seed the 300 rows.
5. App schema (`isSynthetic`, `sizeBytes`) + analytics.
6. Worker (looks up keys, refuses payout without a working PK).
7. You fund the three escrows. Deploy. Tweet when the 7 cards show counts.
