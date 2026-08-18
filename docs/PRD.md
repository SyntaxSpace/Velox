# Product Requirements Document (PRD)

---

Project

Velox

Version

1.0

Status

Production Planning

Owner

Syntax Space

---

# 1. Executive Summary

Velox is a QR-based smart printing platform that modernizes the workflow of campus and local photocopy shops.

Customers scan a QR code placed at the shop, upload their documents, configure print preferences, complete payment, and track their order in real time.

On the shop side, operators receive print jobs through a centralized dashboard while a Windows Agent automatically communicates with local printers.

Velox removes manual communication, reduces waiting time, improves operational efficiency, and protects user privacy through automatic file deletion.

---

# 2. Vision

Create the operating system for modern printing businesses.

Printing should become as effortless as online food ordering.

---

# 3. Mission

Replace manual print workflows with an automated, transparent and privacy-first digital platform.

---

# 4. Product Goals

Primary Goals

• Eliminate WhatsApp-based document sharing

• Reduce customer waiting time

• Digitize print ordering

• Improve print shop workflow

• Provide real-time queue tracking

• Protect customer privacy

---

Secondary Goals

• Multi-printer management

• Automatic printer assignment

• Digital payments

• Business analytics

• Multi-shop management

---

# 5. Success Metrics

KPIs

Average waiting time

Average order completion time

Orders processed per day

Successful print rate

Average queue length

Customer satisfaction

Shop retention rate

Daily active users

Monthly recurring revenue

---

# 6. Target Audience

Primary

Students

Needs

Fast printing

Queue visibility

Simple uploads

Online payments

Privacy

---

Secondary

Photocopy Shops

Needs

Organized workflow

Higher throughput

Reduced manual work

Revenue visibility

Printer management

---

Future

Universities

Corporate Offices

Libraries

Business Centers

---

# 7. User Personas

Persona 1

Student

Goals

Print assignments quickly.

Pain Points

Waiting

Manual communication

Uncertainty

Privacy

---

Persona 2

Shop Operator

Goals

Handle more customers.

Pain Points

WhatsApp

Repeated questions

File management

Queue confusion

---

Persona 3

Shop Owner

Goals

Increase efficiency.

Pain Points

Manual tracking

No analytics

Revenue monitoring

---

# 8. Product Scope

Included

QR Workflow

Upload Documents

Payment

Queue Management

Windows Agent

Admin Dashboard

Multi Printer

Notifications

Privacy

Reports

---

Excluded (MVP)

AI Features

Native Mobile Apps

Loyalty Programs

Coupons

Marketplace

---

# 9. User Journey

Customer

Scan QR

↓

Upload PDF

↓

Print Settings

↓

Payment

↓

Queue

↓

Printing

↓

Pickup

---

Operator

Receive Order

↓

Verify

↓

Print

↓

Complete

↓

Collect

---

# 10. Functional Requirements

Student

Upload PDF

Select print settings

Pay online

Counter payment

Track queue

Receive notifications

View order history

Download invoice

---

Shop Dashboard

Receive orders

Manage queue

Assign printer

Update order status

Monitor printers

View transactions

View analytics

---

Windows Agent

Receive jobs

Download documents

Send to printer

Retry failures

Reconnect automatically

Delete temporary files

---

Backend

Authentication

Order management

Payment verification

Queue engine

Notifications

Analytics

Logging

---

# 11. Non Functional Requirements

Performance

Page load <2 seconds

API response <300ms

Queue updates <1 second

---

Security

HTTPS

JWT

Encrypted tokens

Temporary file storage

Automatic deletion

---

Availability

99.9% uptime

---

Reliability

No duplicate prints

Crash recovery

Retry mechanism

---

Scalability

Support

1000+ shops

100000+ users

---

# 12. Business Rules

One QR belongs to one shop.

Payment required before auto printing.

Counter payment requires operator approval.

Documents are deleted after printing.

Only supported file types allowed.

Maximum upload size configurable.

Queue order cannot be modified after printing starts.

---

# 13. Privacy

Files are temporary.

No permanent storage.

Automatic deletion after completion.

No document access by unauthorized users.

Encrypted communication.

---

# 14. Risks

Internet outage

Printer offline

Paper shortage

Payment failure

Large documents

Duplicate uploads

---

# 15. Assumptions

Every shop has

Internet

Windows PC

Printer

Browser

QR Stand

---

# 16. Future Scope

Multiple branches

Cloud analytics

Inventory management

Subscription plans

AI cost optimization

Smart printer routing

Mobile applications

Commercial print shops

---

# 17. Out of Scope

Graphic editing

Cloud storage

Document collaboration

Messaging

File sharing

---

# 18. Milestones

Phase 1

Prototype

Completed

---

Phase 2

Production MVP

Current

---

Phase 3

Windows Agent

---

Phase 4

Pilot Testing

---

Phase 5

Public Beta

---

Phase 6

Commercial Launch

---

# 19. Acceptance Criteria

Customer should be able to

Scan QR

Upload PDF

Configure printing

Complete payment

Track queue

Collect print

without speaking to the operator.

Operator should be able to

Receive

Print

Complete

using fewer than five interactions.

---

# 20. Product Principles

Every feature must satisfy at least one:

Reduce waiting time

Reduce manual work

Improve privacy

Improve reliability

Improve operator efficiency

Otherwise,

do not build it.

---

# 21. Conclusion

Velox is not simply another print ordering application.

It is the digital infrastructure for modern print shops.

The product aims to replace fragmented manual workflows with an integrated platform that is faster, simpler, more secure and scalable.