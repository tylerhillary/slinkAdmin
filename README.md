# Slink Admin

Enterprise console for the **Slink** skill-sharing platform — learner registration, skill-test readiness and tutor matching, backed by **Firebase Firestore** in realtime.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Components for the shell) |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess`, zero `any` |
| Styling | Tailwind CSS 3 with a token architecture in `tailwind.config.ts` |
| Data | Firebase Web SDK 10.8.1 — `onSnapshot` realtime subscriptions |
| Icons / Type | lucide-react · Inter + JetBrains Mono via `next/font` |

## Getting started

```bash
npm install
npm run dev
```

The console runs at `http://localhost:3000`.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Database

The app talks to the **same `slink-website` Firebase project as before** — same collections, same document shapes, same field names. Nothing about the schema changed during the UI rebuild.

| Collection | Access | Used for |
| --- | --- | --- |
| `registrations` | read (realtime), update, delete | The intake queue; status, tutor link and `mailed` flag |
| `submissions` | read (realtime) | Skill-test scores, joined onto registrations |
| `mailQueue` | create | Match notifications for tutor and learner |

Configuration lives in `lib/firebase/config.ts`. The values are checked in, exactly as they were in the previous dashboard — Firebase web API keys are public identifiers, and access is governed by Firestore security rules. Each field can be overridden per environment:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=…
```

### Field tolerance

`registrations` and `submissions` have accumulated several generations of field names. The adapters in `lib/adapters/` read every historical spelling — `readinessScore`, `correctCount`, `skillTestRating`, `resumeUrl`/`cvUrl`, and so on — so no existing document stops resolving. Add new fallbacks there rather than in components.

## Architecture

```
app/
  layout.tsx              Root: fonts, theme bootstrap, toast provider
  (dashboard)/
    layout.tsx            Registry provider + app shell
    page.tsx              Server Component entry, Suspense boundary
    loading.tsx           Route skeleton
    error.tsx             Segment error boundary
components/
  ui/                     Primitives: button, input, checkbox, card, badge,
                          avatar, drawer, modal, toast, skeleton, empty-state
  modules/                Composed features: shell, sidebar, topbar,
                          command palette, metric grid, operations panel,
                          filter toolbar, registry table, person drawer,
                          delete dialog, mail queue
  providers/              Toast + registry (client state) contexts
hooks/                    use-collection, use-row-selection, use-theme,
                          use-hotkey, use-media-query
lib/
  firebase/               Client singleton, config, every Firestore write
  adapters/               Firestore document → typed view model
  domain/                 Filters, counts, matching, CSV, email templates
types/                    Shared domain contracts
legacy/                   The previous single-file dashboard, kept for reference
```

**Data flow.** `RegistryProvider` holds the two realtime subscriptions, joins submissions onto registrations, and exposes filtered/searched views plus every mutation. Components receive typed props and never touch Firestore directly — writes go through `lib/firebase/mutations.ts`.

**Optimistic updates.** Toggling the mailed flag or reverting a connection patches local state immediately, then reconciles when the snapshot lands. Failures roll back and raise a toast.

## Design system

Colour, spacing and type are declared once as CSS custom properties in `app/globals.css` and surfaced through `tailwind.config.ts` as `hsl(var(--token) / <alpha-value>)`, so every utility supports opacity modifiers.

- **Light and dark** share one token contract; only the channel values change.
- **Restrained palette** — neutral surfaces and borders throughout, with a single accent reserved for active and intent states. Semantic colour appears as small status dots, not filled backgrounds, so dense tables stay readable.
- **Theme** persists to `localStorage` and is applied before first paint by an inline script, so there is no flash.

## Features

- Realtime registration queue with segment filters, free-text search and batch selection
- ⌘K / Ctrl+K global search across segments and registrants
- Collapsible, icon-state sidebar with live counts; breadcrumb tracking in the top bar
- Skill-test readiness joined from `submissions`, with score resolution
- Tutor matching by skill overlap, with connect + queued notifications to both parties
- Assessment mail queue tracking and per-record mailed flags
- CSV export of the current view or the current selection
- Name-match confirmation before any deletion

---

*Administrative use only. Requires access to the `slink-website` Firebase project.*
