# API Reference

The backend is built using Next.js Route Handlers. Most endpoints are protected and require a valid session/JWT.

## Authentication
- `POST /api/auth/login`: Authenticate staff and set session.
- `POST /api/auth/logout`: Clear session.

## Menu (Manager)
- `GET/POST /api/manager/categories`: Manage categories.
- `GET/POST /api/manager/menu-items`: Manage menu items.
- `GET/POST /api/manager/variants`: Manage item variants.
- `GET/POST /api/manager/modifiers`: Manage modifier groups and options.

## Orders & Service
- `GET/POST /api/orders`: Core ordering logic.
- `PATCH /api/orders/[id]/status`: Update order or item status.
- `GET /api/kitchen/active-orders`: Specific view for kitchen staff.
- `GET /api/waiter/tables`: Status of all tables.

## Customer
- `GET /api/menu`: Fetch the public menu (optimized and sanitized).
- `GET /api/customer/order-status`: Check status of an active session order.

## Intelligence
- `POST /api/ai/concierge`: Direct interface to **Groq (Llama 3.3)** for the Master Waiter persona.
- `POST /api/ai/voice`: Converts text to neural audio using **ElevenLabs Turbo 2.5**.

## Manager Dashboards
- `GET /api/manager`: Synchronizes the Director Dashboard (Stats, Revenue, Audit Log).
- `GET/POST /api/manager/categories`: Manage categories.
- `GET/POST /api/manager/menu-items`: Manage menu items.

## Staff & System
- `GET/POST /api/staff`: User management (Admin only).
- `GET /api/tables`: Table configuration.
