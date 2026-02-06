# Database Schema

HotelPro uses a relational PostgreSQL database managed via Prisma. The schema is designed to support complex ordering workflows and role-based staff management.

## Core Models

### 1. User & Authentication
- **User**: Stores staff details, hashed passwords, and assigned roles (`ADMIN`, `MANAGER`, `WAITER`, etc.).
- **Session**: Manages user login sessions.
- **AuditLog**: Tracks critical actions performed by staff for accountability.

### 2. Menu Management
- **Category**: Groups menu items (e.g., Appetizers, Main Course).
- **MenuItem**: The actual food/drink items. Supports images and availability status.
- **MenuItemVariant**: Sizes or variations of an item (e.g., Small, Large).
- **ModifierGroup**: Groups of extras (e.g., "Choice of Sauces", "Extra Toppings").
- **ModifierOption**: Specific extras within a group with optional pricing.

### 3. Service & Ordering
- **Table**: Represents physical tables in the restaurant with status tracking (`VACANT`, `ACTIVE`, etc.).
- **Order**: The main order entity tied to a table or session.
- **OrderItem**: Individual items within an order, capturing the price at the time of order and any selected variants/modifiers.

### 4. Operations
- **Inventory**: Simple quantity tracking for menu items.
- **Payment**: Tracks billing amounts and payment methods (`CASH`, `CARD`, `UPI`).

## Enums
The schema utilizes PostgreSQL Enums for strict type safety:
- `UserRole`: ADMIN, MANAGER, WAITER, KITCHEN, CASHIER.
- `TableStatus`: VACANT, ACTIVE, READY, WAITING_FOR_PAYMENT, DIRTY.
- `OrderStatus`: NEW, PREPARING, READY, SERVED, BILL_REQUESTED, CLOSED, CANCELLED.
- `OrderItemStatus`: PENDING, PREPARING, READY, SERVED, CANCELLED.
- `PaymentMethod`: CASH, CARD, UPI.

## Key Relationships
- **Order -> Table**: Many-to-one (A table can have many orders over time, but one active one).
- **OrderItem -> MenuItem**: Many-to-one.
- **MenuItem -> Category**: Many-to-one.
- **MenuItem <-> ModifierGroup**: Many-to-many (via `MenuItemModifierGroup`).
