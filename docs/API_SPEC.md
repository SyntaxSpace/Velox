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
  "name":"",
  "email":"",
  "password":""
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

# Shop APIs

## Get Shop Details

GET

/shops/{shopId}

Returns

Shop Name

QR

Address

Status

Printers

Estimated Wait Time

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
  "shopId":"",
  "copies":2,
  "color":false,
  "doubleSided":true,
  "paymentMethod":"UPI"
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