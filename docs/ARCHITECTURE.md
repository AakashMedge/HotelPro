# System Architecture

HotelPro is built as a full-stack web application using the modern Next.js ecosystem.

## Technology Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (React 19, App Router)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Components**: Custom-built premium UI components.

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **API**: Next.js Route Handlers (Serverless-ready)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Security**: [Arcjet](https://arcjet.com/) (Shield, Bot protection, Rate limiting)
- **Authentication**: JWT-based (using `bcryptjs` and `jose`).

### Database
- **Provider**: PostgreSQL (hosted on [Neon](https://neon.tech/))
- **Adapter**: `@prisma/adapter-neon`

### AI & Intelligence
- **Large Language Model**: **Groq (Llama 3.3-70B)** for low-latency reasoning.
- **Voice Synthesis**: **ElevenLabs (Turbo 2.5)** for real-time neural audio.
- **Integration**: Direct fetch communication with Groq and ElevenLabs for maximum speed.

## Project Structure

```text
hotelpro/
├── src/app/              # Next.js App Router (Pages & API)
│   ├── (auth)/           # Authentication routes
│   ├── (dashboard)/      # Protected staff dashboards
│   │   ├── admin/        # Admin-only interfaces
│   │   ├── manager/      # Management/Configuration pages
│   │   ├── waiter/       # Ordering & Table management
│   │   ├── kitchen/      # KOT (Kitchen Order Ticket) management
│   │   └── cashier/      # Billing & Payments
│   ├── (public)/         # Customer menu & Landing pages
│   └── api/              # Backend API endpoints
├── components/           # Reusable React components
│   ├── public/           # Components for the customer-facing side
│   ├── dashboard/        # Staff dashboard UI elements
│   └── ui/               # Base UI primitives
├── prisma/               # Database schema and migrations
├── lib/                  # Utility functions, constants, and shared logic
├── features/             # Business logic modules
├── styles/               # Global CSS and Tailwind configurations
└── docs/                 # Project documentation
```

## Key Architectural Patterns
- **Role-Based Redirection**: Middleware or layout-level checks to ensure users land on the correct dashboard.
- **Optimistic Updates**: Using React state to provide instant feedback for order status changes.
- **Zustand/Context**: For managing global state like the shopping cart or active session.
