# Contributing to KitchenAsty

Thank you for your interest in contributing to KitchenAsty! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Issues](#reporting-issues)
- [Community](#community)

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone git@github.com:YOUR_USERNAME/kitchenasty.git
   cd kitchenasty
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream git@github.com:mighty840/kitchenasty.git
   ```

## Development Setup

### Prerequisites

- Node.js 22+
- Docker (for PostgreSQL)
- npm 10+

### Install & Run

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker compose up -d

# Set up environment
cp packages/server/.env.example packages/server/.env

# Run database migrations and seed
npx -w packages/server prisma migrate dev --schema ../../prisma/schema.prisma
npx -w packages/server prisma db seed

# Start development servers
npm run dev:server      # API server → http://localhost:3000
npm run dev:admin       # Admin panel → http://localhost:5173
npm run dev:storefront  # Storefront  → http://localhost:5174
```

## Project Structure

```
kitchenasty/
├── packages/
│   ├── admin/        # React admin panel
│   ├── docs/         # VitePress documentation
│   ├── server/       # Express API server
│   ├── shared/       # Shared types and constants
│   └── storefront/   # React customer storefront
├── prisma/           # Database schema and seeds
├── e2e/              # Playwright E2E tests
└── .github/          # CI/CD workflows and templates
```

## Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes** — keep commits focused and atomic
3. **Write or update tests** for your changes
4. **Run the test suite** before committing (see [Testing](#testing))
5. **Push** to your fork and open a pull request

### Branch Naming

- `feature/` — new functionality
- `fix/` — bug fixes
- `docs/` — documentation changes
- `refactor/` — code restructuring without behavior changes

## Coding Standards

- **TypeScript** strict mode is enabled across the monorepo — no `any` types
- **Linting**: Run `npm run lint` and fix all errors before committing
- **Formatting**: Follow the existing code style in each package
- **Imports**: Use relative imports within a package, workspace imports across packages
- **Validation**: Use Zod schemas for all API input validation
- **Error handling**: Use the existing error middleware patterns in the server package

## Testing

We maintain a comprehensive test suite with 330+ tests:

```bash
# Run all unit and integration tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run E2E tests (requires dev servers running)
npm run test:e2e
```

- **Unit tests**: Located alongside source files or in `__tests__/` directories
- **Integration tests**: In `packages/server/src/__tests__/`
- **E2E tests**: In `e2e/admin/` and `e2e/storefront/`

All tests must pass before a pull request can be merged.

## Submitting a Pull Request

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. Push your branch and open a PR against `mighty840/kitchenasty:main`
3. Fill out the PR template with:
   - A clear description of **what** changed and **why**
   - Steps to test your changes
   - Screenshots for UI changes
4. Wait for CI checks to pass
5. A maintainer will review your PR — please be responsive to feedback

### PR Guidelines

- Keep PRs focused — one feature or fix per PR
- Update documentation if your change affects user-facing behavior
- Add tests for new functionality
- Don't include unrelated formatting or refactoring changes

## Reporting Issues

- **Bug reports**: Use the [bug report template](https://github.com/mighty840/kitchenasty/issues/new?template=bug_report.md)
- **Feature requests**: Use the [feature request template](https://github.com/mighty840/kitchenasty/issues/new?template=feature_request.md)
- **Security issues**: See [SECURITY.md](SECURITY.md) — do **not** open a public issue

## Community

- **GitHub Discussions**: Ask questions, share ideas, and connect with other users
- **Issues**: Report bugs and request features
- See [`PLAN.md`](PLAN.md) for the roadmap and areas where help is needed

### Good First Issues

Look for issues labeled [`good first issue`](https://github.com/mighty840/kitchenasty/labels/good%20first%20issue) — these are great starting points for new contributors.

---

Thank you for helping make KitchenAsty better!
