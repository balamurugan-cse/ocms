# DMI COLLEGE OF ENGINEERING
### Palanchur, Chennai - 600 123
*(Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai)*

---

# SYSTEM ARCHITECTURE & DATA FLOW SPECIFICATION (SAD / SRS)
## Project Title: DMI Online Complaint Management System (OCMS)
**Document Code:** DMI-OCMS-SAD-2026-V1  
**Target Platform:** Single Page Application (SPA) & Micro-services Backend  
**Academic Session:** 2026 – 2027  
**Department:** Computer Science and Engineering / Information Technology  

---

## TABLE OF CONTENTS
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [High-Level 3-Tier Layered Architecture](#2-high-level-3-tier-layered-architecture)
3. [Data Flow Diagram (DFD) — Level 0: Context Level](#3-data-flow-diagram-dfd--level-0-context-level)
4. [Data Flow Diagram (DFD) — Level 1: Functional Sub-Processes](#4-data-flow-diagram-dfd--level-1-functional-sub-processes)
5. [Data Flow Diagram (DFD) — Level 2: Grievance Lifecycle & SLA Escalation](#5-data-flow-diagram-dfd--level-2-grievance-lifecycle--sla-escalation)
6. [Entity-Relationship Diagram (ERD) & Data Dictionary](#6-entity-relationship-diagram-erd--data-dictionary)
7. [Finite State Machine (FSM) & State Transition Matrix](#7-finite-state-machine-fsm--state-transition-matrix)
8. [Role-Based Access Control (RBAC) Security Architecture](#8-role-based-access-control-rbac-security-architecture)
9. [Service Level Agreement (SLA) & Automated Escalation Engine](#9-service-level-agreement-sla--automated-escalation-engine)
10. [RESTful API Endpoints Catalog](#10-restful-api-endpoints-catalog)

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
In higher education institutions like **DMI College of Engineering**, prompt, equitable, and transparent grievance resolution is critical to student welfare, academic excellence, and statutory compliance (AICTE Mandatory Redressal Norms). Traditional paper-bound or decentralized complaint submissions suffer from:
- Lack of accountability and lost paperwork.
- Inability for students to track real-time grievance status.
- Absent SLA monitoring leading to unaddressed complaints.
- Lack of audit logging for administrative oversight.

### 1.2 Proposed System
The **DMI Online Complaint Management System (OCMS)** provides a centralized web platform that unifies students, faculty, department coordinators, and institutional leadership into a streamlined, audited workflow with:
- **Unique Ticket Numbering** (`DMI-YYYY-XXXX`).
- **Real-Time Public Ticket Tracking** with sanitized timelines.
- **Role-Based Access Control (RBAC)** across Complainants, Officers, Admins, and Super Admins.
- **SLA Countdown & Automated Escalation** when complaints breach time thresholds.
- **Evidence-backed Resolution & Complainant Satisfaction Ratings (1–5 Stars)**.

---

## 2. High-Level 3-Tier Layered Architecture

The system implements a classic **3-Tier Client-Server Architecture**:

```
+========================================================================+
|             TIER 1: PRESENTATION LAYER (Client Browser SPA)            |
|------------------------------------------------------------------------|
| - React 19 + TypeScript + Tailwind CSS                                 |
| - Public Portal (Landing, Tracking, Charter)                           |
| - Complainant Workspace (Lodge, Evidence Upload, Star Rating)          |
| - Department Officer Console (Triage, Notes, Status Progression)       |
| - Administrative Oversight Hub (SLA Metrics, Audit Trail, CSV Export)  |
+========================================================================+
                                |  ^
              HTTP/1.1 REST API |  | JSON Web Tokens (Bearer JWT)
              Multipart/Uploads |  | JSON Payloads
                                v  |
+========================================================================+
|          TIER 2: APPLICATION & BUSINESS LOGIC LAYER (Node.js)          |
|------------------------------------------------------------------------|
| - Express.js REST API Server                                           |
| - Authentication & RBAC Guard Engine                                   |
| - Complaint Finite State Machine (FSM) Validator                       |
| - SLA Monitor & Automated Escalation Worker                            |
| - Email Dispatch & Outbox Journaling Engine                            |
+========================================================================+
                                |  ^
                 Atomic Storage |  | Read / Write Queries
                                v  |
+========================================================================+
|               TIER 3: PERSISTENCE & DATA STORAGE LAYER                 |
|------------------------------------------------------------------------|
| - D1: User Credential & Role Store                                     |
| - D2: Complaint Docket & Timeline Repository                           |
| - D3: Immutable Audit Trail Log                                        |
| - D4: Department Directory & SLA Configurations                        |
| - D5: Email Outbox Journal                                             |
| - File Vault: Multer Uploads (PDF, PNG, JPG Evidence Attachments)      |
+========================================================================+
```

---

## 3. Data Flow Diagram (DFD) — Level 0: Context Level

The **Context Diagram** portrays the entire application as a single boundary process interacting with four external entities:

```
                         +-----------------------------+
                         |      COMPLAINANT ENTITY     |
                         |  (Student / Faculty Member) |
                         +-----------------------------+
                            |                       ^
    1. Lodge Grievance &    |                       | 2. Ticket Tracking No. &
       Evidence Upload      |                       |    Status Notifications
                            v                       |
                  +===========================================+
                  |               PROCESS 0.0                 |
                  |                                           |
                  |     DMI ONLINE COMPLAINT MANAGEMENT       |
                  |             SYSTEM (OCMS)                 |
                  +===========================================+
                     |         ^                  |         ^
   3. Assign Docket  |         | 4. Remedies,     | 5. SLA  | 6. Dept & SLA
      & SLA Deadlines|         |    Internal Notes|    Alerts|    Policy Rules
                     v         |                  v         |
     +-----------------------------+          +-----------------------------+
     |   GRIEVANCE OFFICER ENTITY  |          |   COLLEGE ADMIN / HOD       |
     |   (Department Coordinator)  |          | (Principal / Oversight Cell)|
     +-----------------------------+          +-----------------------------+
                            |                       ^
        7. Outgoing Email   |                       | 8. Delivery Ack
           Dispatch Packet  v                       |
                         +-----------------------------+
                         |      EXTERNAL SERVICE       |
                         |    SMTP Notification Gateway|
                         +-----------------------------+
```

---

## 4. Data Flow Diagram (DFD) — Level 1: Functional Sub-Processes

Level 1 breaks down the core system into seven distinct sub-processes and five persistent data stores:

```
[Complainant]
    |
    |-- (Credentials) --------------> [ Process 1.0: Auth & Session ] <----> [D1: User Store]
    |                                                 |
    |                                           (Auth Session)
    |                                                 v
    |-- (Lodge Complaint + Files) --> [ Process 2.0: Intake & Numbering ]
    |                                                 |
    |                                                 |---> [D2: Complaint Store]
    |                                                 |---> [D4: Departments]
    |                                                 |---> [D5: Email Outbox]
    |                                                 v
    |                                 [ Process 3.0: Triage & Routing ] <--- [Officer]
    |                                                 |
    |                                                 |---> [D2: Complaint Store]
    |                                                 |---> [D3: Audit Logs]
    |                                                 v
    |                                 [ Process 4.0: Investigation ]
    |                                                 |
    |                                                 |---> [D2: Complaint Store]
    |                                                 |---> [D3: Audit Logs]
    |                                                 v
    |                                 [ Process 5.0: Resolution & Feedback ]
    |                                                 |
    |                                                 |---> [D2: Complaint Store]
    |                                                 |---> [D5: Email Outbox]
    |                                                 v
[System Clock] ---------------------> [ Process 6.0: SLA Monitor & Escalation ]
                                                      |
                                                      |---> [D2: Complaints]
                                                      |---> [Admin Alert]
                                                      v
[Admin/HOD] <------------------------ [ Process 7.0: Compliance & Analytics ]
```

### Data Stores Description:
- **D1: User Store**: Holds encrypted credentials, email verification status, roles, and department affiliations.
- **D2: Complaint Store**: Primary relational table storing ticket numbers, priorities, statuses, SLA due dates, notes, and ratings.
- **D3: Audit Logs**: Append-only log recording actor ID, IP address, timestamp, event type, and state deltas.
- **D4: Department Store**: Master records for departments (CSE, IT, ECE, MECH, HOSTEL, ACADEMICS) and SLA baseline hours.
- **D5: Email Outbox**: Records all outbound transactional emails with delivery tokens and SMTP receipts.

---

## 5. Data Flow Diagram (DFD) — Level 2: Grievance Lifecycle & SLA Escalation

### 5.1 Lifecycle Finite State Machine
Every grievance follows an auditable lifecycle with guard conditions:

```
 [Submitted] 
      │ (Officer opens ticket)
      ▼
 [Acknowledged]
      │ (Officer assigned & triage complete)
      ▼
 [In Progress] ◄──────────────────────────────────┐
      │                                           │
      ├─────► [Need More Info]                    │ (Complainant provides info)
      │              │                            │
      │              └──────► [Under Review] ─────┘
      │
      ▼ (Corrective action implemented)
 [Resolved]
      │
      ├─────► [Closed] (Complainant submits 1-5 Star Satisfaction Rating)
      │
      └─────► [Reopened] (Complainant dissatisfied with remedy within 7 days)
```

### 5.2 SLA Countdown & Escalation Logic
1. Upon submission, system calculates:  
   $$\text{dueAt} = \text{createdAt} + \text{SLA\_Hours}(\text{Priority})$$
   - **Urgent Priority**: 12 Hours
   - **High Priority**: 24 Hours
   - **Medium Priority**: 48 Hours
   - **Low Priority**: 72 Hours
2. If $$\text{currentTime} > \text{dueAt}$$ and $$\text{status} \notin \{\text{resolved}, \text{closed}\}$$, then:
   - Mark `isBreached = true`.
   - Dispatch Escalation Alert to HOD & Principal.
   - Flag ticket in Red on the Admin Oversight Dashboard.

---

## 6. Entity-Relationship Diagram (ERD) & Data Dictionary

### 6.1 Relational Cardinality
- `USER` **1 : N** `COMPLAINT` (A complainant can lodge multiple complaints)
- `DEPARTMENT` **1 : N** `COMPLAINT` (A department handles many complaints)
- `COMPLAINT` **1 : N** `COMPLAINT_EVENT` (A complaint has an ordered audit timeline)
- `COMPLAINT` **1 : N** `ATTACHMENT` (A complaint can contain multiple evidence files)
- `USER` **1 : N** `AUDIT_LOG` (All user actions produce immutable audit entries)

### 6.2 Data Schema

#### Table: `users`
| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Unique user identifier (UUID) |
| `name` | VARCHAR(120) | NOT NULL | Full name of user |
| `email` | VARCHAR(120) | UNIQUE, NOT NULL | Institutional email (`@dmice.ac.in`) |
| `role` | ENUM | NOT NULL | `student`, `faculty`, `officer`, `admin`, `super_admin` |
| `departmentId` | VARCHAR(36) | FOREIGN KEY | Associated department (optional for students) |
| `rollNumber` | VARCHAR(30) | NULLABLE | Register / Roll Number for students |
| `status` | ENUM | DEFAULT 'active' | `active` or `disabled` |
| `emailVerifiedAt` | TIMESTAMP | NULLABLE | Timestamp of email verification |

#### Table: `complaints`
| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | Unique complaint record ID |
| `complaintNumber` | VARCHAR(20) | UNIQUE, NOT NULL | Formatted ticket (`DMI-2026-XXXX`) |
| `createdBy` | VARCHAR(36) | FOREIGN KEY (users.id) | Submitting user ID |
| `isAnonymous` | BOOLEAN | DEFAULT FALSE | Protect complainant identity from public/officers |
| `category` | VARCHAR(60) | NOT NULL | Grievance Category (e.g. Lab Equipment, Mess) |
| `subject` | VARCHAR(255) | NOT NULL | Brief summary of the issue |
| `description` | TEXT | NOT NULL | Detailed narrative of the grievance |
| `departmentId` | VARCHAR(36) | FOREIGN KEY | Target department for redressal |
| `priority` | ENUM | NOT NULL | `low`, `medium`, `high`, `urgent` |
| `status` | ENUM | NOT NULL | Current state in FSM lifecycle |
| `slaHours` | INTEGER | NOT NULL | Allocated SLA resolution window in hours |
| `dueAt` | TIMESTAMP | NOT NULL | Calculated deadline for resolution |
| `resolvedAt` | TIMESTAMP | NULLABLE | Actual timestamp of resolution |
| `resolutionNotes`| TEXT | NULLABLE | Officer summary of corrective action taken |
| `resolutionRating`| INTEGER | NULLABLE | Complainant satisfaction rating (1 to 5) |

---

## 7. Role-Based Access Control (RBAC) Security Architecture

| Security Permission | Public / Guest | Student | Faculty | Dept Officer | Admin / HOD | Super Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Search / Track by Ticket ID | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lodge Formal Grievance | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Attach Photographic Evidence | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| View Own Docket History | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Update Complaint Status | ✗ | ✗ | ✗ | ✓ (Assigned) | ✓ | ✓ |
| Add Internal Officer Notes | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Reassign Department / Officer | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Submit Star Rating & Feedback| ✗ | ✓ (Creator) | ✓ (Creator) | ✗ | ✗ | ✗ |
| View System Audit Logs | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Export AICTE Redressal Reports| ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## 8. RESTful API Endpoints Catalog

```
+--------+------------------------------------+------------------+-----------------------------------------------+
| METHOD | ENDPOINT ROUTE                     | ACCESS CONTROL   | FUNCTIONAL DESCRIPTION                        |
+--------+------------------------------------+------------------+-----------------------------------------------+
| POST   | /api/auth/login                    | Public           | Authenticate credentials & issue JWT token    |
| POST   | /api/auth/register                 | Public           | Register new student or faculty account       |
| GET    | /api/auth/me                       | Authenticated    | Fetch current session user profile            |
| GET    | /api/complaints                    | Authenticated    | Fetch complaints filtered by role & scope     |
| POST   | /api/complaints                    | Complainant      | Submit new complaint with file attachments    |
| GET    | /api/complaints/:id                | Authenticated    | Retrieve single complaint with event history  |
| GET    | /api/complaints/track/:number      | Public           | Public ticket tracking with sanitized timeline|
| PATCH  | /api/complaints/:id/status         | Officer / Admin  | Transition state machine, append audit note   |
| POST   | /api/complaints/:id/rate           | Creator Only     | Submit 1-5 star satisfaction rating           |
| POST   | /api/complaints/:id/reopen         | Creator Only     | Reopen an unsatisfactory resolution           |
| GET    | /api/departments                   | Public           | List all college departments & SLA baselines  |
| GET    | /api/admin/reports/summary         | Admin            | Institutional KPI aggregation & SLA report    |
| GET    | /api/admin/audit-logs              | Admin            | Retrieve tamper-evident system audit log      |
| GET    | /api/outbox                        | Authenticated    | View email notifications dispatch journal     |
+--------+------------------------------------+------------------+-----------------------------------------------+
```

---

## 9. Conclusion & Project Deliverable Status

The **DMI Online Complaint Management System (OCMS)** architectural blueprint is fully realized, operational, and deployed. All architectural requirements:
- Single-page application responsive frontend in React 19,
- Scalable Node.js / Express backend with transactional integrity,
- Context Level 0, Level 1, and Level 2 DFD specifications,
- Role-based security and AICTE-compliant audit logging,
are verified and production-ready for institutional deployment at **DMI College of Engineering**.
