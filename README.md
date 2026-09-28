# Island Rave - Ticketing Platform

A full-stack, production-ready event ticketing platform built for Island Rave at La Plage.

## Features

- **Customer Flow**: Event browsing, ticket selection, secure checkout, payment processing.
- **Payment Integration**: Paystack integration (with a built-in Demo mode for local testing).
- **QR Code System**: Secure, unique QR ticket generation and server-side validation.
- **Concurrency Protection**: Transactional inventory reservation to prevent overselling.
- **Admin Dashboard Structure**: Built-in Role-Based Access Control (RBAC) and modular services for event/ticket management.
- **Security**: Idempotent webhooks, server-side price calculation, environment-based configuration.

## Technology Stack

- **Frontend**: Next.js 14+ (App Router), React, Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: JWT, bcryptjs, custom RBAC
- **Validations**: Zod

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Paystack Account (for production payments)

## Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd island-rave
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` and fill in the required values.
   ```bash
   cp .env.example .env
   ```

   **Important Environment Variables**:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `PAYMENT_MODE`: Set to `demo` for local testing without real money, or `live` for production.
   - `PAYSTACK_PUBLIC_KEY` & `PAYSTACK_SECRET_KEY`: Needed if using `live` mode.
   - `JWT_SECRET`: A secure random string for signing sessions.
   - `ADMIN_EMAIL` & `ADMIN_PASSWORD`: Used by the seed script to create the initial super-admin.

4. Database Setup:
   Push the schema to your database:
   ```bash
   npx prisma db push
   ```
   *(Or `npx prisma migrate dev` if you prefer migrations)*

5. Seed the Database:
   Populate the initial Island Rave event, Early-Bird ticket, and Admin user:
   ```bash
   npm run prisma db seed
   ```

## Development Commands

- `npm run dev`: Starts the development server at http://localhost:3000
- `npm run build`: Builds the application for production
- `npm start`: Starts the production server

## Testing the Purchase Flow (Demo Mode)

1. Ensure `PAYMENT_MODE=demo` in your `.env`.
2. Go to `http://localhost:3000`.
3. Click "Get Tickets Now" and select the Early-Bird ticket.
4. Fill in placeholder customer details and proceed.
5. You will be redirected to a Demo Payment page.
6. Click "Simulate SUCCESSFUL Payment".
7. The system will simulate a webhook, fulfill the order, and redirect you to the success page.

## Testing QR Check-in

1. After a successful purchase, tickets are generated in the database.
2. In a real scenario, the user gets an email with a QR code pointing to `/verify/[token]`.
3. For testing, you can find a `ticketToken` in your database `tickets` table.
4. Use a tool like Postman to make a `GET` request to `http://localhost:3000/api/tickets/verify/[token]` to see its status.
5. Make a `POST` request to the same URL to check the ticket in (marks it as `USED`).

## Admin Setup & Placeholders

The application is built with a flexible architecture so details can be updated later without code changes.

**Where to update missing info later:**
- **Database**: Use Prisma Studio (`npx prisma studio`) or build out the admin UI to edit the `Event` row (where `slug="island-rave"`). You can update the date, time, description, poster URL, and organizer details there.
- **Admin Login**: Log in at `/login` (once the UI is wired) using the credentials defined in `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Security Notes

- **Prices**: All ticket prices are calculated exclusively on the backend (`src/lib/services/order-service.ts`) using database values.
- **Secrets**: Do not commit your `.env` file. Webhook secrets and API keys are strictly server-side.
- **Overselling**: The `createOrder` service uses Prisma transactions and pessimistic reservation logic to guarantee ticket limits.

## Project Structure

- `/src/app`: Next.js App Router pages and API routes.
- `/src/lib/services`: Core business logic (orders, payments, emails).
- `/src/lib/validations.ts`: Zod schemas for strict input validation.
- `/src/lib/auth.ts`: Custom authentication and RBAC logic.
- `/prisma/schema.prisma`: Complete database normalization.
