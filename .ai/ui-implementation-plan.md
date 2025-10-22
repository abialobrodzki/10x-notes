# UI Implementation Plan - 10xNotes MVP

## 📋 For AI Agents: How to Use This Document

IMPORTANT: This file is a directory index pointing to detailed UI implementation plans.

All view-level UI implementation plans are stored in:

```
.ai/ui-implementation-plan/
```

Use this index to quickly navigate to the appropriate plan when working on a specific page, modal, or flow.

## 📁 Directory structure

```
.ai/ui-implementation-plan/
├── landing-view-implementation-plan.md        # /  – Landing (generowanie podsumowania bez logowania)
├── login-view-implementation-plan.md          # /login  – Formularz logowania (Supabase Auth)
├── register-view-implementation-plan.md       # /register  – Formularz rejestracji (Supabase Auth)
├── notes-list-view-implementation-plan.md     # /notes  – Lista notatek, filtry, wyszukiwanie, sidebar etykiet
├── note-detail-view-implementation-plan.md    # /notes/{id}  – Szczegóły notatki, edycja, public link
├── public-note-view-implementation-plan.md    # /public/{token}  – Publiczne podsumowanie (read‑only)
├── settings-view-implementation-plan.md       # /settings  – Profil, statystyki, usunięcie konta
└── tag-access-modal-view-implementation-plan.md  # Modal: zarządzanie dostępem do etykiety (owner)
```

## 🔗 Quick links

- UI architecture overview: `.ai/ui-plan.md`
- Type definitions (DTOs, ViewModels): `src/types.ts`
- Tech stack: `.ai/tech-stack.md`
- API reference used by views: `.ai/api-plan.md`

## 🧭 View → Route mapping (MVP)

- Landing: `/`
- Login: `/login`
- Register: `/register`
- Notes list: `/notes` (+ query params for filtry/paginacja)
- Note detail: `/notes/{id}`
- Public summary: `/public/{token}`
- Settings: `/settings`
- Tag access management: Modal dostępny z `/notes` i `/notes/{id}`

## 🧩 Cross-cutting UI conventions

- Framework: Astro 5 (SSR) + React 19 (interaktywność)
- Styling: Tailwind 4 + shadcn/ui (New York)
- State/data: SSR initial data + SWR (client) z optimistic updates i rollbackiem
- A11y: ARIA landmarks, keyboard nav, role="dialog" dla modalów, focus management
- Security/roles: `is_owner` steruje edycją; public links tylko dla ownerów; `/public/{token}` bez oryginału treści

## ✅ Status

All view plans listed above are present and ready to implement. Use each file for detailed: component hierarchy, events, validation rules, types, API integration, error handling, and step‑by‑step tasks.
