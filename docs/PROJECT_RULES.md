# Project Rules

Version: 1.0

Project: Velox

Last Updated: August 2026

---

# Purpose

This document defines the development standards, coding conventions, architectural principles, and engineering practices for Velox.

Every contributor, AI coding assistant, and developer must follow these rules.

These rules are mandatory unless explicitly changed through an Architecture Decision Record (ADR).

---

# Golden Rule

**Never sacrifice reliability for speed of development.**

Velox manages real customer orders.

A bug may result in:

- Wrong prints
- Duplicate prints
- Lost documents
- Financial loss
- Privacy issues

Every decision should prioritize correctness.

---

# Engineering Principles

## Simplicity First

Prefer simple solutions over clever ones.

If a junior developer cannot understand the code after reading it once, it is probably too complicated.

---

## Build for Production

Never write temporary production code.

Avoid:

- TODO hacks
- magic values
- hardcoded URLs
- duplicated logic

---

## Separation of Concerns

Every module should have one responsibility.

Good example:

Frontend
→ UI only

Backend
→ Business logic

Database
→ Data persistence

Windows Agent
→ Printer communication

---

## Single Source of Truth

Never duplicate business logic.

Queue calculations must exist only in one place.

Pricing calculations must exist only in one place.

---

# Repository Structure

```
velox/

frontend/

backend/

windows-agent/

docs/

scripts/

assets/

.github/
```

Do not create random folders.

---

# Branch Strategy

Never commit directly to main.

Branches:

main

develop

feature/*

fix/*

docs/*

hotfix/*

Example

feature/payment-module

feature/queue-engine

fix/order-status

---

# Commit Convention

Use Conventional Commits.

Examples

feat: add order tracking

fix: resolve duplicate print bug

docs: update API documentation

refactor: simplify queue service

style: improve dashboard spacing

test: add queue integration tests

Never commit:

update

changes

new code

---

# Coding Standards

## TypeScript

Strict Mode enabled.

No any unless absolutely required.

Prefer interfaces over type aliases where appropriate.

Always use explicit return types for exported functions.

---

## Naming

Variables

camelCase

Functions

camelCase

Components

PascalCase

Files

kebab-case

Folders

lowercase

Constants

UPPER_SNAKE_CASE

---

# Folder Naming

Correct

order-service.ts

print-queue.ts

payment-modal.tsx

Wrong

OrderService.ts

queueFINAL.ts

newfile.ts

---

# Component Rules

Every component should:

- do one thing
- be reusable
- be testable

Avoid components longer than 300 lines.

Split large components.

---

# Styling

Only Tailwind CSS.

Do not use inline styles.

Avoid custom CSS unless absolutely necessary.

---

# UI Principles

Inspired by:

- Apple
- Stripe
- Linear
- Vercel

Design should be:

- clean
- minimal
- predictable
- accessible

---

# Animations

Use Framer Motion.

Animations should:

- communicate state
- improve clarity

Never animate for decoration only.

---

# Icons

Use Lucide Icons only.

Maintain consistency across the project.

---

# Backend Rules

Business logic belongs only in services.

Controllers should:

- validate request
- call service
- return response

Nothing else.

---

# API Rules

Every endpoint returns

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

Errors

```json
{
  "success": false,
  "message": "",
  "error": {}
}
```

---

# Validation

Validate every request.

Never trust frontend input.

---

# Logging

Every important event must be logged.

Examples

Order Created

Payment Received

Printing Started

Printing Completed

Order Cancelled

Printer Offline

---

# Queue Rules

Queue order is critical.

Never allow:

- duplicate jobs
- skipped jobs
- race conditions

Queue updates must be atomic.

---

# File Handling

Allowed

PDF

PNG

JPG

Reject everything else.

Maximum upload size should be configurable.

---

# Privacy Rules

Files must never remain permanently on the server.

Delete automatically after printing.

Temporary files must also be removed from the Windows Agent.

---

# Windows Agent Rules

Agent must:

- reconnect automatically
- retry failed downloads
- recover after crash
- continue pending jobs

Never require manual restart.

---

# Database Rules

Every table must include:

- id
- createdAt
- updatedAt

Use UUIDs instead of incremental IDs where possible.

---

# Error Handling

Never expose internal errors.

Log detailed errors internally.

Return user-friendly messages.

---

# Security

Never store:

- UPI PINs
- passwords
- payment secrets

Encrypt:

- authentication tokens
- API communication

Always use HTTPS.

---

# Performance

Optimize for:

Fast page loads

Minimal API calls

Efficient queries

Low memory usage

---

# Testing

Every critical feature should have:

- unit tests
- integration tests

Before release:

- manual testing
- end-to-end testing

---

# Documentation

Every major feature requires:

- documentation
- API updates
- architecture updates (if needed)

Documentation is part of the feature.

---

# Pull Requests

Every PR should include:

- summary
- screenshots (if UI)
- testing notes
- linked issue

---

# Feature Acceptance Checklist

Before merging any feature:

- Works correctly
- No console errors
- Responsive
- Tested
- Documented
- Reviewed

---

# Definition of Done

A feature is complete only if:

✓ Code is written

✓ Tests pass

✓ Documentation updated

✓ UI reviewed

✓ No known bugs

✓ Ready for production

---

# Multi-Shop & Guest Customer Architectural Rules (Day 7)

## Zero-Login Customer Experience

- Customers scanning counter QR codes MUST NEVER be forced to register or login.
- Customer sessions use short-lived/24h anonymous JWTs containing `guestSessionId` and `shopId`.
- No customer password or email is ever required to upload, pay, or track an order.
- Authentication (email/password with Argon2id) is strictly reserved for Shop Owners, Operators, and Admins.

## Strict Multi-Tenant Isolation

- Every shop is isolated by `publicShopId` and `ownerId`.
- Owner A can NEVER view, modify, or list orders, settings, or printers for Owner B's shop.
- Guest customer orders are strictly private: Guest A can never view or modify Guest B's orders or orders from another shop.

---

# Central Partner Platform & Shop Provisioning Rules (Day 8)

## Central Platform Model (Not an Open Marketplace)

- Velox Company is the central platform owner.
- Velox is **NOT a self-service marketplace** where shop owners register themselves.
- Only authorized **Velox Partner / Admin users** (`role: 'PARTNER' | 'ADMIN'`) can create shops, provision shop owner accounts, view all network stores, and inspect company-wide statistics.

## Public Registration Restrictions

- Public `/auth/register` strictly rejects self-assignment of `SHOP_OWNER`, `OWNER`, `PARTNER`, or `ADMIN` roles with `403 Forbidden`.
- Shop owner accounts are created exclusively via atomic provisioning (`POST /api/v1/partner/shops`).

## Provisioned Shop Owner Lifecycle & Scope

- Shop owners receive onboarding credentials directly from their regional Velox Partner.
- Every provisioned shop owner account has `firstLogin: true` set by default.
- On first login, shop owners must update their temporary password via `POST /api/v1/auth/first-login-change-password` before continuing.
- Shop owners are strictly scoped to their single assigned store (`shop.ownerId === req.user.userId`). They can never create new shops, see other shops, or access partner dashboards.

## Shop-Specific Dynamic Pricing

- Pricing is configured per-shop (`pricePerPageBW`, `pricePerPageColor`, `duplexDiscount`).
- Order cost calculations must dynamically fetch the target shop's configured rates rather than using hardcoded global rates.

---

# Final Principle

Velox is infrastructure.

Users should never notice the complexity behind it.

They should simply:

Scan.

Upload.

Collect.
