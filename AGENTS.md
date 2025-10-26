# AGENTS.md

This file provides guidance to AGENTS when working with code in this repository.
docs: https://agents.md

## Commonly Used Commands

### Development

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Use correct Node.js version
nvm use  # Uses Node.js v24.9.0 from .nvmrc
```

### Code Quality

```bash
# Run ESLint (max warnings: 0)
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting without modifying files
npm run format:check

# Run TypeScript type checking
npm run tsc:check
```

## Code Architecture & Structure

### Tech Stack

- **Astro 5** - Modern web framework with server-side rendering (SSR mode)
- **React 19** - UI library for interactive components
- **TypeScript 5** - Type-safe JavaScript with strict mode
- **Tailwind CSS 4** - Utility-first CSS framework (via Vite plugin)
- **Shadcn/ui** - Component library built on Radix UI (New York style)
- **Lucide React** - Icon library
- **class-variance-authority** - CVA for component variants
- **tw-animate-css** - Tailwind animation utilities
- **Zod** - TypeScript-first schema validation (available via Astro dependencies)

### Project Structure

```
src/
├── layouts/              # Astro layouts (Layout.astro)
├── pages/                # Astro pages (routes)
│   ├── index.astro      # Homepage
│   └── api/             # REST API endpoints (SSR)
│       ├── ai/          # AI generation endpoints
│       │   └── generate.ts
│       ├── notes/       # Notes CRUD endpoints
│       │   ├── index.ts
│       │   ├── [id].ts
│       │   └── [id]/
│       │       └── public-link/
│       │           ├── index.ts
│       │           └── rotate.ts
│       ├── tags/        # Tags CRUD endpoints
│       │   ├── index.ts
│       │   ├── [id].ts
│       │   └── [id]/
│       │       └── access/
│       │           ├── index.ts
│       │           └── [recipient_id].ts
│       ├── user/        # User management endpoints
│       │   ├── profile.ts
│       │   ├── stats.ts
│       │   └── account.ts
│       └── public/      # Public access endpoints (anonymous)
│           └── [token].ts
├── components/           # UI components
│   └── ui/              # Shadcn/ui components
├── lib/                 # Business logic & utilities
│   ├── services/        # Business logic layer
│   │   ├── openrouter.service.ts  # OpenRouter API communication (reusable)
│   │   ├── ai-generation.service.ts
│   │   ├── notes.service.ts
│   │   ├── tags.service.ts
│   │   ├── tag-access.service.ts
│   │   ├── public-links.service.ts
│   │   └── user.service.ts
│   ├── errors/          # Domain error classes
│   │   └── openrouter.errors.ts  # OpenRouter error hierarchy
│   ├── types/           # Type definitions
│   │   └── openrouter.types.ts   # OpenRouter contracts & schemas
│   ├── validators/      # Zod schemas for input validation
│   │   ├── ai.schemas.ts
│   │   ├── notes.schemas.ts
│   │   ├── tags.schemas.ts
│   │   ├── public-links.schemas.ts
│   │   ├── user.schemas.ts
│   │   └── shared.schemas.ts
│   ├── middleware/      # API middleware
│   │   ├── auth.middleware.ts
│   │   └── rate-limit.middleware.ts
│   └── utils/           # Helper functions
│       ├── pagination.utils.ts
│       └── token.utils.ts
├── middleware/          # Astro middleware
│   └── index.ts        # Supabase client injection
├── db/                  # Database layer
│   ├── database.types.ts   # Auto-generated Supabase types
│   └── supabase.client.ts  # Supabase client configuration
├── types.ts             # Shared TypeScript types & DTOs
└── styles/              # Global CSS files

supabase/
└── migrations/          # SQL migration files
    ├── 20251015211900_create_10xnotes_schema.sql
    ├── 20251015234737_optimize_rls_policies_performance.sql
    ├── 20251021000000_add_get_tag_access_list_function.sql
    ├── 20251021000001_add_grant_tag_access_function.sql
    ├── 20251021120000_allow_anon_insert_llm_generations.sql
    ├── 20251021120100_allow_anon_read_public_notes.sql
    ├── 20251021120200_create_delete_user_account_function.sql
    └── 20251021120300_fix_function_search_path_security.sql
```

### Configuration Files

- `astro.config.mjs` - Astro configuration with:
  - Node adapter in standalone mode for SSR
  - React integration for interactive components
  - Sitemap generation (`@astrojs/sitemap`)
  - Tailwind CSS 4 via Vite plugin
  - Development server on port 3000
- `tsconfig.json` - TypeScript config extending Astro strict presets with `@/*` path aliases
- `components.json` - Shadcn/ui configuration with New York style, Lucide icons, and path aliases
- `eslint.config.js` - ESLint 9 flat config with TypeScript, React (including React Compiler plugin), and Astro support
- `.prettierrc.json` - Prettier formatting configuration with Astro plugin support
- `package.json` - Scripts and dependencies with lint-staged configuration
- `.nvmrc` - Node.js version specification (v24.9.0)

### Component Architecture

- **Astro Components (.astro)** - Use for static content, layouts, and pages
- **React Components (.tsx)** - Use only when interactivity is needed
- **UI Components** - Shadcn/ui components in `src/components/ui/`

### Backend Architecture

**Tech Stack - Backend:**

- **Supabase** - PostgreSQL database with Row Level Security (RLS)
- **Supabase Auth** - JWT-based authentication
- **Zod** - Runtime input validation and type safety
- **OpenRouter** - AI model API for text generation

**Database Schema:**

- Tables: `tags`, `notes`, `tag_access`, `public_links`, `llm_generations`
- Views: `user_generation_stats` (aggregated AI usage)
- Functions (SECURITY DEFINER): `get_tag_access_list()`, `grant_tag_access()`, `delete_user_account()`

**API Request Flow:**

```
HTTP Request
  → Astro Middleware (inject Supabase client)
  → API Route (src/pages/api/)
  → Auth Middleware (requireAuth/optionalAuth)
  → Input Validation (Zod schemas)
  → Service Layer (business logic)
  → Database (Supabase with RLS)
  → Response (DTO format)
```

**Security Model:**

- **RLS (Row Level Security)** - All tables enforce owner/recipient access control at database level
- **JWT Authentication** - Bearer tokens via Supabase Auth (validated in `requireAuth` middleware)
- **Rate Limiting** - In-memory limits for AI generation (100 req/day per IP); production should use Redis
- **SECURITY DEFINER Functions** - Elevated privileges with explicit `search_path = ''` to prevent SQL injection

**OpenRouter Service (AI Generation):**

`OpenRouterService` provides secure, type-safe communication with OpenRouter API for LLM generation:

- **Architecture:** Abstraction layer over HTTP with timeout/retry/parsing logic
- **Default Model:** `openai/gpt-5-nano` (configurable per request)
- **Multi-Language:** Automatic language detection - summaries generated in the same language as input
- **Type Safety:** Generic types with JSON Schema validation for structured outputs
- **Reliability:** Automatic retry with exponential backoff for transient failures
- **Telemetry:** Fire-and-forget logging to `llm_generations` table (non-blocking)
- **Error Handling:** Hierarchical error types (`OpenRouterValidationError`, `OpenRouterTimeoutError`, etc.)
- **Configuration:** Timeout 30s, 2 retry attempts, app identification headers

**Usage Example:**

```typescript
const service = new OpenRouterService(supabase, {
  defaultModel: "openai/gpt-5-nano",
  timeoutMs: 30000,
  retryAttempts: 2,
});

const response = await service.generate<MyType>({
  systemMessage: "You are a helpful assistant",
  userMessage: "Analyze this data...",
  responseSchema: MY_JSON_SCHEMA,
  parameters: { temperature: 0.3 },
});
```

**For detailed implementation guidelines, see:** `.cursor/rules/backend.mdc` and `.cursor/rules/db-supabase-migrations.mdc`

## Development Guidelines & Conventions

### Component Usage Patterns

- Use Astro components for static content and layouts
- Implement React components only when client-side interactivity is required
- Never use "use client" directives (this is Next.js specific, not needed in Astro)
- Extract reusable logic into custom hooks when needed

### API Routes & Server Endpoints

- Place API routes in `src/pages/api/` (directory will be created when needed)
- Use uppercase HTTP method names: `export async function GET()`, `export async function POST()`
- Add `export const prerender = false` for dynamic API routes
- Zod is available for input validation (already included via Astro dependencies)
- Extract business logic into services in `src/lib/`

### Styling Guidelines

- Use Tailwind CSS utility classes for styling
- Use the `cn()` utility from `src/lib/utils.ts` for conditional classes
- Implement responsive design with Tailwind breakpoints (sm:, md:, lg:)
- Use Tailwind's dark mode with `dark:` variant
- Leverage arbitrary values with square brackets for precise styling

### TypeScript Conventions

- Use TypeScript strict mode (configured in tsconfig.json)
- Define shared types in dedicated type files when needed
- Use path aliases with `@/*` for imports from src directory
- Implement proper error handling with early returns

### File Organization

- Follow the established directory structure
- Use kebab-case for file names
- Place middleware in `src/middleware/` (directory will be created when needed)
- Environment variables template available in `.env.example`
- Project documentation in `README.md`

#### Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase Configuration
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx  # Anon key (public)

# AI Configuration
OPENROUTER_API_KEY=xxx  # For AI text generation
```

- Environment variables are validated at startup (see `src/db/supabase.client.ts`)
- Missing variables throw clear error messages
- Note: `SUPABASE_SERVICE_ROLE_KEY` is NOT used (removed in refactoring for security)

### Error Handling Patterns

- Handle errors and edge cases at the beginning of functions
- Use early returns for error conditions
- Place the happy path last in functions
- Implement proper error logging and user-friendly error messages

### Accessibility Requirements

- Use ARIA landmarks for page regions
- Apply appropriate ARIA roles to custom elements
- Set aria-expanded and aria-controls for expandable content
- Use aria-live regions for dynamic content updates
- Implement proper focus management

### Development Tools & Git Hooks

- **Husky 9** - Git hooks management (configured in `.husky/` directory)
- **ESLint 9** - Code linting with flat config system supporting:
  - TypeScript (`@typescript-eslint`)
  - React 19 with Hooks rules
  - React Compiler plugin
  - Astro components
  - JSX accessibility (`jsx-a11y`)
  - Import/export validation
  - Prettier integration
- **Prettier** - Code formatting with Astro plugin support
- **lint-staged 16** - Runs linters on staged files before commit
  - Auto-formats and lints `.ts`, `.tsx`, `.astro` files
  - Auto-formats `.js`, `.json`, `.css`, `.md` files
- Pre-commit hooks automatically lint and format staged files
- Configuration in `package.json` lint-staged section and `.husky/pre-commit`

## AI Context Management

This project uses **unified AI context management with symbolic links**:

- **`AGENTS.md`** - Single source of truth for AI agent instructions (this file)
- **Symlinks** - `CLAUDE.md`, `GEMINI.md`, `CURSOR.md`, `CLINE.md`, `COPILOT.md`, `AGENT.md`, `WARP.md` all point to `AGENTS.md`
- **Tool-specific directories** - `.cursor/rules`, `.clinerules/rules`, `.roorules/rules` contain symlinks to `AGENTS.md`
- **Benefits**: Edit once in `AGENTS.md`, changes apply to all AI tools automatically
- **See**: `AI_CONTEXT.md` for full documentation on the symlink system

### Advanced Context-Specific Rules

This project contains detailed, context-specific guidelines in `.cursor/rules/*.mdc` files.

**IMPORTANT for AI Agents**: When working with specific technologies or tasks, **READ the relevant file first** using the Read tool before making changes:

#### When to Read Additional Rules:

- **Working with Astro components (\*.astro)** → Read `.cursor/rules/astro.mdc`
- **Working with React components (\*.tsx)** → Read `.cursor/rules/react.mdc`
- **Frontend/UI work (styling, components)** → Read `.cursor/rules/frontend.mdc`
- **Backend/API/Database work** → Read `.cursor/rules/backend.mdc`
- **Setting up Supabase integration** → Read `.cursor/rules/api-supabase-astro-init.mdc`
- **Creating database migrations** → Read `.cursor/rules/db-supabase-migrations.mdc`
- **Using/installing Shadcn/ui components** → Read `.cursor/rules/ui-shadcn-helper.mdc`
- **Project structure questions** → Read `.cursor/rules/shared.mdc`

These files contain detailed best practices, patterns, and implementation guidelines that supplement this file.

### Additional Project Files

- `.ai/` - Directory for AI-related project documentation (e.g., PRD documents)
- `.env.example` - Environment variables template
- `README.md` - Project documentation and setup instructions
- `AI_CONTEXT.md` - Documentation for AI context management system
- `.vscode/` - VS Code workspace settings, recommended extensions, and debug configurations
- `.gitignore` - Git ignore rules including AI context symlinks and build artifacts
