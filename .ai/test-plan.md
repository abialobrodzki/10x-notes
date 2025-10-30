# Plan Testów - 10xNotes

## 1. Wprowadzenie

### 1.1 Cel

Zapewnienie jakości, bezpieczeństwa i niezawodności aplikacji 10xNotes - systemu zarządzania notatkami ze spotkań z AI.

### 1.2 Stack technologiczny

- **Frontend**: Astro 5 (SSR) + React 19 + Shadcn/ui + Tailwind CSS 4
- **Backend**: Astro API routes + Node.js adapter
- **Database**: Supabase PostgreSQL + Row Level Security (RLS)
- **Auth**: Supabase Auth (JWT)
- **AI**: OpenRouter API (Grok-4-Fast)

---

## 2. Co Testujemy - Priorytety

### 🔥 **PRIORYTET 1 - Utility Functions** (ROI: 100%)

**Dlaczego**: Czysta logika, używana globalnie, łatwe do testowania

| Moduł                   | Coverage | Kluczowe Testy                                                  |
| ----------------------- | -------- | --------------------------------------------------------------- |
| `pagination.utils.ts`   | 100%     | Offset calculation, edge cases (page 0, empty list)             |
| `pending-note.utils.ts` | 100%     | Expiration (30min), sessionStorage availability, corrupted data |
| `token.utils.ts`        | 100%     | UUID generation, uniqueness                                     |
| `auth.validators.ts`    | 95%      | Email regex, password strength, edge cases                      |

### 🔥 **PRIORYTET 2 - Validators (Zod Schemas)** (ROI: 90%)

**Dlaczego**: Bezpieczeństwo API, input validation, business rules

| Schema                    | Kluczowe Walidacje                                          |
| ------------------------- | ----------------------------------------------------------- |
| `notes.schemas.ts`        | XOR constraint (tag_id OR tag_name), max length, date range |
| `tags.schemas.ts`         | Name validation, ownership checks                           |
| `ai.schemas.ts`           | Content length (5000 chars), model validation               |
| `public-links.schemas.ts` | Token format, expiration                                    |

### 🔥 **PRIORYTET 3 - Middleware & Security** (ROI: 85%)

| Moduł                      | Co Testować                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `rate-limit.middleware.ts` | 100 req/day limit, IP extraction, window reset, concurrent requests |
| `auth.middleware.ts`       | JWT validation, expired tokens, unauthorized access (401/403)       |

### ⚙️ **PRIORYTET 4 - API Endpoints** (ROI: 80%)

**Integration Tests** - kluczowe endpointy:

| Endpoint                 | Scenariusze                                                     |
| ------------------------ | --------------------------------------------------------------- |
| `POST /api/ai/generate`  | Anonymous + auth, rate limiting (429), timeout (60s), telemetry |
| `GET /api/notes`         | Filtering (tag, date, goal_status), sorting, pagination, RLS    |
| `POST /api/notes`        | Create with tag_id/tag_name, XOR validation, auth required      |
| `PATCH /api/notes/{id}`  | Partial updates, ownership check (RLS), 403 for other users     |
| `DELETE /api/notes/{id}` | Cascade delete (public_link), RLS enforcement                   |
| Tag endpoints            | CRUD + tag_access (grant/revoke)                                |

### 🎭 **PRIORYTET 5 - E2E Critical Flows** (ROI: 90%)

**6 głównych przepływów użytkownika:**

1. **Anonymous AI generation → Register → Save note**
   - Generowanie podsumowania bez logowania
   - Rejestracja nowego użytkownika
   - Auto-save z sessionStorage (`?autoSave=true`)

2. **Authenticated note creation + Tag sharing**
   - Tworzenie notatki z AI
   - Współdzielenie tagu z innym użytkownikiem
   - Weryfikacja dostępu recipient

3. **Public link sharing**
   - Utworzenie public link przez owner
   - Dostęp anonymous przez link
   - Read-only mode dla anonymous

4. **Password reset flow**
   - Forgot password → email link → reset → login

5. **Note filtering & search**
   - Filtry: tag, date range, goal status
   - Client-side search
   - Pagination (desktop) vs infinite scroll (mobile)

6. **Account deletion wizard**
   - 3-step confirmation
   - Cascade delete wszystkich danych
   - Redirect do landing page

### 📱 **PRIORYTET 6 - Responsive & Accessibility**

| Obszar                 | Co Testować                                            |
| ---------------------- | ------------------------------------------------------ |
| **Mobile** (375×667)   | Drawer navigation, infinite scroll, touch gestures     |
| **Desktop** (1280×720) | Sidebar always visible, pagination controls            |
| **Accessibility**      | Lighthouse a11y ≥95%, keyboard navigation, ARIA labels |

---

## 3. Czego NIE Testujemy

❌ **React Components** (UI) - niski ROI, lepsze E2E
❌ Shadcn/ui komponenty - biblioteka zewnętrzna
❌ Testy penetracyjne - wymaga security audytu
❌ Load testing >10k użytkowników - wymaga staging env

---

## 4. Narzędzia Testowe

### 4.1 Stack

| Typ Testów        | Framework            | Instalacja                                   |
| ----------------- | -------------------- | -------------------------------------------- |
| **Unit**          | Vitest               | `npm i -D vitest @vitest/coverage-c8`        |
| **E2E**           | Playwright           | ✅ Już zainstalowany                         |
| **API Mocking**   | MSW                  | `npm i -D msw`                               |
| **Accessibility** | @axe-core/playwright | `npm i -D @axe-core/playwright`              |
| **Performance**   | Lighthouse CI        | `npm i -D @lhci/cli`                         |
| **Load Testing**  | k6                   | https://k6.io/docs/get-started/installation/ |

### 4.2 Konfiguracja

**vitest.config.ts**:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "c8",
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

**playwright.config.ts**:

```typescript
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "Mobile Chrome", use: devices["Pixel 5"] },
  ],
});
```

---

## 5. Kryteria Akceptacji

### 5.1 Coverage

| Kategoria    | Minimum | Cel     |
| ------------ | ------- | ------- |
| Utils        | 95%     | 100%    |
| Validators   | 90%     | 95%     |
| Middleware   | 85%     | 90%     |
| Services     | 75%     | 85%     |
| **GLOBALNY** | **80%** | **85%** |

### 5.2 Sukces Testów

**Unit Tests**:

- ✅ 0 failures
- ✅ Coverage ≥80%
- ✅ Execution time <2 min

**Integration Tests**:

- ✅ All API endpoints return expected status codes
- ✅ RLS blocks unauthorized access (0 bypasses)
- ✅ Execution time <5 min

**E2E Tests**:

- ✅ 6 critical flows pass on Chrome + Mobile Chrome
- ✅ Accessibility score ≥95%
- ✅ Execution time <10 min

**Performance**:

- ✅ Lighthouse: Performance ≥90, Accessibility ≥95
- ✅ API response: GET <500ms (p95), POST <1s (p95)
- ✅ AI generation: <60s (p99)

---

## 6. Security Checklist

| Test                                     | Expected                 |
| ---------------------------------------- | ------------------------ |
| Unauthorized API access                  | 401 response             |
| Access other user's notes                | 403 (RLS blocks)         |
| Expired JWT token                        | 401 response             |
| SQL injection (`'; DROP TABLE --`)       | Blocked, no 500 error    |
| XSS payload (`<script>alert()</script>`) | Sanitized                |
| Oversized payload (>5000 chars)          | 400 response             |
| Rate limit (101st request)               | 429 + Retry-After header |

---

## 7. CI/CD Pipeline

**GitHub Actions** - 3 jobs:

```yaml
jobs:
  unit-tests:
    - npm run test:unit
    - npm run test:coverage

  integration-tests:
    - supabase db reset
    - npm run test:integration

  e2e-tests:
    - npm run build
    - npx playwright test
    - Upload playwright-report
```

**Triggers**:

- Push to main/master
- Pull requests
- Manual dispatch

---

## 8. Struktura Katalogów

```
tests/
├── unit/
│   ├── lib/
│   │   ├── utils/
│   │   │   ├── pagination.test.ts
│   │   │   ├── pending-note.test.ts
│   │   │   └── token.test.ts
│   │   ├── validators/
│   │   │   ├── auth.test.ts
│   │   │   └── notes.schemas.test.ts
│   │   └── middleware/
│   │       ├── rate-limit.test.ts
│   │       └── auth.test.ts
│   └── services/
│       └── openrouter.errors.test.ts
├── integration/
│   ├── api/
│   │   ├── ai-generate.test.ts
│   │   ├── notes.test.ts
│   │   └── tags.test.ts
│   └── rls/
│       └── policies.test.ts
├── e2e/
│   ├── anonymous-flow.spec.ts
│   ├── note-creation.spec.ts
│   ├── public-link.spec.ts
│   ├── password-reset.spec.ts
│   ├── filtering.spec.ts
│   └── account-deletion.spec.ts
├── mocks/
│   └── handlers.ts  # MSW handlers
├── helpers/
│   ├── auth.ts
│   └── database.ts
└── setup.ts  # Global test setup
```

---

## 9. Metryki & KPI

### Śledzone metryki:

| Metryka             | Cel        | Jak mierzyć             |
| ------------------- | ---------- | ----------------------- |
| Test Pass Rate      | ≥98%       | (Passed / Total) × 100% |
| Code Coverage       | ≥80%       | Vitest report           |
| Flaky Test Rate     | <2%        | Failed intermittently   |
| Escaped Bugs        | <5/release | Prod bugs not caught    |
| Test Execution Time | <20 min    | CI/CD duration          |

---

## 10. Quick Start

```bash
# 1. Instalacja narzędzi testowych
npm install -D vitest @vitest/coverage-c8 msw @axe-core/playwright

# 2. Utwórz strukturę katalogów
mkdir -p tests/{unit,integration,e2e,mocks,helpers}

# 3. Konfiguracja (utwórz pliki vitest.config.ts i playwright.config.ts)

# 4. Pierwszy test - zacznij od utils
# tests/unit/lib/utils/pagination.test.ts

# 5. Uruchom testy
npm run test:unit
npm run test:e2e

# 6. Setup CI/CD
# .github/workflows/test.yml
```

### Sugerowana kolejność implementacji:

1. **Utils** → `pagination.utils.ts`, `pending-note.utils.ts`, `token.utils.ts`
2. **Validators** → `auth.validators.ts`, Zod schemas (notes, tags, AI)
3. **Middleware** → Rate limiting, Auth
4. **Integration** → API endpoints, RLS policies
5. **E2E** → 6 critical flows
6. **Performance** → Lighthouse, a11y

---

## 11. Ryzyka & Mitigacje

| Ryzyko                     | Prawdop. | Mitigacja                           |
| -------------------------- | -------- | ----------------------------------- |
| OpenRouter API niestabilne | Średnie  | Mock w testach, retry logic         |
| Flaky E2E tests            | Wysokie  | Explicit waits, retry on failure    |
| RLS bypasses               | Niskie   | Extensive RLS tests, security audit |
| Test maintenance overhead  | Wysokie  | Clear naming, documentation         |

---

## 12. Definicja Sukcesu

**Projekt jest gotowy do produkcji gdy**:

✅ Coverage ≥80% (utils 100%, validators 95%)
✅ 0 critical bugs w testach
✅ 6 E2E flows działają na Chrome + Mobile
✅ Lighthouse Performance ≥90, Accessibility ≥95
✅ RLS blokuje 100% unauthorized access
✅ Rate limiting działa (429 po 100 req/day)
✅ CI/CD pipeline green (<20 min execution)

---
