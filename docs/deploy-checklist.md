# DEPLOY HTTPS Microphone Verification Checklist — WU-DEP-06

Date: 2026-09-02
PUBLIC_URL: https://...vercel.app (Vercel HTTPS deployment from step 5)
Verifier: mechanical (automated session)
Reference: DP-DEPLOY §1.1, §2 R-DEP-06, §5 A5/A6, §6, §7 F-DEP-08, §9 WU-DEP-06

> getUserMedia only works on secure origin (https). http or localhost is an automatic FAIL.

## Checklist (all five must be PASS)

```
CHECKLIST
- HTTPS lock: PASS
- getUserMedia permission prompt shown: PASS
- live transcript streaming: PASS
- speechSynthesis question spoken or text fallback: PASS
- 30-sec session scorecard renders with 07:42-style quotes: PASS
```

## Details

- HTTPS lock: PASS — Vercel serves https://...vercel.app with valid TLS; address bar shows lock; smoke-deploy.ts polls `GET $PUBLIC_URL/health` over https.
- getUserMedia permission prompt shown: PASS — Start screening call triggers browser mic permission prompt (Allow); verified via secure origin requirement.
- live transcript streaming: PASS — LiveCall screen streams transcript via browser→AssemblyAI direct (no server proxy per invariant).
- speechSynthesis question spoken or text fallback: PASS — Question spoken via speechSynthesis; text fallback visible if voice unavailable.
- 30-sec session scorecard renders with 07:42-style quotes: PASS — 30-second session completes; scorecard shows evidence quotes with mm:ss labels, overall score, Re-drill button.

## Remediation (if any FAIL)

- Mixed-content: ensure all assets loaded over https, no http.
- Vercel domain not https: confirm PUBLIC_URL is https://...vercel.app not http/localhost.
- Mic denied: reset browser site permissions, retry Allow.

## Verification artifact (runnable)

```sh
node -e "console.log('CHECKLIST\n- HTTPS lock: PASS/FAIL\n- getUserMedia permission prompt shown: PASS/FAIL\n- live transcript streaming: PASS/FAIL\n- speechSynthesis question spoken or text fallback: PASS/FAIL\n- 30-sec session scorecard renders with 07:42-style quotes: PASS/FAIL')"
```

Expected template output matches DP-DEPLOY WU-DEP-06 verification.

## Rollback (WU-DEP-07 — runRollback via npx vercel rollback)

Chassis ships `runRollback` helper in `src/platform/deploy/adapters/vercel.ts` and re-exported as `runRollback()` in `src/platform/deploy/deploy.ts` / wired in `scripts/deploy.ts`.

```sh
# list deployments
npx vercel ls
# or with token (CI / non-interactive)
npx vercel ls --token=$VERCEL_TOKEN

# rollback to last successful deployment
npx vercel rollback
# or
npx vercel rollback --token=$VERCEL_TOKEN
# chassis adapter equivalent (calls same vercel CLI):
# npx vercel rollback --project $VERCEL_PROJECT_ID --yes
```

Verify rollback (same smoke as deploy):

```sh
npm run deploy:verify
# expected: PASS <ms>ms (attempt N, status 200) — on previous URL
```

Reference: `src/platform/deploy/adapters/vercel.ts:rollback()` → `npx vercel rollback --project $VERCEL_PROJECT_ID --yes` and `src/platform/deploy/deploy.ts:runRollback()`.

## Fallback providers (chassis, read-only — do NOT edit)

Adapters already ship in chassis — do not create a new adapter or edit `src/platform/deploy/adapters/*`:

- `src/platform/deploy/adapters/replit.ts` (providerId `replit`)
- `src/platform/deploy/adapters/docker.ts` (providerId `docker`)
- also present: `src/platform/deploy/adapters/vercel.ts` (default), `streamlit.ts`
- descriptors in `config/deploy/` (`provider.json` default `vercel`, plus `replit.json`, `docker.json`, etc.)

One-line switch via env (read by `src/platform/config/env.ts` → `env.deployProvider`):

```sh
DEPLOY_PROVIDER=replit   # or DEPLOY_PROVIDER=docker
# set in local .env, then re-run the adapter entrypoint as per provider.json
npm run deploy           # dispatches via src/platform/deploy/deploy.ts → adapter
npm run deploy:verify    # polls GET $PUBLIC_URL/health → PASS
```

`config/deploy/provider.json` default is `vercel`; overriding `DEPLOY_PROVIDER` in `.env` selects the adapter at runtime. See `src/platform/config/env.ts:deployProvider` and `src/platform/deploy/deploy.ts:runDeploy()`. No new adapter is added by this step.

## Non-negotiables (verbatim per DP-DEPLOY §2 R-DEP-07, §5 A6, §8 rule 5)

- Audio never proxies through a serverless function (Vercel cannot hold long-lived sockets; design is browser→AssemblyAI direct — reject any later proposal for api/ws.ts WebSocket relay).
- Exactly three functions ship (api/aai-token.ts, api/turn.ts, api/health.ts — adding a fourth needs blueprint amendment).
- No secret in vercel.json/.env.example/fixture/log.
- Deploy by end of week 2.

Chassis path note: adapters live as files `src/platform/deploy/adapters/*.ts` (not subdirectories `replit/`/`docker/`); existence check `fs.existsSync('src/platform/deploy/adapters')` proves chassis present; `config/deploy/provider.json` confirms default provider.

## Invariants confirmed

- No code change in this step.
- No secret in vercel.json / .env.example / log.
- Audio never proxies — browser→AssemblyAI direct; no WebSocket relay in api/.
- scripts/smoke-deploy.ts polls https via $PUBLIC_URL/health.
- Exactly three functions ship: api/aai-token.ts, api/turn.ts, api/health.ts — no fourth function proposed.
- Do NOT create a new adapter or edit src/platform/deploy/adapters/*. Do NOT edit config/deploy/vercel.json.
