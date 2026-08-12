# Project Requirements — PH Healthcare System

## 1. Overview

PH Healthcare System connects patients with doctors for online consultations. A patient finds a doctor, books an open slot on a published schedule, pays for it, and joins a video call at the scheduled time. The doctor runs the consultation and afterward sends back a digital prescription. Admins and super admins keep the platform running: they approve doctors, manage accounts, and handle the people side of the platform so doctors and patients only have to deal with appointments.

This document is the product spec — what the system must do and the exact rules it must follow. It is not the database schema and not the API design; those come next, and every rule below is written so that whoever designs them doesn't have to guess. The [README](./README.md) describes what's actually implemented in the code today, which is currently far behind this document.

## 2. User roles

Four roles exist: **Super Admin**, **Admin**, **Doctor**, **Patient**.

| Role           | How they join the platform                                                   | How they log in                  |
| -------------- | ------------------------------------------------------------------------------ | ---------------------------------- |
| **Patient**    | Registers directly — email/password or Google                                  | Email/password or Google           |
| **Doctor**     | Applies directly, then waits for an Admin or Super Admin to approve them       | Email/password only                |
| **Admin**      | Created by a Super Admin or an existing Admin — cannot self-register           | Email/password only                |
| **Super Admin**| Created by another Super Admin — cannot self-register                          | Email/password only                |

Google login is a **patient-only** feature. Doctors, Admins, and Super Admins always use email and password.

### 2.1 Who can manage whom

Admin and Super Admin have the same day-to-day powers — approving doctors, managing patients, creating new admins — with two exceptions reserved for Super Admin:

| Action                              | Admin | Super Admin |
| ------------------------------------ | :---: | :----------: |
| Approve or reject a doctor application | ✅    | ✅           |
| Block or unblock a Doctor             | ✅    | ✅           |
| Block or unblock a Patient            | ✅    | ✅           |
| Create a new Admin                    | ✅    | ✅           |
| Create a new Super Admin              | ❌    | ✅           |
| Block or unblock an Admin             | ❌    | ✅           |
| Block or unblock a Super Admin        | ❌    | ✅           |

In short: Admin can act on doctors and patients freely, but only a Super Admin can act on another Admin or Super Admin — including blocking one.

These actions live behind three management screens: **Doctor Management** (approve/reject applications, block/unblock doctors), **Patient Management** (block/unblock patients), and **Admin Management** (create and, where allowed, block admins and super admins).

## 3. Accounts and authentication

### 3.1 Registration

- **Patient** registers with name, email, and password — or with Google. Either way, they land in the system as a Patient; there is no way to register directly as anything else.
- **Doctor** applies through a separate "apply to become a doctor" flow (see [Section 5](#5-doctor-application-and-approval)). They don't land in the system as a working Doctor until an Admin or Super Admin approves them.
- **Admin** and **Super Admin** are never self-registered. They only come into existence when an existing Admin or Super Admin creates them (see [Section 4](#4-admin-and-super-admin-management)).

### 3.2 Email OTP verification

Every registration that a person fills in themselves — patient credential registration and doctor application — must be verified with a one-time password (OTP) sent to their email before the account is usable. Google registration doesn't need this, since Google has already verified the email. Admin and Super Admin accounts skip OTP entirely, because they're created by someone else, not self-registered (see [Section 4](#4-admin-and-super-admin-management) for how those are secured instead).

### 3.3 Login

- Patients log in with email/password or with Google — and it's the same account either way. A patient who originally registered with email/password can also log in with Google afterward (matched by email), and vice versa; the system doesn't treat these as two separate patients.
- Doctors, Admins, and Super Admins log in with email/password only — always.

### 3.4 Forgot password / reset password

Two-step flow, available to anyone who logs in with a password:

1. **Forgot password** — patient submits their email; system emails them an OTP.
2. **Reset password** — patient submits the OTP plus a new password; system verifies the OTP and updates the password.

### 3.5 Change password (logged in)

A logged-in user submits their **current password** and a **new password**. This is different from reset: it's for someone who remembers their current password and just wants to change it. Someone who's forgotten their current password uses forgot-password/reset-password instead — change-password is not a substitute for that flow.

### 3.6 Set password (patients only)

A patient who first signed up through Google doesn't have a password yet — Google login never asks for one. **Set Password** lets that patient choose one, so afterward they can log in either way: with Google or with email/password. This feature exists only for patients, since Doctors, Admins, and Super Admins never use Google login and always have a password from the moment their account is created.

### 3.7 Tokens and sessions

Every successful login or registration — credential or Google, any role — issues an **access token** and a **refresh token**, both set as cookies.

### 3.8 Welcome emails

| Event                                             | Recipient          | Contains                                                        |
| --------------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| Patient's first registration, right after auto-login | Patient's email       | Welcome message                                                    |
| Doctor's application gets approved                    | Doctor's email        | Welcome message                                                    |
| Admin or Super Admin gets created                     | Their **personal** email | Their new **organization** email (their login), their generated password, and a prompt to change that password after logging in |

## 4. Admin and Super Admin management

Only a Super Admin or an Admin can create a new Admin (a Super Admin can also create a new Super Admin — see the permissions table in [Section 2.1](#21-who-can-manage-whom)). The creator fills in two email addresses for the new account:

- **Organization email** — the account's login identity going forward, assigned by whoever creates the account (e.g. a company email).
- **Personal email** — the actual person's own inbox, used only to deliver the welcome message.

The system generates a password for the new account and sends it to the **personal** email inside the welcome email, along with the organization email and a prompt to change the password on first login. There is no self-registration and no OTP step for Admin or Super Admin accounts — the invite-and-generated-password flow, plus the forced password change, is what secures them instead.

## 5. Doctor application and approval

1. A prospective doctor applies through a public "apply to become a doctor" endpoint.
2. As part of applying, they verify their email with an OTP — the same requirement as patient registration.
3. Their application then sits pending in **Doctor Management**, reviewed by an Admin or Super Admin, who approves or rejects it.
4. On approval, the doctor account becomes active, and a welcome email goes out. Only from this point can the doctor log in and use the platform — an unapproved application cannot log in at all.

## 6. Doctor schedules

A schedule is what a doctor publishes to say "I'm available on this date, during this time range, book me." Each schedule is for **one calendar date** and belongs to **one doctor**.

### 6.1 Creating a schedule

| Rule                       | Detail                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| One schedule per day        | A doctor can have at most one schedule per calendar date.                                        |
| Time range length            | Minimum 3 hours, maximum 8 hours.                                                                 |
| Must stay within one day     | Start and end time must be on the same calendar date — e.g. `9:00 AM–5:00 PM` or `3:00 PM–11:00 PM` are fine, but a range like `9:00 PM–3:00 AM` (crossing into the next day) is not allowed. |
| Meet link                    | The doctor provides a video call link — from whichever video call tool they use — as part of creating the schedule. Every appointment booked into that schedule uses this same link. |
| Status                       | A schedule starts as **draft**. Patients cannot see it at all until the doctor **publishes** it. |
| Total slots                  | Calculated automatically: the whole time range divided into 20-minute slots. Example: a `3:00 PM–9:00 PM` schedule is 6 hours (360 minutes), giving 18 slots of 20 minutes each. |

### 6.2 Editing a published schedule

Once published, different parts of a schedule lock at different points:

| Field                          | Can it still be changed?                                                    |
| --------------------------------- | ---------------------------------------------------------------------------- |
| **Date**                          | No — locked as soon as the schedule is published.                            |
| **Time range**                    | Yes, but only until the first appointment is booked into it. Once one slot is booked, the time range is locked (since re-slotting would break already-booked serial numbers). |
| **Status, meet link, and everything else** | Yes, any time — booking a slot doesn't lock these.                   |

## 7. Patient appointment booking

### 7.1 What a patient can see

Patients only ever see **today's** schedules — never a future date, and never a past one. Within today, a schedule is visible (and bookable) only up until its own start time:

> Example: a schedule runs `3:00 PM–9:00 PM`. Before 3:00 PM, patients can see it and book into it. At 3:00 PM the schedule disappears from patient view — no more bookings, even though the consultations are still happening — and it will never reappear (it's not a future schedule anymore, it's today's, and today's window has closed).

A schedule that's fully booked (every slot taken) also stops being shown, for the same reason — there's nothing left to book.

### 7.2 Booking

1. Patient picks an open slot on a visible schedule.
2. Patient pays for it upfront.
3. Once payment succeeds, the appointment is created with status **booked**, and it's given a **serial number** — its position among bookings in that schedule (the 1st person to book gets serial 1, the 2nd gets serial 2, and so on).
4. An invoice PDF — meet link, date, time, and payment details — is emailed to the patient right after payment.

## 8. Appointment lifecycle

An appointment moves through three statuses:

```
booked  →  ongoing  →  completed
```

- **Booked** — set automatically once payment succeeds.
- **Ongoing** — the doctor sets this manually when they start the consultation.
- **Completed** — the doctor sets this manually when the consultation is finished.

## 9. Prescriptions

Once an appointment is **completed**, the doctor can write a prescription for it: key findings plus prescribed medicines. As soon as it's submitted, the system generates a PDF and emails it to the patient. A prescription can't be written for an appointment that isn't completed yet.

## 10. Cancellation and refunds

Whether a patient gets their money back depends on how close to the schedule's start time they cancel:

| When the patient cancels                                                          | Refund? |
| ------------------------------------------------------------------------------------- | :-------: |
| More than 1 hour before the schedule's start time                                     | Yes — cancel and refund |
| From 1 hour before the start time, through the running schedule, or after it's over    | Cancellation still allowed — no refund |

> Example: schedule runs `3:00 PM–9:00 PM`. Cancelling any time before 2:00 PM refunds the payment. Cancelling from 2:00 PM onward — including during the 3–9 PM window itself, or even after 9 PM — still cancels the appointment, but without a refund.

## 11. Data models (conceptual)

The database design isn't finalized yet, so this is a description of what each model needs to hold — not a schema.

- **User** — the shared identity for every role: email, password (nullable — a Google-only patient has none until they set one), linked Google account, role (`SUPER_ADMIN` / `ADMIN` / `DOCTOR` / `PATIENT`), account status (active/blocked), email-verified flag, and a "must change password" flag (used right after an Admin/Super Admin is created). Every account is exactly one User, linked to exactly one of the profiles below based on its role.
- **Patient profile** — personal info plus medical info.
- **Doctor profile** — personal info plus professional/expertise info (e.g. specialization).
- **Admin profile** — personal info, plus the organization email assigned at creation. Shared shape for both Admin and Super Admin; the User's `role` field is what tells them apart.