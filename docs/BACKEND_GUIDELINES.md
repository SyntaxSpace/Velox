# Backend Development Guidelines

Project: Velox

Framework: Node.js + Express

Language: TypeScript

Version: 1.0

Status: Production

---

# Purpose

This document defines backend architecture, coding standards, project structure,
API implementation, business logic, database access, security,
logging, testing, and deployment practices.

Every backend contributor must follow these guidelines.

---

# Philosophy

The backend is the brain of Velox.

It should:

- Be reliable
- Be scalable
- Be predictable
- Be secure
- Be easy to maintain

Business logic belongs in the backend.

The frontend should only display data.

---

# Technology Stack

Runtime

Node.js

Framework

Express.js

Language

TypeScript

ORM

Prisma ORM

Database

PostgreSQL

Authentication

JWT

Realtime

Socket.io

Validation

Zod

Logging

Pino

Testing

Vitest

File Storage

AWS S3 / Cloudflare R2 (Production)

Redis

Queue cache & sessions (Future)

---

# Project Structure

backend/

src/

controllers/

services/

repositories/

middlewares/

routes/

socket/

config/

database/

prisma/

jobs/

events/

types/

validators/

utils/

constants/

tests/

server.ts

---

# Architecture

The backend follows Clean Architecture.

Request

↓

Route

↓

Controller

↓

Service

↓

Repository

↓

Database

Never skip layers.

---

# Responsibilities

Routes

- Register endpoints
- Apply middleware

Controllers

- Receive request
- Validate request
- Call service
- Return response

Services

- Business logic
- Queue logic
- Payment logic
- Notifications

Repositories

- Database operations only

Database

- Persistent storage

---

# Dependency Rule

Controllers never access database.

Frontend never accesses database.

Services never return HTTP responses.

Repositories never contain business logic.

---

# Naming Conventions

Files

order.service.ts

payment.controller.ts

queue.repository.ts

Folders

lowercase

Classes

PascalCase

Functions

camelCase

Constants

UPPER_SNAKE_CASE

---

# API Design

RESTful

Plural resources

Correct

/orders

/printers

/payments

Wrong

/getOrders

/createOrder

---

# Validation

Every request must be validated.

Use

Zod

Never trust client data.

---

# Error Handling

Centralized Error Handler

All errors should extend

AppError

Example

ValidationError

AuthenticationError

PaymentError

QueueError

PrinterError

NotFoundError

---

# Logging

Every important event must be logged.

Examples

User Login

Order Created

Payment Success

Printing Started

Printing Completed

Queue Updated

Agent Connected

Printer Offline

---

# Database Rules

Use Prisma ORM.

Never write raw SQL unless necessary.

Every database operation goes through repositories.

---

# Transactions

Use database transactions for:

Order Creation

Payment Verification

Printer Assignment

Queue Updates

Any multi-step operation.

---

# Queue Engine

The Queue Engine owns:

Queue Position

ETA

Printer Assignment

Retries

Priority

No other module may modify queue state.

---

# Windows Agent Communication

Communication Protocol

Secure WebSocket

Events

Agent Connected

Heartbeat

Job Assigned

Job Completed

Printer Error

Reconnect

---

# Authentication

JWT

Access Token

Refresh Token (Future)

Passwords

Argon2 hashing

Never store plaintext passwords.

---

# Authorization

Roles

Customer

Operator

Owner

Administrator

Role middleware required.

---

# File Upload

Allowed

PDF

PNG

JPG

Maximum size configurable.

Virus scanning (Future)

Files stored temporarily.

---

# Security

Helmet

Rate Limiting

CORS

Input Validation

Output Sanitization

HTTPS Only

Secure Cookies (Future)

---

# Configuration

Never hardcode.

Use environment variables.

Example

DATABASE_URL

JWT_SECRET

PORT

SOCKET_PORT

S3_BUCKET

RAZORPAY_KEY

---

# Environment Files

.env

Development

.env.production

Production

.env.example

Repository

Never commit real secrets.

---

# Background Jobs

Future workers

Delete Files

Send Notifications

Generate Reports

Analytics

Cleanup

---

# WebSocket

Socket namespaces

/customer

/admin

/agent

Only authenticated clients may connect.

---

# Events

Order Created

Order Updated

Queue Changed

Printer Status

Notification

Heartbeat

Payment Success

---

# Code Style

Use ESLint

Use Prettier

Strict TypeScript

No "any"

No console.log

No duplicated logic

---

# Performance

Database indexes

Pagination

Caching

Connection pooling

Lazy loading

Compression

---

# Documentation

Every module should include

Purpose

Responsibilities

Dependencies

Public Methods

Complex services should include diagrams.

---

# Unit Testing

Test

Services

Repositories

Utilities

Validators

---

# Integration Testing

Test

API Endpoints

Database

Socket Events

Authentication

---

# Monitoring

Future

Prometheus

Grafana

OpenTelemetry

Sentry

---

# Deployment

Docker

GitHub Actions

Cloud VM

Nginx

PM2

HTTPS

---

# Review Checklist

Before merging

✓ Typed

✓ Tested

✓ Documented

✓ No duplicated code

✓ No security issues

✓ Performance reviewed

✓ Logging added

✓ API documented

---

# Final Principle

The backend should be boring.

Reliable software is predictable software.

Every feature should be easy to understand,
easy to test,
and easy to maintain.