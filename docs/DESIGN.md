# DESIGN.md

# Velox Design System

Version: 1.0

---

# Purpose

This document defines the complete design language of Velox.

It serves as the single source of truth for:

- UI Design
- UX Decisions
- Component Design
- Layout
- Motion
- Colors
- Typography
- Accessibility

This document should be used together with the Apple Design Skill.

The Apple Design Skill explains HOW to design.

This document explains HOW VELOX should look.

---

# Design Philosophy

Velox should feel:

• Fast

• Minimal

• Professional

• Trustworthy

• Calm

• Invisible

The interface should never distract the user.

The product should disappear behind the workflow.

The best interface is the one users never need to think about.

---

# Design Principles

## 1. Content First

Content always comes before decoration.

Users open Velox to print documents.

Every screen should prioritize information over visuals.

---

## 2. Less is More

If something can be removed,
remove it.

Avoid:

- unnecessary cards
- excessive icons
- decorative graphics
- visual clutter

Whitespace is a feature.

---

## 3. Consistency

Every screen should feel like part of the same product.

Buttons

Cards

Inputs

Tables

Dialogs

Animations

must behave consistently.

---

## 4. Speed

The UI should feel responsive.

Interactions should be immediate.

Loading should always communicate progress.

---

## 5. Accessibility

Design for everyone.

Support:

- keyboard navigation
- readable contrast
- large touch targets
- screen readers

---

# Brand Personality

Velox is:

Reliable

Efficient

Technical

Simple

Professional

Velox is NOT:

Playful

Colorful

Loud

Experimental

---

# Color System

## Primary

Black

#111111

White

#FFFFFF

---

## Neutral

Gray 50

#FAFAFA

Gray 100

#F5F5F5

Gray 200

#E5E5E5

Gray 300

#D4D4D4

Gray 500

#737373

Gray 700

#404040

Gray 900

#171717

---

## Functional Colors

Success

#16A34A

Warning

#EAB308

Error

#DC2626

Info

#2563EB

Never overuse accent colors.

Most of the interface should remain monochrome.

---

# Typography

Preferred fonts

Geist

Inter

SF Pro

Fallback

system-ui

Typography Scale

Display

48

Heading

36

Title

28

Subtitle

20

Body

16

Caption

14

Small

12

---

# Icons

Use Lucide Icons only.

Rules

- Outline icons
- 20–24px
- Consistent stroke width

Avoid:

Emoji

Filled icons

Mixed icon packs

---

# Grid

Desktop

12-column grid

Mobile

4-column grid

Spacing

4

8

12

16

24

32

48

64

Use multiples of 8 whenever possible.

---

# Border Radius

Cards

16px

Buttons

12px

Inputs

12px

Dialogs

20px

Avoid excessive rounding.

---

# Shadows

Very subtle.

Cards

Small elevation

Dialogs

Medium elevation

Never use glowing shadows.

---

# Buttons

## Primary

Black background

White text

Medium radius

Height

44–48px

---

## Secondary

White background

Gray border

Black text

---

## Destructive

Red

Used only when necessary.

---

# Inputs

Rounded

Clear labels

Visible focus state

Never rely on placeholders as labels.

---

# Cards

Every card should contain

Title

Content

Optional action

Consistent padding

24px

Avoid nested cards.

---

# Navigation

Student App

Bottom navigation (if needed)

Otherwise

Single-flow pages

Admin Dashboard

Left Sidebar

Top Navigation

Main Content

Right Utility Panel (optional)

---

# Motion

Use Framer Motion.

Animations should communicate state.

Examples

Fade

Slide

Scale

Progress

Duration

150–250ms

Avoid:

Bounce

Spin

Excessive effects

---

# Micro Interactions

Buttons

Subtle scale

Cards

Soft hover

Queue updates

Smooth transitions

Progress bars

Animated

Notifications

Slide in

Loading

Skeletons

---

# Student Experience

Goal

Complete printing within one minute.

Flow

Scan QR

↓

Upload

↓

Print Settings

↓

Payment

↓

Queue

↓

Ready

Every extra step must be justified.

---

# Admin Experience

Operator should never feel overwhelmed.

Dashboard priorities

1.

Current Queue

2.

Printing Status

3.

Printer Status

4.

Revenue

5.

History

Everything else is secondary.

---

# Windows Agent

Minimal interface.

Mostly invisible.

Display only:

Connection

Printer Status

Queue

Logs

No unnecessary controls.

---

# Empty States

Every empty screen should explain:

What happened

What to do next

Example

"No active print jobs."

Button

Refresh

---

# Loading States

Always use skeleton loaders.

Avoid blank pages.

Progress indicators should feel smooth.

---

# Notifications

Short.

Clear.

Actionable.

Good

Order A102 completed.

Bad

Operation successful.

---

# Data Visualization

Use simple charts.

Line charts

Bar charts

Progress indicators

Avoid pie charts unless necessary.

---

# Tables

Readable

Sortable

Responsive

Alternating row hover

Status badges

Aligned numbers

---

# Images

Use illustrations sparingly.

Never use stock photos inside the application.

Icons > Images

---

# Responsive Design

Student

Mobile-first

Admin

Desktop-first

Tablet compatible

---

# Performance Goals

UI should feel instant.

Target

First Load

<2 seconds

Interaction

<100ms

Animations

60fps

---

# Inspiration

Apple

Stripe

Linear

Notion

Vercel

Arc Browser

Clerk

Do not copy designs.

Use them as references for simplicity and polish.

---

# Design Review Checklist

Before approving any screen, ask:

Is it simpler?

Is it faster?

Is the hierarchy clear?

Is the primary action obvious?

Can anything be removed?

Would a first-time user understand it?

If any answer is "No", redesign before implementation.

---

# Final Principle

The interface should never be remembered.

The experience should.

Users should remember how easy Velox made printing—not how flashy the UI looked.