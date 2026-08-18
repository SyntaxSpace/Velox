# Architecture

Project: Velox

Version: 1.0

Status: Production

---

# Purpose

This document defines the complete technical architecture of Velox.

It describes how every component communicates,
how data flows through the system,
how modules interact,
and how the platform scales.

Every developer should understand this document before contributing to the codebase.

---

# System Overview

Velox follows a distributed client-server architecture.

The browser never communicates directly with printers.

Instead, every request follows a secure backend workflow.

```
Customer

↓

Frontend (Next.js)

↓

Backend API

↓

Database

↓

Windows Agent

↓
