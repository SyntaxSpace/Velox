# API Specification

Project: Velox

Version: v1

Protocol: HTTPS + WebSocket

Format: JSON

Status: Production

---

# Purpose

This document defines every REST API and WebSocket event used by Velox.

Objectives

• Consistent API design

• Predictable responses

• Clear validation

• Easy frontend integration

• Versioned endpoints

---

# Base URL

Development

http://localhost:5000/api/v1

Production

https://api.velox.app/api/v1

---

# API Principles

RESTful

Stateless

Versioned

JSON only

Secure

Idempotent where applicable

---

# Authentication

JWT Authentication

Authorization

Bearer <token>

Protected Endpoints

Require JWT.

Public Endpoints

Do not require authentication.

---

# Standard Response

Success

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {}
}
```

Error

```json
{
  "success": false,
  "message": "Invalid request",
  "error": {}
}
```

---

# Error Codes

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# Authentication APIs

## Register

POST

/auth/register

Request

```json
{
  "name": "",
  "email": "",
  "password": ""
}
```

Response

JWT Token

---

## Login

POST

/auth/login

---

## Logout

POST

/auth/logout

---

## Refresh Token

POST

/auth/refresh

---

# Shop & Multi-Tenant APIs

## Create Shop (Owner/Admin)

POST

/shops

Request

```json
{
  "name": "Apex Xerox & Digital Prints",
  "phone": "9876543210",
  "email": "shop@example.com",
  "address": "Shop #4, Student Complex",
  "city": "Bengaluru",
  "pincode": "560001",
  "operatingHours": "9:00 AM - 9:00 PM"
}
```

Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "publicShopId": "shop_apex_prints",
    "name": "Apex Xerox & Digital Prints",
    "status": "ACTIVE",
    "qrCode": "..."
  }
}
```

---

## Get My Shops (Owner/Admin)

GET

/shops

Returns all shops owned by the authenticated owner.

---

## Get Shop Details

GET

/shops/{shopId}

Returns

Shop Name, Public ID, Address, Status, Discovered Printers, Estimated Wait Time.

---

## Update Shop Configuration (Owner/Admin)

PATCH

/shops/{shopId}

Strictly enforces owner isolation (Owner A cannot update Owner B's shop).

---

## Get Shop Printers & Edge Devices (Owner/Admin)

GET

/shops/{shopId}/printers

Returns discovered local printers and paired Windows Edge Agent heartbeat status.

---

# Public Customer Endpoints (Zero-Login Flow)

## Get Public Shop Page

GET

/public/shops/{publicShopId}

Publicly accessible. Decoupled from internal database UUIDs. Strictly verifies that shop is `ACTIVE`.

---

## Create Anonymous Guest Session

POST

/public/shops/{publicShopId}/session

Issues a 24-hour anonymous JWT containing `guestSessionId`, `shopId`, and `role: "CUSTOMER"`.

---

## Get Public Shop Queue

GET

/public/shops/{publicShopId}/queue

Returns live queue length, active orders, and average wait time for the shop.

---

## Shop Statistics

GET

/shops/{shopId}/stats

Returns

Today's Orders

Revenue

Queue

Printing

Completed

---

# Order APIs

## Create Order

POST

/orders

Request

```json
{
  "shopId": "",
  "copies": 2,
  "color": false,
  "doubleSided": true,
  "paymentMethod": "UPI"
}
```

Returns

Order ID

Order Code

Estimated Cost

---

## Upload File

POST

/orders/{id}/upload

Multipart Form Data

Supported

PDF

PNG

JPG

---

## Get Order

GET

/orders/{id}

---

## Get Order Status

GET

/orders/{id}/status

Returns

Queue Position

ETA

Printer

Current Status

---

## Cancel Order

PATCH

/orders/{id}/cancel

Allowed only before printing starts.

---

## Complete Order

PATCH

/orders/{id}/complete

Operator only.

---

# Queue APIs

## Current Queue

GET

/shops/{shopId}/queue

Returns

Current Queue

Printing

Completed

Average Wait

---

## Queue Position

GET

/orders/{id}/queue

Returns

Queue Position

People Ahead

Estimated Time

---

# Printer APIs

## Get Printers

GET

/printers

---

## Update Printer

PATCH

/printers/{id}

---

## Printer Status

GET

/printers/{id}/status

Returns

Online

Offline

Printing

Paused

Error

---

# Payment APIs

## Create Payment

POST

/payments/create

Returns

Payment Session

---

## Verify Payment

POST

/payments/verify

---

## Counter Payment

POST

/payments/counter

Operator only.

---

## Payment Status

GET

/payments/{id}

---

# Notification APIs

GET

/notifications

PATCH

/notifications/{id}/read

DELETE

/notifications/{id}

---

# Dashboard APIs

GET

/dashboard

Returns

Today's Revenue

Today's Orders

Queue

Completed

Printer Status

---

# Windows Agent APIs

## Agent Login

POST

/agent/login

---

## Heartbeat

POST

/agent/heartbeat

Runs every

30 seconds

---

## Fetch Jobs

GET

/agent/jobs

Returns

Waiting Jobs

---

## Update Job

PATCH

/agent/jobs/{id}

Updates

Printing

Completed

Failed

Cancelled

---

## Printer List

GET

/agent/printers

---

## Agent Logs

POST

/agent/logs

---

# WebSocket Events

Customer

order.created

payment.success

queue.updated

printing.started

printing.completed

order.ready

Operator

new.order

printer.offline

queue.changed

payment.received

Agent

agent.connected

agent.disconnected

job.received

job.completed

printer.error

---

# Validation Rules

PDF only

Maximum size configurable

Minimum copies = 1

Maximum copies configurable

Payment required before printing

---

# Rate Limits

Guest

30 requests/min

Authenticated

100 requests/min

Agent

Unlimited

---

# Security

HTTPS Only

JWT

Input Validation

Rate Limiting

Request Logging

CORS

Helmet

File Type Validation

---

# Versioning

/api/v1

Future

/api/v2

Old versions remain supported during migration.

---

# API Documentation

Swagger/OpenAPI

Automatically generated

Available at

/docs

---

# Day 8: Partner Platform, Provisioning & Pricing APIs

## 1. Partner Operations (`/api/v1/partner/*`)

_Role Required: `PARTNER` or `ADMIN`_

### `GET /api/v1/partner/stats`

Returns company-level network statistics.

- **Response 200**:
  ```json
  {
    "success": true,
    "data": {
      "totalShops": 12,
      "activeShops": 10,
      "inactiveShops": 2,
      "totalOrdersToday": 154,
      "totalRevenueToday": 3480
    }
  }
  ```

### `GET /api/v1/partner/shops`

Returns list of all shops provisioned on the Velox platform.

- **Response 200**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "shop-uuid",
        "publicShopId": "shop_apex_prints",
        "name": "Apex Prints",
        "ownerId": "owner-uuid",
        "createdByPartnerId": "partner-uuid",
        "pricePerPageBW": 2.0,
        "pricePerPageColor": 10.0,
        "duplexDiscount": 0.5,
        "status": "ACTIVE",
        "printers": []
      }
    ]
  }
  ```

### `POST /api/v1/partner/shops`

Atomically provisions a new print shop and creates its dedicated shop owner account with temporary credentials.

- **Request Body**:
  ```json
  {
    "name": "Apex Prints",
    "phone": "9876543210",
    "email": "contact@apexprints.com",
    "address": "123 Main St",
    "city": "Bengaluru",
    "pincode": "560001",
    "operatingHours": "9:00 AM - 9:00 PM",
    "pricePerPageBW": 2.0,
    "pricePerPageColor": 10.0,
    "duplexDiscount": 0.5,
    "ownerName": "Ramesh Kumar",
    "ownerEmail": "ramesh@apexprints.com",
    "ownerPhone": "9876543210",
    "temporaryPassword": "TempPassword123!"
  }
  ```
- **Response 201**:
  ```json
  {
    "success": true,
    "data": {
      "shop": { "id": "...", "publicShopId": "..." },
      "owner": { "id": "...", "email": "...", "firstLogin": true },
      "temporaryPassword": "TempPassword123!"
    }
  }
  ```

### `GET /api/v1/partner/shops/:shopId`

Returns complete profile, fleet, and pricing details for a specific shop.

---

## 2. Authentication & First-Login Password Enforcement

### `POST /api/v1/auth/first-login-change-password`

_Role Required: Authenticated user with `firstLogin: true`_

- **Request Body**:
  ```json
  {
    "temporaryPassword": "TempPassword123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```
- **Response 200**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "firstLogin": false },
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
  ```

---

## 3. Shop-Specific Pricing APIs (`/api/v1/shops/:shopId/pricing`)

### `GET /api/v1/shops/:shopId/pricing`

Returns current configured page rates for the shop.

- **Response 200**:
  ```json
  {
    "success": true,
    "data": {
      "pricePerPageBW": 2.0,
      "pricePerPageColor": 10.0,
      "duplexDiscount": 0.5
    }
  }
  ```

### `PATCH /api/v1/shops/:shopId/pricing`

_Role Required: `ADMIN`, `PARTNER`, or assigned `SHOP_OWNER`_

- **Request Body**:
  ```json
  {
    "pricePerPageBW": 2.5,
    "pricePerPageColor": 12.0,
    "duplexDiscount": 0.5
  }
  ```
- **Response 200**:
  ```json
  {
    "success": true,
    "data": {
      "id": "shop-uuid",
      "pricePerPageBW": 2.5,
      "pricePerPageColor": 12.0,
      "duplexDiscount": 0.5
    }
  }
  ```

---

# Future APIs

Coupons

Subscriptions

Analytics

Inventory

Branches

Customer Reviews

Push Notifications

---

# API Development Rules

Never break existing APIs.

Add new fields instead of changing existing ones.

Keep responses backward compatible.

Document every endpoint before implementation.

Every endpoint must have:

Validation

Authentication

Error Handling

Unit Tests

Documentation

---

# Conclusion

The API layer is the communication contract between every Velox component.

Changes to this document require architecture review before implementation.
