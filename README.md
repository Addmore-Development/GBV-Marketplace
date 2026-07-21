# Amani Marketplace Platform

## Overview
Amani is an Angular-based marketplace connecting buyers with handcrafted goods made by survivors at care centres — GBV support centres, orphanages, and old age homes across South Africa. The platform follows a social impact model where sales directly benefit makers and their centres.

## Tech Stack
- **Frontend:** Angular (standalone components, lazy-loaded routes)
- **Backend:** Node.js / Express / TypeScript
- **Database:** PostgreSQL
- **Auth:** Session-based + role-based (admin vs buyer)
- **Storage:** localStorage-backed RegistryService (admin state)
- **Styling:** Lora + DM Sans, forest green / sage / gold palette

## Impact Model
| Recipient | Share |
|-----------|-------|
| Survivor/Maker | 70% |
| Care Centre | 28% |
| Platform | 2% |

## Key Features
- Full admin dashboard with centre and buyer management
- `RegistryService` — shared localStorage-backed state across dashboards
- Seller anonymity via aliases; shipping through Centre Hub
- Cart system (session-based), UUID primary keys
- Atomic order + impact-receipt transactions
- Role-based access (`AdminAuthService`)
- `BuyerDashboardComponent` with matching brand palette
- `CentreProfileComponent` as full-page routed view
- Marketplace navigation without forced logout

## Security
- bcrypt password hashing (12 rounds)
- Admin login gate with role-based route guards

## Project Structure
```
amani/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   └── auth/
│   │   ├── buyer/
│   │   │   └── dashboard/
│   │   ├── marketplace/
│   │   ├── centre-profile/
│   │   ├── cart/
│   │   └── shared/
│   │       └── registry.service.ts
├── backend/
│   ├── routes/
│   ├── controllers/
│   └── db/
│       └── schema.sql
└── package.json
```

## Work Summary
- Scaffolded full project from scratch (May–June 2026)
- Built `RegistryService` with localStorage persistence and cross-dashboard data flow
- Implemented centre add/delete flows with seed data
- Built and debugged marketplace, cart, and centre components
- Added admin login with `AdminAuthService` and role-based guards
- Created `BuyerDashboardComponent` with brand-consistent styling
- Built `CentreProfileComponent` as a standalone routed view
- Fixed multiple cross-component bugs (cart, marketplace, centres)
- Windows/PowerShell environment — all commands translated from Linux

---
*Last updated: June 2026*
