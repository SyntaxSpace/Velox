# Database Design

Project: Velox

Version: 1.0

Database: PostgreSQL

---

# Purpose

This document defines the database architecture for Velox.

It specifies:

- Tables
- Relationships
- Constraints
- Indexes
- Naming conventions
- Data lifecycle
- Future scalability

---

# Database Principles

• UUID primary keys

• Soft delete where appropriate

• Timestamps on every table

• Normalized schema

• Foreign key constraints

• Indexed search fields

---

# Database Overview

```mermaid
erDiagram

SHOPS ||--o{ USERS : has
SHOPS ||--o{ PRINTERS : owns
SHOPS ||--o{ ORDERS : receives

USERS ||--o{ ORDERS : creates

ORDERS ||--|| PAYMENTS : has
ORDERS ||--o{ ORDER_FILES : contains
ORDERS ||--o{ ORDER_EVENTS : generates

PRINTERS ||--o{ ORDERS : prints
```

---

# Table Naming Convention

Use plural table names.

Correct

shops

orders

users

payments

Wrong

shop

Order

tbl_users

---

# Common Fields

Every table contains:

```sql
id UUID PRIMARY KEY

created_at TIMESTAMP

updated_at TIMESTAMP
```

---

# Table: shops

Stores every registered shop.

Fields

| Field                 | Type                                   |
| --------------------- | -------------------------------------- |
| id                    | UUID                                   |
| public_shop_id        | TEXT UNIQUE (Indexed slug)             |
| owner_id              | UUID (FK -> users.id)                  |
| name                  | TEXT                                   |
| qr_code               | TEXT                                   |
| address               | TEXT                                   |
| city                  | TEXT                                   |
| pincode               | TEXT                                   |
| phone                 | TEXT                                   |
| email                 | TEXT                                   |
| operating_hours       | TEXT                                   |
| status                | TEXT (ACTIVE, INACTIVE, SUSPENDED)     |
| created_by_partner_id | UUID (FK -> users.id, Partner creator) |
| price_per_page_bw     | DECIMAL(10,2) DEFAULT 2.00             |
| price_per_page_color  | DECIMAL(10,2) DEFAULT 10.00            |
| duplex_discount       | DECIMAL(10,2) DEFAULT 0.00             |
| created_at            | TIMESTAMP                              |
| updated_at            | TIMESTAMP                              |

---

# Table: users

Stores platform partners, provisioned shop owners, operators, and customers.

Fields

| Field         | Type                                                           |
| ------------- | -------------------------------------------------------------- |
| id            | UUID                                                           |
| shop_id       | UUID                                                           |
| name          | TEXT                                                           |
| email         | TEXT (UNIQUE)                                                  |
| phone         | TEXT                                                           |
| role          | ENUM (PARTNER, SHOP_OWNER, OWNER, OPERATOR, CUSTOMER, ADMIN)   |
| password_hash | TEXT                                                           |
| first_login   | BOOLEAN DEFAULT false (Enforces password reset on first login) |
| created_at    | TIMESTAMP                                                      |
| updated_at    | TIMESTAMP                                                      |

Roles (Day 8 Hierarchy)

• PARTNER (Authorized Velox Company Partner; provisions shops and owners)
• SHOP_OWNER (Assigned store owner; strictly scoped to their single shop)
• OWNER (Legacy alias for SHOP_OWNER)
• OPERATOR (Shop terminal operator)
• CUSTOMER (Registered customer)
• ADMIN (Velox Platform Administrator)

---

# Table: printers

Fields

| Field            | Type      |
| ---------------- | --------- |
| id               | UUID      |
| shop_id          | UUID      |
| name             | TEXT      |
| printer_type     | TEXT      |
| status           | TEXT      |
| ip_address       | TEXT      |
| pages_per_minute | INTEGER   |
| created_at       | TIMESTAMP |

Printer Types

BlackWhite

Color

Bulk

Status

Online

Offline

Printing

Paused

---

# Table: orders

Core table.

Fields

| Field            | Type                                            |
| ---------------- | ----------------------------------------------- |
| id               | UUID                                            |
| order_code       | TEXT                                            |
| user_id          | UUID (Nullable, optional for guest customers)   |
| guest_session_id | TEXT (Nullable, indexed for anonymous checkout) |
| shop_id          | UUID (FK -> shops.id)                           |
| printer_id       | UUID (Nullable)                                 |
| queue_position   | INTEGER                                         |
| total_pages      | INTEGER                                         |
| total_price      | DECIMAL                                         |
| payment_status   | TEXT                                            |
| order_status     | TEXT                                            |
| estimated_time   | INTEGER                                         |
| created_at       | TIMESTAMP                                       |

Order Status

Pending

Waiting

Accepted

Printing

Completed

Collected

Cancelled

Deleted

---

# Table: order_files

Fields

| Field        | Type      |
| ------------ | --------- |
| id           | UUID      |
| order_id     | UUID      |
| filename     | TEXT      |
| file_url     | TEXT      |
| page_count   | INTEGER   |
| size         | BIGINT    |
| mime_type    | TEXT      |
| delete_after | TIMESTAMP |

Files automatically removed after printing.

---

# Table: payments

Fields

| Field          | Type      |
| -------------- | --------- |
| id             | UUID      |
| order_id       | UUID      |
| method         | TEXT      |
| amount         | DECIMAL   |
| transaction_id | TEXT      |
| status         | TEXT      |
| created_at     | TIMESTAMP |

Methods

UPI

Counter

Card

Status

Pending

Success

Failed

Refunded

---

# Table: transactions

Stores financial history.

Fields

| Field          | Type      |
| -------------- | --------- |
| id             | UUID      |
| shop_id        | UUID      |
| order_id       | UUID      |
| amount         | DECIMAL   |
| payment_method | TEXT      |
| created_at     | TIMESTAMP |

---

# Table: notifications

Fields

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| user_id    | UUID      |
| title      | TEXT      |
| message    | TEXT      |
| read       | BOOLEAN   |
| created_at | TIMESTAMP |

---

# Table: order_events

Stores order history.

Example

Order Created

↓

Payment Received

↓

Printing Started

↓

Completed

↓

Collected

Fields

| Field      | Type      |
| ---------- | --------- |
| id         | UUID      |
| order_id   | UUID      |
| event      | TEXT      |
| created_at | TIMESTAMP |

---

# Indexes

Create indexes on

orders.shop_id

orders.status

payments.transaction_id

users.email

printers.shop_id

notifications.user_id

---

# Relationships

One Shop

↓

Many Printers

Many Orders

Many Users

One Order

↓

One Payment

Many Events

Many Files

---

# Constraints

Every order belongs to one shop.

Every payment belongs to one order.

Every printer belongs to one shop.

Order code must be unique.

Email must be unique.

---

# Deletion Policy

Orders

Soft Delete

Payments

Never Delete

Transactions

Never Delete

Files

Delete Automatically

Notifications

Archive

---

# Backup Strategy

Daily Backup

↓

7-Day Retention

↓

Monthly Snapshot

---

# Future Tables

inventory

subscriptions

coupons

reviews

analytics

audit_logs

branches

devices

---

# Migration Strategy

Every schema change must:

1.

Create migration

2.

Review

3.

Test

4.

Deploy

Never modify production tables manually.

---

# Database Goals

• Fast queries

• Data consistency

• High reliability

• Easy maintenance

• Horizontal scalability

• Privacy-first storage
