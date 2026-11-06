# Atlas

Atlas is a real-time collaborative task board with version-checked concurrent edits and AI-assisted effort estimates.

Current status: Phase 1 (Scaffold, database, and health check).

## Stack and pinned versions

### Backend
- Java: 21 (LTS)
- Spring Boot: 3.4.3
- Apache Maven: 3.9.9 (via wrapper)
- PostgreSQL: 16 (postgres:16-alpine)
- Flyway: 10.20.1
- PostgreSQL JDBC Driver: 42.7.5
- Testcontainers: 1.20.4

### Frontend
- React: 18.3.1
- React DOM: 18.3.1
- TypeScript: 5.7.3 (strict mode)
- Vite: 6.2.0
- Tailwind CSS: 3.4.17
- Public Sans: 5.1.0 (@fontsource/public-sans)
- Vitest: 3.0.7
- Testing Library (React: 16.2.0, Jest DOM: 6.6.3, User Event: 14.6.1)
- ESLint: 9.21.0

## Prerequisites

- Java Development Kit (JDK) 21
- Node.js 20 or higher, with npm
- Docker and Docker Compose (for local database and integration tests)

## Starting the development database

To launch PostgreSQL 16 using Docker Compose:

```bash
docker compose up -d db
```

Default credentials match `.env.example`:
- Host: `localhost`
- Port: `5432`
- Database: `atlas`
- Username: `atlas`
- Password: `atlas`

## Backend

### Build and compile

From the `backend` directory:

```bash
# On Unix / macOS
./mvnw clean compile

# On Windows
.\mvnw.cmd clean compile
```

### Run tests

```bash
# On Unix / macOS
./mvnw test

# On Windows
.\mvnw.cmd test
```

Note: Integration tests use Testcontainers and require a running Docker daemon.

### Start the application

```bash
# On Unix / macOS
./mvnw spring-boot:run

# On Windows
.\mvnw.cmd spring-boot:run
```

The Actuator health check is available at:
`http://localhost:8080/actuator/health`

## Frontend

### Install dependencies

From the `frontend` directory:

```bash
npm install
```

### Code quality and tests

```bash
# Run linting
npm run lint

# Run unit tests
npm test

# Run production build and type checking
npm run build
```

### Start development server

```bash
npm run dev
```

The development server runs by default at `http://localhost:5173`.
