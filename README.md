# Telegram Vacancy Monitor

Node.js worker that monitors Telegram groups and channels as a **user account** (MTProto via [teleproto](https://github.com/sanyok12345/teleproto)), detects job posts, stores them in MongoDB, scores them against your filters, and forwards relevant vacancies to a private Telegram group **«Сохраненные вакансии»**.

No Telegram Bot API, no frontend — a single long-running process.

## Requirements

- **Node.js 24+** (native TypeScript execution, no tsx)
- **MongoDB** (local or Atlas)
- **Telegram API credentials** from [my.telegram.org](https://my.telegram.org)
- A Telegram account that is already a member of the groups/channels you want to monitor

macOS (Homebrew MongoDB):

```bash
brew services start mongodb-community
```

## Installation

```bash
git clone <your-repo-url> vacancy
cd vacancy
npm install
cp .env.example .env
```

Fill in `.env` (see below). Application settings (sources, filters) live in [`config/config.ts`](config/config.ts) — never put secrets there.

## Telegram API ID and API hash

1. Open [my.telegram.org](https://my.telegram.org) and sign in with your phone number.
2. Go to **API development tools**.
3. Create an application (any name/platform).
4. Copy **api_id** → `TELEGRAM_API_ID`, **api_hash** → `TELEGRAM_API_HASH` in `.env`.

## Environment variables (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_API_ID` | Yes | Numeric API ID from my.telegram.org |
| `TELEGRAM_API_HASH` | Yes | API hash from my.telegram.org |
| `MONGODB_URI` | Yes (for `npm run dev`) | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/vacancy` |
| `LOG_LEVEL` | No | `trace` … `fatal` (default `info`) |
| `LOG_PRETTY` | No | Set `true` for human-readable dev logs (used by `npm run dev`) |

**Never commit** `.env` or `data/session/` — they are in `.gitignore`. The Telegram session is equivalent to your account login.

## Configure sources and filters (`config/config.ts`)

- **`telegram.sources`** — chats to monitor. Prefer stable **`id`** values (from `telegram:dialogs`). Optional `name` / `username` for matching.
- **`filters`** — roles, skills, excluded keywords, salary target, `remoteOnly`, `minMatchScore`.
- **`notifications.targetTitle`** — name of the supergroup for saved vacancies (default: `Сохраненные вакансии`). Created automatically on first run if missing.

Example source entry:

```ts
{
  id: "-100123456789",
  name: "React Jobs",
  username: "reactjobs",
},
```

## First-time setup (step by step)

### 1. Authorize Telegram

Only `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` are required (no MongoDB yet):

```bash
npm run telegram:login
```

Enter phone number, login code (often in the Telegram app), and 2FA password if enabled. Session is saved under `data/session/` and reused.

### 2. List or pick sources

```bash
npm run telegram:dialogs
```

Interactive add to config:

```bash
npm run telegram:sources
```

For each new chat: **Enter** = add, **`n`** = skip.

### 3. Run the monitor

Ensure `MONGODB_URI` is set, then:

```bash
npm run dev
```

Expected logs (scopes):

- `[Database] Connected`
- `[Telegram] Authorized as @username`
- `[Collector] Monitoring N source(s)`
- `[Notification] Using notification group ...` or group created
- `[App] Collector is running`

When a new relevant vacancy arrives: parser → matcher → MongoDB → notification to **«Сохраненные вакансии»** (only for **new** + **above threshold** vacancies).

Stop with `Ctrl+C` (graceful shutdown: collector → Telegram → MongoDB).

Production build:

```bash
npm run build
npm run start
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run monitor (pretty logs) |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run compiled `dist/src/index.js` |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests (`node:test`) |
| `npm run telegram:login` | User login / session |
| `npm run telegram:dialogs` | List groups & channels |
| `npm run telegram:sources` | Add sources to `config/config.ts` |

## How it works (pipeline)

```text
Telegram message (configured sources)
  → ProcessedMessage (idempotency)
  → Parser (rule-based vacancy detection)
  → Normalizer
  → Matcher (rule-based score vs config.filters)
  → Vacancy (MongoDB, fingerprint dedup)
  → Notification (if isNew && isRelevant)
```

Matching is pluggable via `IVacancyMatcher` ([`src/vacancy/types.ts`](src/vacancy/types.ts)); AI matching can be added later without changing the collector.

## Project structure

```text
config/config.ts          # User settings (sources, filters, notifications)
src/
  index.ts                # Process entry, signals
  app/                    # Bootstrap & shutdown
  config/env.ts           # .env validation
  telegram/               # teleproto client, dialogs, collector
  cli/                    # login, dialogs, configure sources
  messages/               # ProcessedMessage helper
  vacancy/                # parser, normalizer, matcher, dedup
  notifications/          # Telegram notifications
  models/                 # Mongoose models
  database/connection.ts
  utils/                  # logger, project root
test/                     # node:test suites
docs/E2E_CHECKLIST.md     # Manual MVP verification
data/session/             # Telegram session (gitignored)
.env                      # Secrets (gitignored)
```

## Security notes

- Do not log or commit API hash, session files, or auth codes.
- Session files in `data/session/` grant full account access — treat like a password.
- The app only reads groups your account can already access (no bypass of Telegram permissions).

## Testing

```bash
npm test
npm run typecheck
```

Manual E2E: [docs/E2E_CHECKLIST.md](docs/E2E_CHECKLIST.md).

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| `Telegram session is not authorized` | Run `npm run telegram:login` |
| `No Telegram sources resolved` | Fix `config.telegram.sources` IDs with `telegram:dialogs` |
| `Connection failed` (MongoDB) | `MONGODB_URI`, MongoDB running |
| No notifications | `minMatchScore`, `filters`, vacancy must be **new** and **relevant** |
| Duplicate messages skipped | Expected — `ProcessedMessage` prevents reprocessing |

## License

Private / MIT — adjust for your repository.
