# KitchenAsty - TastyIgniter Clone

## Overview

KitchenAsty is a self-hosted restaurant online ordering, table reservation, and management system. It enables restaurants, cafes, and takeaways to accept online orders for delivery and pickup, manage menus, handle table reservations, and run their operations from a single admin panel.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js |
| **Frontend (Admin)** | React 18 + Vite |
| **Frontend (Storefront)** | React 18 + Vite (separate app) |
| **Database** | PostgreSQL 15+ |
| **ORM** | Prisma |
| **Auth** | JWT (jsonwebtoken) + bcrypt |
| **Payments** | Stripe SDK |
| **File Uploads** | Multer + local storage |
| **Email** | Nodemailer |
| **Real-time** | Socket.IO |
| **Validation** | Zod |
| **Testing** | Vitest + Supertest |
| **CSS** | Tailwind CSS |

## Monorepo Structure

```
kitchenasty/
├── packages/
│   ├── server/          # Express API server
│   ├── admin/           # React admin panel
│   ├── storefront/      # React customer-facing app
│   └── shared/          # Shared types, utils, constants
├── prisma/
│   └── schema.prisma    # Database schema
├── package.json         # Root workspace config
└── PLAN.md
```

---

## Feature Branches & Implementation Plan

### Phase 1: Foundation

#### Branch: `feature/project-setup`
- Initialize npm workspaces monorepo
- Configure TypeScript across all packages
- Set up ESLint + Prettier
- Configure Vite for admin and storefront
- Set up Express server skeleton
- Add environment config (.env handling)
- Docker Compose for PostgreSQL (dev)

#### Branch: `feature/database-schema`
- Prisma schema with all core models:
  - **User** (admin/staff) - email, password, role, permissions
  - **Customer** - name, email, phone, addresses, password
  - **Location** - name, address, phone, hours, settings
  - **Category** - name, description, image, parent_id, sort_order
  - **MenuItem** - name, description, price, image, stock, location
  - **MenuOption** - name, display_type (select/radio/checkbox/quantity)
  - **MenuOptionValue** - option_id, name, price_modifier
  - **Mealtime** - name, start_time, end_time, days, location_id
  - **Order** - customer, location, type (delivery/pickup), status, totals
  - **OrderItem** - order_id, menu_item_id, quantity, price, options
  - **Reservation** - customer, location, table, date, time, party_size, status
  - **Table** - location_id, name, capacity, status
  - **Coupon** - code, type (percent/fixed), value, min_order, usage_limit, dates
  - **Review** - customer, location, order, rating, comment
  - **DeliveryZone** - location_id, name, boundaries, charge, min_order
  - **Payment** - order_id, method, amount, status, transaction_id
  - **Address** - customer_id, line1, line2, city, state, zip, is_default
- Seed script with sample data

#### Branch: `feature/auth`
- Staff/admin JWT authentication (login, logout, refresh)
- Customer registration and login
- Password hashing with bcrypt
- Role-based access control middleware (super_admin, manager, staff)
- Permission guard middleware
- Guest checkout token generation

### Phase 2: Core Restaurant Management (Admin)

#### Branch: `feature/location-management`
- CRUD API for locations
- Location settings (hours, order types, delivery/pickup config)
- Delivery zone CRUD with charge and min-order settings
- Admin UI: location list, create/edit forms, delivery zone editor

#### Branch: `feature/menu-management`
- CRUD API for categories (with nesting)
- CRUD API for menu items
- Menu options and option values CRUD
- Mealtime CRUD and assignment to items
- Image upload for items and categories
- Stock tracking (in-stock/out-of-stock toggle, quantity)
- Admin UI: category tree, menu item list/grid, item editor with option builder

#### Branch: `feature/table-management`
- CRUD API for tables per location
- Table status tracking (available, occupied, reserved)
- Admin UI: table list and floor plan view

### Phase 3: Customer Ordering (Storefront)

#### Branch: `feature/storefront-layout`
- Storefront app shell (header, footer, navigation)
- Location selector page (for multi-location)
- Responsive layout with Tailwind
- Customer auth pages (register, login, account)

#### Branch: `feature/menu-display`
- Menu browsing page with category sidebar/tabs
- Menu item cards with images, prices, descriptions
- Item detail modal with options selection
- Mealtime filtering (show only available items)
- Search and filtering

#### Branch: `feature/cart-checkout`
- Shopping cart (add, update, remove, clear)
- Cart drawer/sidebar with item list and totals
- Checkout page with delivery/pickup selection
- Address entry for delivery orders
- Time slot selection (ASAP or scheduled)
- Order notes/special instructions
- Coupon code entry and validation
- Order summary with subtotal, tax, delivery fee, discounts, total
- Guest checkout support

#### Branch: `feature/payment-integration`
- Stripe payment integration
- Cash on delivery option
- Payment processing during checkout
- Payment status tracking
- Stripe webhook handling for async events

#### Branch: `feature/order-tracking`
- Order confirmation page
- Order status page with real-time updates (Socket.IO)
- Order history in customer account
- Email notifications (order placed, status changes)

### Phase 4: Order & Reservation Management (Admin)

#### Branch: `feature/order-management`
- Order list with filters (status, date, location, type)
- Order detail view
- Status workflow (pending → confirmed → preparing → ready → out_for_delivery → delivered/picked_up)
- Order status update with Socket.IO broadcast
- Kitchen display view (orders queue for kitchen staff)
- Order assignment to staff
- Print order receipts

#### Branch: `feature/reservation-management`
- Reservation list with calendar view
- Reservation creation (admin-side and customer-side)
- Status workflow (pending → confirmed → seated → completed / cancelled)
- Table assignment
- Time slot availability checking
- Email/SMS notifications for reservations

### Phase 5: Marketing & Analytics

#### Branch: `feature/coupons-discounts`
- Coupon CRUD with validation rules
- Coupon types: percentage, fixed amount, free delivery
- Usage limits (per coupon, per customer)
- Date range restrictions
- Minimum order amount requirements
- Auto-apply and code-entry modes

#### Branch: `feature/reviews`
- Customer review submission (post-order)
- Star rating + text comment
- Admin review moderation (approve, reject)
- Display reviews on storefront
- Average rating per menu item and location

#### Branch: `feature/dashboard-reports`
- Admin dashboard with key metrics
- Today's orders, revenue, popular items
- Sales reports (daily, weekly, monthly)
- Order volume charts
- Top selling items report
- Customer analytics (new vs returning)

### Phase 6: Advanced Features

#### Branch: `feature/notifications`
- Email templates for all order/reservation events
- Real-time browser notifications (Socket.IO)
- Notification preferences (admin settings)

#### Branch: `feature/multi-language`
- i18n setup for admin and storefront
- Language switcher
- Translatable content (menu items, categories)

#### Branch: `feature/api`
- Public REST API with token auth
- API endpoints for: menus, categories, locations, orders, customers, reservations
- API documentation (Swagger/OpenAPI)
- Rate limiting

---

## Database Entity Relationship Summary

```
Location 1──∞ Category 1──∞ MenuItem 1──∞ MenuOption 1──∞ MenuOptionValue
Location 1──∞ Table
Location 1──∞ DeliveryZone
Location 1──∞ Mealtime
Customer 1──∞ Order 1──∞ OrderItem
Customer 1──∞ Reservation
Customer 1──∞ Address
Customer 1──∞ Review
Order 1──∞ Payment
Order 1──1 Coupon (optional)
Reservation ∞──1 Table
MenuItem ∞──∞ Mealtime
User (Staff) ∞──1 Role
```

---

## Priority Order

1. **Project Setup** - get the monorepo running
2. **Database Schema** - define all models
3. **Auth** - secure the API
4. **Menu Management** - the core of any restaurant system
5. **Location Management** - multi-location support
6. **Storefront Layout** - customer-facing shell
7. **Menu Display** - customers browse the menu
8. **Cart & Checkout** - customers place orders
9. **Payment** - accept payments
10. **Order Management** - admin handles orders
11. **Order Tracking** - customers track orders
12. **Reservations** - table booking
13. **Table Management** - manage tables
14. **Coupons** - marketing
15. **Reviews** - social proof
16. **Dashboard** - analytics
17. **Notifications** - communication
18. **API** - external integrations
19. **Multi-language** - i18n
