# Velox

> **Scan. Upload. Done.**

Velox is a QR-based smart printing platform designed to digitize the workflow of campus photocopy and print shops.

Instead of sharing documents over WhatsApp and waiting in long queues, users simply scan a shop-specific QR code, upload their documents, configure print settings, make payment, and track their order in real time.

Velox transforms traditional print shops into digitally connected, efficient, and privacy-focused service centers.

---

# Vision

To become the operating system for modern print shops by simplifying document printing through automation, real-time tracking, and intelligent workflow management.

---

# Problem Statement

Current printing workflows are highly manual.

Typical workflow:

1. Student sends PDF via WhatsApp.
2. Shop owner asks:
   - How many copies?
   - Color or Black & White?
   - Single side or Double side?
3. Shop downloads file manually.
4. Files from different customers get mixed.
5. Students wait without knowing queue status.
6. Privacy issues arise because documents remain stored on WhatsApp and local computers.

This workflow wastes time for both customers and print shop operators.

---

# Solution

Velox provides a complete digital workflow.

```text
Scan QR
      ↓
Upload Document
      ↓
Select Print Settings
      ↓
Payment
      ↓
Live Queue
      ↓
Printing
      ↓
Collect Using Order ID
```

Every print shop receives its own QR code.

Customers never need to exchange phone numbers or send files over messaging applications.

---

# Key Features

## Customer Side

- QR-based shop access
- PDF upload
- Print settings
- Live queue
- Real-time order tracking
- Online payment
- Counter payment
- Order history
- Secure file deletion

---

## Shop Dashboard

- Live print queue
- Printer management
- Multiple printer support
- Counter payment
- Order verification
- Daily statistics
- Revenue dashboard
- Queue management

---

## Windows Agent

- Automatically receives print jobs
- Downloads documents securely
- Sends jobs to printers
- Updates order status
- Handles multiple printers
- Deletes temporary files automatically

---

# Privacy First

Velox is designed with privacy as a core principle.

Uploaded documents are:

- stored temporarily
- encrypted during transfer
- automatically deleted after successful printing

No permanent copies remain on the shop's system.

---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- Node.js
- Express

## Database

- PostgreSQL

## Realtime

- Socket.io

## Payments

- Razorpay

## Windows Agent

- .NET 8
- C#
- Windows Print APIs

---

# High Level Architecture

```text
Customer

↓

QR Code

↓

Velox Web App

↓

Backend API

↓

PostgreSQL

↓

Windows Agent

↓

Printer
```

---

# Project Structure

```
velox/

docs/
frontend/
backend/
windows-agent/
assets/
```

---

# Development Status

Current Phase:

Production Development

Completed:

- Product Research
- PRD
- SRS
- UI Prototype
- Interactive Demo

In Progress:

- Production Architecture
- Backend Development
- Database Design
- Windows Agent Development

Upcoming:

- MVP Release
- Real Shop Testing
- Beta Deployment

---

# Goals

- Eliminate WhatsApp-based printing
- Reduce customer waiting time
- Improve shop productivity
- Protect customer privacy
- Standardize printing workflow
- Build scalable infrastructure

---

# Long-Term Roadmap

Phase 1

Prototype

↓

Phase 2

Production MVP

↓

Phase 3

Windows Agent

↓

Phase 4

Pilot Testing

↓

Phase 5

Public Beta

↓

Phase 6

Commercial Launch

---

# Development Principles

Every feature should satisfy at least one of these goals:

- Reduce waiting time
- Reduce manual work
- Improve privacy
- Improve reliability
- Improve operator efficiency

If a feature satisfies none of the above, it should not be built.

---

# Repository

This repository contains:

- Frontend Application
- Backend Services
- Windows Agent
- Documentation
- Design Assets

---

# Contributors

Developed by **Syntax Space**

Currently under active development.

---

# License

This project is proprietary software.

All rights reserved © Syntax Space.