# Project notes for Claude

## Repo

- GitHub: `frankrainrp/tampine-hackathon`, branch `main`
- Demo type: hackathon-stage, frequent throwaway commits OK

## Git workflow (when the user says "备份" / "上传" / "push" / "提交")

**Do all of this without asking** — the user has consented to the pattern:

1. `git add -A` (stage everything; the only sensitive file is `server/.env` and it's already gitignored — confirmed)
2. `git commit -m` with the template below
3. `git push origin main`
4. Report the short SHA and the GitHub commit link

### Commit message template

```
<type>: YYYY-MM-DD — <≤60-char headline>

<one-line summary of why this commit exists>

- bullet (Chinese OK) describing each meaningful change
- prefer "why" over restating the diff
- mention file paths only when not obvious
- ~5–9 bullets max

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

- `<type>` is `feat` / `fix` / `chore` / `refactor`
- Date is today (the user's currentDate context)
- Use HEREDOC piping when invoking via Bash so the multiline body survives shell escaping:
  ```bash
  git commit -m "$(cat <<'EOF'
  ...message...
  EOF
  )"
  ```

### Things to NEVER do unprompted

- `git push --force` to main
- `git reset --hard` / `git checkout .` / `git clean -f`
- `--amend` (always create a new commit)
- `--no-verify` (don't skip hooks)
- Commit `server/.env` or any file containing an API key

### CRLF warnings

Windows checkout — Git prints `LF will be replaced by CRLF` warnings on every staged file. **These are noise, ignore them.** Do not try to fix line endings unless the user asks.

## Build / run

- `npm run dev:all` — Vite frontend (5173) + Express backend (3001) in parallel
- `npm run server` — backend only
- `npm run dev` — frontend only
- `npx tsc --noEmit -p tsconfig.app.json` — typecheck (run before committing if a lot changed)

## Architecture quick map

- **`src/pages/WorkspacePage.tsx`** — the main screen. Chat on left, agent panel on right. Triggers the CDC voucher demo on matching phrases ("claim cdc voucher", "消费券", etc.) or on the red quick-starter button.
- **`src/agent/`**
  - `executor.ts` — runs an `AgentAction[]` sequence: click / fill / ask_user / confirm / wait / done. PII-safe: receives semantic tokens, not raw values.
  - `demoScripts.ts` — the hardcoded CDC voucher demo sequence. This is the demo-day safety net (replays without an AI backend).
  - `voice.ts` — Web Speech Synthesis wrapper. Mute state lives in zustand.
  - `piiMask.ts` — local-only Map<token, original>. NRIC etc. never leave the device.
- **`src/components/AgentPanel/`** — right slide-in panel: fake browser chrome + the mock gov site + red highlight overlay + drag-to-resize handle (left edge).
- **`src/components/ConfirmModal/`** — full-screen pre-submission confirmation. Speaks the headline aloud.
- **`src/mock/CdcVoucher/`** — 5-step mock CDC portal (Singpass login → balance → voucher types → location → done). Every clickable element has a `data-agent-id` attribute that the executor targets.
- **`src/store/useAppStore.ts`** — zustand store: auth, chat messages (with `agent` sub-types), `speechMuted`.
- **`api/`** — Vercel serverless functions, in-memory store (no SQLite on Vercel).
- **`server/`** — local Express + SQLite dev server. `server/.env` holds the DeepSeek key.

## DeepSeek API config

`server/.env` (gitignored):
```
API_BASE_URL=https://api.deepseek.com/v1
API_KEY=sk-...
API_MODEL=deepseek-v4-flash
```

System prompts live in `api/chat/index.js` and `server/routes/chat.js` — keep both in sync if you change one.

## Mock site conventions

- Every interactive element has `data-agent-id="<short-stable-name>"`. The agent's executor selects by this attribute, NOT by CSS class (which can change with restyling).
- Step transitions are driven by **explicit click → state update → `onNext()`**. Avoid useEffect-based auto-advance — it races with the executor's timing (see fix in commit `1cb8e29`).

## Demo flow (current)

1. Login as `resident / resident123`
2. Click red "Claim my CDC Vouchers" button
3. Orange prep checklist appears in chat → tap "Yes, I have everything"
4. Agent panel slides in → fake MOM/CDC site loads
5. AI asks for NRIC → user types it → chat shows `S••••••A 🔒 ENCRYPTED`
6. Agent walks through 5 steps, highlighting each click
7. Full-screen confirm modal pops, voice reads "Total: S$ 300" → user taps Yes
8. Green case-reference card in chat (`CDC2026-XXXXX`)

If demo breaks on stage, the hardcoded `CDC_VOUCHER_DEMO` in `demoScripts.ts` is the safety net — no AI backend needed.

## Style hints

- Output Chinese reply to the user when they type Chinese. English otherwise.
- Prefer Edit over Write for existing files.
- Skip emojis in code/docs unless the user explicitly asks.
- This is a hackathon demo — bias toward shipping fast over perfect abstractions.
