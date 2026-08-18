# Frontend Guidelines

Project: Velox

Framework: Next.js 15 (App Router)

Language: TypeScript

Version: 1.0

---

# Purpose

This document defines frontend architecture, folder structure,
component rules, UI standards, state management,
routing conventions and coding guidelines.

Every frontend developer and AI coding assistant
must follow this document.

---

# Tech Stack

Framework

Next.js 15

Language

TypeScript

Styling

Tailwind CSS

UI Library

shadcn/ui

Icons

Lucide React

Animations

Framer Motion

Forms

React Hook Form

Validation

Zod

HTTP Client

Axios

Realtime

Socket.io Client

---

# Folder Structure

frontend/

src/

app/

components/

features/

hooks/

lib/

services/

store/

types/

constants/

styles/

public/

---

# App Folder

app/

(auth)/

(customer)/

(admin)/

api/

layout.tsx

page.tsx

loading.tsx

error.tsx

not-found.tsx

---

# Feature Structure

features/

orders/

payments/

queue/

printers/

notifications/

dashboard/

settings/

authentication/

Each feature owns:

components

hooks

services

types

utils

---

# Component Structure

components/

ui/

shared/

layout/

navigation/

cards/

tables/

dialogs/

forms/

buttons/

---

# Component Rules

Each component should

Do one thing.

Be reusable.

Be typed.

Avoid prop drilling.

Maximum size

300 lines.

Split if larger.

---

# Naming Convention

Components

PascalCase

OrderCard.tsx

QueueTable.tsx

Hooks

useOrder.ts

useQueue.ts

Files

kebab-case

order-card.tsx

Folders

lowercase

Variables

camelCase

Constants

UPPER_SNAKE_CASE

---

# Routing

Customer

/

/shop/[shopId]

/upload

/payment

/queue

/history

/profile

Admin

/admin

/admin/orders

/admin/printers

/admin/dashboard

/admin/settings

---

# State Management

Local State

React useState

Server State

TanStack Query

Global State

Zustand

Never use Context for global application state.

---

# API Layer

Never call APIs directly inside components.

Correct

Component

↓

Hook

↓

Service

↓

API

---

# Styling

Only Tailwind CSS.

No inline styles.

No custom CSS unless necessary.

---

# Forms

Use

React Hook Form

+

Zod

Every form must include validation.

---

# Loading States

Every page must have

Skeleton Loader

Loading Spinner

Error State

Empty State

---

# Error Handling

Never expose raw API errors.

Display user-friendly messages.

Log technical details separately.

---

# Icons

Lucide Icons only.

Consistent size

20px

24px

---

# Theme

Light Mode first.

Dark Mode optional.

---

# Motion

Framer Motion

Animations should communicate state.

Duration

150-250ms

Avoid decorative animations.

---

# Accessibility

Keyboard Navigation

ARIA Labels

Focus States

Readable Contrast

Touch Targets

---

# Responsive Design

Customer

Mobile First

Admin

Desktop First

Tablet Supported

---

# Performance

Lazy Load

Dynamic Imports

Optimized Images

Code Splitting

Memoization where needed

---

# File Upload

Drag & Drop

Browse

Progress Indicator

Validation

---

# Notifications

Toast

Success

Warning

Error

Info

---

# Security

Never expose secrets.

Validate all user input.

Escape HTML.

Prevent XSS.

---

# Testing

Unit Tests

Component Tests

E2E Tests

---

# Code Review Checklist

Typed?

Responsive?

Accessible?

No console.log?

Reusable?

Documented?

Tested?

---

# Final Principle

Frontend exists to make the workflow effortless.

Users should never struggle to complete a print order.