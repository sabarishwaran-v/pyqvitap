# Contributing to PyqVitAp

Thank you for your interest in contributing to **PyqVitAp**! This document provides basic guidelines for contributing to the website source code.

---

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/papersvitap.git
   cd papersvitap
   ```
3. **Install dependencies** (the project uses `pnpm`):
   ```bash
   pnpm install
   ```
4. **Set up your environment variables**:
   ```bash
   cp .env.example .env
   ```
   Populate your `.env` with your development database and credentials.

5. **Start the local development server**:
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Contribution Rules & Code Hygiene

- **Never commit secrets:** Double-check that `.env`, connection strings, API tokens, and private keys are never staged or committed.
- **Do not commit PDFs or datasets:** The repository contains website source code only. Do not commit question paper PDFs, scraping archives, or database dumps.
- **Keep changes focused:** Small, well-scoped pull requests are much easier to review and merge than massive multi-feature PRs.
- **Type safety:** Always verify that TypeScript compiles with zero errors before submitting:
   ```bash
   npx tsc --noEmit
   ```
- **Build check:** Ensure the application builds cleanly:
   ```bash
   SKIP_ENV_VALIDATION=1 pnpm run build
   ```

---

## Submitting a Pull Request

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat: add slot filter badge component"
   ```
3. Push the branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a **Pull Request** targeting the `staging` branch (or `prod` if specified).
5. In your PR description, explain:
   - What problem your change solves.
   - Any UI adjustments (include before/after screenshots if applicable).
   - How you verified the change locally.
