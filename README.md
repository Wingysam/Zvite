# Zvite

A minimal event RSVP manager built with SvelteKit and SQLite. Create events, share invite links, and track guest responses in one place.

![Dashboard](screenshots/dashboard.png)

![Party control page](screenshots/party.png)

![RSVP page](screenshots/rsvp.png)

## AI

I consider myself an "agentic engineer". For tasks that are "easier described than done", I use agents to build my software. This project is closer to a quick afternoon hack than a production-ready application.

Most of the code and most of the README were written with AI agents.

Many of my other projects are written with no AI to maintain and build on my own skills, but that is not the case with this project. Feel free to use AI for any contributions you would like to post as PRs.

## Features

- **User accounts** — register, login, and session-based auth
- **Event management** — create events with a name and Markdown description
- **Magic invite links** — generate unique, shareable tokens for each guest group
- **RSVP tracking** — guests respond Yes / Maybe / No per name, with live metrics
- **Self-add names** — optionally allow guests to add their own names from the RSVP page
- **Progressive enhancement** — all admin actions avoid full page reloads when JavaScript is available
- **SQLite via `bun:sqlite`** — synchronous, no ORM, raw SQL

## Tech Stack

| Layer     | Technology                 |
| --------- | -------------------------- |
| Framework | SvelteKit 2 (Svelte 5)     |
| Runtime   | Bun                        |
| Database  | SQLite (`bun:sqlite`)      |
| Styling   | Custom CSS                 |
| Markdown  | `marked` + `sanitize-html` |

## Getting Started

```sh
bun install
bun dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command                          | Description                                  |
| -------------------------------- | -------------------------------------------- |
| `bun dev`                        | Start the dev server                         |
| `bun run build`                  | Production build                             |
| `bun run preview`                | Preview the production build                 |
| `bun run check`                  | Run Svelte type-checking                     |
| `bun run check:watch`            | Type-check in watch mode                     |
| `bun run e2e`                    | Run the Playwright end-to-end suite          |
| `bun run e2e:update-screenshots` | Run e2e tests and refresh README screenshots |

## Project Structure

```
src/
├── routes/
│   ├── +page.svelte           # Landing page
│   ├── +layout.svelte         # App shell, topbar, page title
│   ├── login/+page.svelte     # Login form
│   ├── register/+page.svelte  # Registration form
│   ├── dashboard/+page.svelte # List owned events, create new ones
│   ├── party/[partyId]/       # Event admin page (metrics, invites, members)
│   └── rsvp/[token]/          # Public RSVP page (respond to invites)
├── lib/server/
│   ├── db.ts                  # SQLite init and schema
│   ├── queries.ts             # Prepared statement helpers
│   ├── session.ts             # Cookie session utilities
│   └── markdown.ts            # Markdown rendering with sanitization
├── app.css                    # Global styles
├── app.html                   # HTML shell
└── hooks.server.ts            # Auth guard, session loader
```

## Environment Variables

| Variable          | Default   | Description                                                                                             |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `DISABLE_SIGNUPS` | `false`   | Set to `true` to hide the Register link and block sign-ups. The existing login page will show a notice. |
| `DB_PATH`         | `app.db`  | Path to the SQLite database file. In Docker, defaults to `/data/app.db`.                                |
| `PORT`            | `3000`    | Port the server listens on.                                                                             |
| `HOST`            | `0.0.0.0` | Host to bind to.                                                                                        |

## Docker

```sh
docker build -t zvite .
docker run -d -p 3000:3000 -v zvite-data:/data zvite
```

Persistent data is stored in the `/data` volume (`/data/app.db`).

## Database

The SQLite database (`app.db`) is created automatically on first startup. Schema tables:

- `users` — registered accounts
- `organizations` — optional org grouping
- `organization_members` — user ↔ org membership (M:N)
- `parties` — events
- `party_owners` — polymorphic ownership (User or Organization)
- `invites` — shareable invite links with unique tokens
- `invite_members` — guest names tied to an invite with RSVP status

## Building for Production

```sh
bun run build
bun run preview
```
