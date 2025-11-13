# Project Onboarding: 10xNotes

## Welcome

Welcome to the 10xNotes project! A lightweight AI-powered meeting notes management application that helps you organize, summarize, and share meeting outcomes efficiently.

## Project Overview & Structure

The core functionality revolves around AI-driven meeting note summarization, smart labeling, and flexible sharing options. The project is a single application with the following key components/modules:

## Core Modules

### `src`

- **Role:** This directory contains all the source code for the application, including frontend components, backend services, and business logic. It's the heart of the application, where all the user-facing features are implemented.
- **Key Files/Areas:**
  - `components`: Contains all the React components used in the application. The authentication forms (`RegisterForm.tsx`, `LoginForm.tsx`) and the account deletion wizard (`settings/DeleteAccountWizard.tsx`) are particularly active.
  - `lib/services`: Houses the business logic for interacting with backend services like OpenRouter for AI generation (`openrouter.service.ts`) and Supabase for notes management (`notes.service.ts`).
  - `pages`: Defines the application's routes using Astro.
  - `middleware`: Contains the main middleware for the application, which handles authentication and authorization.
- **Recent Focus:** Recent development has been focused on modernizing the authentication system with `react-hook-form` and TanStack Query, improving the user experience of the account deletion wizard, and adapting the application for Cloudflare compatibility.
- **Module Relationships:** Tightly coupled with the `tests` module. Interacts directly with the `supabase` module for data persistence and authentication.

### `tests`

- **Role:** This directory contains all the tests for the application, including unit and end-to-end tests, ensuring the quality and correctness of the code.
- **Key Files/Areas:**
  - `e2e`: Contains end-to-end tests written with Playwright.
  - `unit`: Contains unit tests written with Vitest.
- **Recent Focus:** The testing suite is comprehensive, with a focus on maintaining high coverage for new and existing features. Recent work has focused on stabilizing the authentication flow tests and adapting the tests for Cloudflare compatibility.
- **Module Relationships:** Tightly coupled with the `src` module.

### `supabase`

- **Role:** This directory contains database migrations and configuration for the Supabase backend. It's responsible for the application's data persistence and authentication.
- **Recent Focus:** The database schema and policies are actively being developed to support the application's features. Recent work has focused on improving the security and efficiency of the database with RLS policies and index cleanup, as well as adding custom email templates and new RPC functions for managing tag access.
- **Module Relationships:** Interacts directly with the `src` module's services.

### `.ai`

- **Role:** This directory contains AI-related project documentation, including planning documents and implementation details.
- **Recent Focus:** This directory is actively used for documenting the AI-related features and architecture of the project. Recent additions include a hosting analysis, mobile navigation documentation, and a test plan.
- **Module Relationships:** Provides the documentation and planning for features implemented in the other modules.

### Configuration Files (`package.json`, `astro.config.mjs`, `.vscode/settings.json`)

- **Role:** These files are critical for the project's build process, development environment, and overall structure.
- **Recent Focus:** `package.json` and `package-lock.json` show frequent updates to dependencies and scripts, indicating an actively maintained project. `astro.config.mjs` has been recently modified to support Cloudflare deployment. `.vscode/settings.json` has been updated to improve the developer experience.
- **Key Architectural Insights:** The project is configured for deployment on Cloudflare Pages, indicating a move towards a serverless architecture. The use of a shared editor configuration file promotes a consistent coding style.

### Documentation (`AGENTS.md`, `README.md`)

- **Role:** These files provide comprehensive documentation for the project, including instructions for developers and AI agents.
- **Recent Focus:** `AGENTS.md` is actively updated to document new features, development workflows, and architectural decisions. `README.md` provides a high-level overview of the project and its features.
- **Key Architectural Insights:** The project has a strong emphasis on documentation, with a central guide for both human and AI developers.

## Key Contributors

- **adrianbialobrodzki:** Main contributor across the entire project.
  - **Areas of Expertise:** Frontend development (React, Astro, Tailwind CSS), backend development (Supabase, Node.js), and AI integration (OpenRouter).
  - **Recent Activity:** Most active in the `src`, `tests`, and `supabase` modules, with a focus on Cloudflare compatibility, authentication, and database performance.
- **Adrian Białobrodzki:** Minor contributions.

## Overall Takeaways & Recent Focus

1.  **Shift to Serverless:** The most significant recent change is the move towards a serverless architecture with Cloudflare Pages. This is evident from the changes in `astro.config.mjs`, `src/middleware/index.ts`, and the testing suite.
2.  **Modernized Authentication:** The authentication system has been modernized with the adoption of `react-hook-form` and TanStack Query, improving its performance and maintainability.
3.  **Enhanced Security:** There is a strong focus on security, with the implementation of RLS policies in Supabase, a secure account deletion wizard, and comprehensive testing of the authentication flows.
4.  **Improved Developer Experience:** The project has a strong emphasis on developer experience, with comprehensive documentation, a shared editor configuration, and a robust testing suite.
5.  **AI-Powered Features:** The project continues to focus on AI-powered features, with the `OpenRouterService` being a key component of the architecture.

## Potential Complexity/Areas to Note

- **Cloudflare Integration:** The recent move to Cloudflare introduces a new layer of complexity. The `astro.config.mjs` and `src/middleware/index.ts` files are critical for this integration and have a high change rate.
- **Authentication System:** The authentication system is a complex and critical part of the application. The `src/components/RegisterForm.tsx`, `src/components/LoginForm.tsx`, and `src/components/settings/DeleteAccountWizard.tsx` files are frequently modified and require careful attention.
- **Database and Backend Interaction:** The interaction between the `src` and `supabase` modules is a potential source of complexity. The RLS policies in the `supabase` directory and the service logic in `src/lib/services` require a good understanding of both the frontend and backend.
- **Discrepancy in Documentation:** The original onboarding document does not fully reflect the recent shift to a serverless architecture with Cloudflare. The documentation should be updated to reflect this change.

## Questions for the Team

1.  What is the long-term strategy for the Cloudflare integration? Are there plans to use other Cloudflare services, such as Workers or KV storage?
2.  Now that the authentication system has been modernized, what are the next priorities for improving the user experience?
3.  The `AGENTS.md` file is very comprehensive. How is it kept up-to-date with the rapid pace of development?
4.  Are there any plans to create a more formal design system document to complement the `src/styles/global.css` file?
5.  What is the process for proposing and implementing changes to the database schema in the `supabase` module?

## Next Steps

1.  **Review the Cloudflare Integration:** Start by reviewing the `astro.config.mjs` file and the `src/middleware/index.ts` file to understand how the application is deployed and authenticated in a serverless environment.
2.  **Explore the Authentication Components:** Familiarize yourself with the new authentication system by reviewing the `src/components/RegisterForm.tsx`, `src/components/LoginForm.tsx`, and the `useRegisterMutation` and `useLoginMutation` hooks.
3.  **Understand the Database Interaction:** Trace the data flow from a frontend component to the Supabase backend by reviewing a service in `src/lib/services` and the corresponding RLS policies in the `supabase` directory.
4.  **Run the Test Suite:** Execute `npm run test:unit` and `npm run test:e2e` to ensure everything is working correctly and to get a better understanding of the application's behavior.
5.  **Suggest Documentation Improvements:** Propose an update to the onboarding document to include a section on the Cloudflare deployment process and the new authentication system.

## Development Environment Setup

1.  **Prerequisites:** Node.js v24.9.0, npm, Supabase account, OpenRouter API key.
2.  **Dependency Installation:** `npm install`
3.  **Building the Project (if applicable):** `npm run build`
4.  **Running the Application/Service:** `npm run dev`
5.  **Running Tests:** `npm run test:unit` (Unit), `npm run test:e2e` (E2E)
6.  **Common Issues:** Common issues section not found in checked files

## Helpful Resources

- **Documentation:** [openrouter.ai](https://openrouter.ai)
- **Issue Tracker:** GitHub Issues
- **Contribution Guide:** Contribution guide not found in checked files.
- **Communication Channels:** Communication channels not found in checked files.
- **Learning Resources:** Specific learning resources section not found in checked files.
