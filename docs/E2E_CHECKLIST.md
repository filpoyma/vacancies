# E2E checklist (MVP)

Run with a configured `.env`, MongoDB, and `config/config.ts` sources.

## Startup

- [ ] `npm run dev` connects to MongoDB (`[Database] Connected`)
- [ ] Telegram session is reused without login prompt (`[Telegram] Authorized as ...`)
- [ ] Collector reports monitored source count (`[Collector] Monitoring N source(s)`)
- [ ] Notification group resolves or is created (`[Notification] Using notification group ...`)

## Message flow

- [ ] Post a test vacancy message in a configured group (include "hiring" / "вакансия" and stack keywords)
- [ ] Logs: `[Message] <source> / <id>`, `[Parser] Vacancy detected`, `[Matcher] Score: ...`
- [ ] MongoDB: new `Vacancy` document with `matchScore` / `isRelevant`
- [ ] Re-posting the same Telegram message is skipped (`[Database] Message already processed`)
- [ ] Same vacancy from another group merges fingerprint (`[Database] Vacancy duplicate merged`)
- [ ] Relevant **new** vacancy appears in Telegram group **«Сохраненные вакансии»**

## Shutdown

- [ ] `Ctrl+C` logs shutdown, disconnects Telegram and MongoDB, exits with code 0
