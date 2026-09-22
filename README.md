# Warehouse Management

A warehouse inventory management application built with Next.js, PostgreSQL, Drizzle ORM, and pnpm.

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer
- Docker with Docker Compose

## Getting Started

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd warehouse-management
pnpm install --frozen-lockfile
```

Start the PostgreSQL database:

```bash
docker compose up -d db
```

Create a `.env.local` file in the project root:

```env
DATABASE_URL=postgresql://warehouse:warehouse@localhost:5434/warehouse
```

Apply the database migrations:

```bash
pnpm migrate
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Create an account from the registration page, then sign in.

## Available Commands

```bash
pnpm dev          # Start the development server
pnpm build        # Create a production build
pnpm start        # Start the production server
pnpm typecheck    # Run the TypeScript compiler
pnpm lint         # Run ESLint
pnpm test         # Run the test suite
pnpm migrate      # Apply pending Drizzle migrations
pnpm generate     # Generate a new Drizzle migration
pnpm studio       # Open Drizzle Studio
```

## Production

Build and start the application with:

```bash
pnpm install --frozen-lockfile
pnpm migrate
pnpm build
pnpm start
```

The production server uses `http://localhost:3000` by default.

## Database

The Docker Compose PostgreSQL service uses:

- Database: `warehouse`
- User: `warehouse`
- Password: `warehouse`
- Host port: `5434`

Stop the database container with:

```bash
docker compose down
```

The `.env.local` file is ignored by Git and must be created separately on each development machine.
