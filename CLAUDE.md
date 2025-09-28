# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

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
nvm use  # Uses Node.js v24.7.0 from .nvmrc
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## Code Architecture & Structure

### Tech Stack

- **Astro 5** - Modern web framework with server-side rendering
- **React 19** - UI library for interactive components
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **Shadcn/ui** - Component library built on Radix UI
- **Lucide React** - Icon library
- **Zod** - TypeScript-first schema validation (available via dependencies)

### Project Structure

```
src/
├── layouts/           # Astro layouts (Layout.astro)
├── pages/             # Astro pages (routes)
├── components/        # UI components
│   └── ui/           # Shadcn/ui components
├── lib/              # Utilities
│   └── utils.ts      # cn() utility for class merging
└── styles/           # Global CSS files
```

### Configuration Files

- `astro.config.mjs` - Astro configuration with Node adapter for SSR and Tailwind via Vite plugin
- `tsconfig.json` - TypeScript config with `@/*` path aliases
- `components.json` - Shadcn/ui configuration with New York style and Lucide icons
- `eslint.config.js` - ESLint configuration with TypeScript, React, and Astro support
- `.prettierrc.json` - Prettier formatting configuration

### Component Architecture

- **Astro Components (.astro)** - Use for static content, layouts, and pages
- **React Components (.tsx)** - Use only when interactivity is needed
- **UI Components** - Shadcn/ui components in `src/components/ui/`

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

- **Husky** - Git hooks management
- **ESLint** - Code linting with TypeScript, React, and Astro support
- **Prettier** - Code formatting with Astro plugin
- **lint-staged** - Run linters on staged files
- Pre-commit hooks automatically lint and format staged files
- Configuration in `package.json` lint-staged section