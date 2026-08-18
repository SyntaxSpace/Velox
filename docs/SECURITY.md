# Security Guidelines

Project: Velox

Version: 1.0

Status: Production

---

# Purpose

This document defines the security architecture, security requirements, best practices, and operational guidelines for Velox.

Security is not a separate feature.

Every component of Velox must be designed with security as a default requirement.

This document applies to:

- Frontend
- Backend
- Windows Agent
- Database
- Infrastructure
- Deployment
- APIs
- Developers

---

# Security Principles

Velox follows five core security principles.

1. Least Privilege
2. Defense in Depth
3. Secure by Default
4. Privacy by Design
5. Zero Trust

---

# Authentication

Authentication uses JSON Web Tokens (JWT).

Access Token

- Short-lived
- Sent using Authorization Header

Future

Refresh Tokens

Role-Based Sessions

Multi-factor Authentication

---

# Authorization

Every authenticated user has a role.

Roles

Customer

Operator

Owner

Administrator

Permissions are validated on every protected endpoint.

Never trust frontend authorization.

---

# Password Security

Passwords must never be stored.

Passwords are hashed using

Argon2id

Requirements

Minimum Length

8 Characters

Recommended

12+

Password reset tokens expire automatically.

---

# API Security

Every endpoint must include:

Authentication

Authorization

Validation

Logging

Rate Limiting

Endpoints must never expose internal implementation details.

---

# HTTPS

Production environments must use HTTPS only.

HTTP requests should automatically redirect to HTTPS.

TLS 1.2 or higher.

---

# JWT

Access Tokens

15 Minutes

Future

Refresh Tokens

30 Days

JWT Secret

Stored only in environment variables.

Never commit secrets.

---

# File Upload Security

Allowed Types

PDF

PNG

JPG

Maximum File Size

Configurable

Rejected Files

Executable Files

Archives

Scripts

Unknown MIME Types

---

# File Validation

Every uploaded file must be validated.

Checks include

Extension

MIME Type

Maximum Size

Checksum (Future)

Virus Scan (Future)

---

# Temporary Storage

Uploaded documents are stored temporarily.

Storage Rules

Files remain encrypted at rest (production object storage).

Files are deleted automatically after successful printing.

Temporary cache is cleaned periodically.

No permanent customer document storage.

---

# Database Security

Use Prisma ORM.

Parameterized Queries

Foreign Keys

Transactions

Backups

Least Privilege Database User

---

# Secrets Management

Secrets include

JWT_SECRET

DATABASE_URL

RAZORPAY_SECRET

API_KEYS

Never

Hardcode secrets

Commit secrets

Store secrets in frontend

Use

Environment Variables

Secret Managers (Future)

---

# CORS

Allow only trusted origins.

Development

localhost

Production

Official Velox domains only.

---

# Security Headers

Helmet Middleware

Enable

Content Security Policy

Frame Guard

XSS Protection

Referrer Policy

Hide Powered By

---

# Rate Limiting

Guest

30 requests/minute

Authenticated

100 requests/minute

Windows Agent

Separate limit

Protect against abuse and brute-force attacks.

---

# Logging

Security events to log

Login

Logout

Failed Login

Permission Denied

Token Expired

Payment Verification

Printer Connection

Windows Agent Authentication

Logs must never contain:

Passwords

UPI PINs

JWT Tokens

Sensitive document content

---

# Input Validation

Validate

Body

Params

Query

Headers

Use Zod schemas.

Reject invalid requests before business logic.

---

# SQL Injection

Prevented by

Prisma ORM

Parameterized Queries

Never concatenate SQL manually.

---

# XSS Protection

Escape output.

Sanitize user-generated content.

Never render raw HTML without sanitization.

---

# CSRF

Use SameSite cookies if cookies are introduced.

Current JWT Authorization Header design reduces CSRF risk.

---

# Windows Agent Security

The agent must:

Authenticate before receiving jobs.

Verify server identity.

Encrypt communication.

Delete temporary files.

Reject unsigned updates.

Store tokens securely.

---

# Payment Security

Velox never stores:

UPI PIN

Card Number

CVV

Sensitive payment credentials

Payments are handled by trusted providers.

---

# Privacy

Velox follows a privacy-first approach.

Documents exist only for the purpose of printing.

Files are automatically deleted after completion.

Operators should access only information required to fulfill the order.

---

# Audit Trail

Record

Order Created

Payment Verified

Printing Started

Printing Completed

Order Collected

File Deleted

Authentication Events

Audit logs are immutable.

---

# Error Handling

Do not expose stack traces.

Return generic messages to users.

Detailed errors remain in server logs.

---

# Dependency Security

Use

npm audit

Dependabot

Regular dependency updates.

Remove unused packages.

---

# Production Checklist

HTTPS Enabled

JWT Configured

Environment Variables Verified

Rate Limiting Enabled

Helmet Enabled

Input Validation Enabled

Logging Enabled

Automatic File Deletion Verified

Database Backups Enabled

Windows Agent Authentication Tested

---

# Incident Response

If a security incident occurs:

1. Identify
2. Contain
3. Investigate
4. Recover
5. Document
6. Improve

---

# Future Security Enhancements

OAuth

MFA

Device Trust

File Virus Scanning

Object Storage Encryption Keys

Security Dashboard

SIEM Integration

---

# Final Principle

Every feature must protect the user's privacy, data, and trust.

Security is a product requirement, not an afterthought.