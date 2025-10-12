# 10xNotes 📝

A lightweight AI-powered meeting notes management application that helps you organize, summarize, and share meeting outcomes efficiently.

## 📖 Description

10xNotes solves the common problem of managing meeting notes across multiple sessions. It provides an AI-driven solution that automatically generates concise summaries, tracks goal completion status, and suggests labels for easy organization. The application serves as a single source of truth after meetings, making it easier to share outcomes and take action.

**Key Features:**

- 🤖 **AI-Powered Summaries**: Paste meeting notes (up to 5,000 characters) and get automatic summaries with goal status tracking
- 🚀 **No Registration Required**: Test the summarization feature without creating an account
- 🏷️ **Smart Labeling**: Automatic label suggestions with manual override capability
- 🔗 **Flexible Sharing**: Generate public read-only links or grant access to specific users by label
- 🌍 **Multi-Language Support**: Automatic handling of content in any language
- 🗂️ **Efficient Organization**: Filter and search notes by labels, date ranges, and goal status
- 🔒 **GDPR Compliant**: Minimal data collection (email only) with full user control

## 🛠️ Tech Stack

### 🎨 Frontend

- **Astro 5** - Modern web framework with server-side rendering (SSR)
- **React 19** - UI library for interactive components
- **TypeScript 5** - Type-safe JavaScript with strict mode
- **Tailwind CSS 4** - Utility-first CSS framework (via Vite plugin)
- **Shadcn/ui** - Component library built on Radix UI

### ⚙️ Backend

- **Supabase** - Complete backend solution providing:
  - PostgreSQL database
  - Backend-as-a-Service SDK
  - Built-in user authentication
  - Open-source and self-hostable

### 🧠 AI Integration

- **Openrouter.ai** - Access to multiple LLM providers (OpenAI, Anthropic, Google, etc.) with:
  - Cost-effective model selection
  - API key financial limits
  - High-quality summarization

### 🚀 DevOps & Hosting

- **GitHub Actions** (Planned) - CI/CD pipelines
- **Cloudflare** (Planned) - Application hosting
- **Current**: Node.js SSR adapter for flexible deployment

### 🔧 Development Tools

- **ESLint 9** - Code linting with TypeScript, React, and Astro support
- **Prettier** - Code formatting
- **Husky** - Git hooks management
- **lint-staged** - Pre-commit code quality checks

## 🚀 Getting Started Locally

### ✅ Prerequisites

- Node.js **v24.9.0** (as specified in `.nvmrc`)
- npm (comes with Node.js)
- Supabase account (for backend services)
- Openrouter.ai API key (for AI summarization)

### 📦 Installation

1. **Clone the repository:**

```bash
git clone <https://github.com/abialobrodzki/10x-notes.git>
cd 10x-notes
```

2. **Use the correct Node.js version:**

```bash
nvm use
```

3. **Install dependencies:**

```bash
npm install
```

4. **Set up environment variables:**

Create a `.env` file based on `.env.example` and configure:

- Supabase connection details
- Openrouter.ai API key
- Other required environment variables

5. **Start the development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 🏗️ Building for Production

```bash
npm run build
npm run preview
```

## 📜 Available Scripts

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start development server on port 3000         |
| `npm run build`        | Build for production                          |
| `npm run preview`      | Preview production build                      |
| `npm run lint`         | Run ESLint (max warnings: 0)                  |
| `npm run lint:fix`     | Fix ESLint issues automatically               |
| `npm run format`       | Format code with Prettier                     |
| `npm run format:check` | Check code formatting without modifying files |
| `npm run tsc:check`    | Run TypeScript type checking                  |

## 🎯 Project Scope

### ✅ Included in MVP

- ✅ Paste and summarize meeting notes (up to 5,000 characters)
- ✅ AI-generated summaries with goal status tracking
- ✅ Label-based organization system
- ✅ Public sharing with read-only links
- ✅ User-specific access control by labels
- ✅ Note editing and date management
- ✅ List view with filtering and search
- ✅ Multi-language content support
- ✅ GDPR-compliant data handling
- ✅ Account deletion with full data removal

### 🔮 Out of Scope (Post-MVP)

- 📋 Task lists with assignments and notifications
- 🔌 Third-party integrations (calendar, email clients)
- 🎤 Voice input or document imports (.docx, .pdf)
- 📤 Export to various formats (.pdf, .docx, .md)
- 🔍 Advanced search capabilities
- 📚 Version history
- 📱 Mobile applications
- 🌙 Dark mode

## 📊 Project Status

**Current Phase:** MVP Development

**Success Metrics:**

- Average >3 saved notes per day per active user
- Average summary generation time <30 seconds

**Key Components Status:**

- Core summarization engine: In development
- User authentication: In development
- Label management: In development
- Sharing functionality: In development
- Frontend UI: In development

## 📄 License

MIT

---

For detailed product requirements, see [PRD](.ai/prd.md)
For technical architecture details, see [Tech Stack](.ai/tech-stack.md)
For AI development guidelines, see [AGENTS.md](AGENTS.md)
