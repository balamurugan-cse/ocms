import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'faculty' | 'officer' | 'admin' | 'super_admin';
  departmentId?: string;
  departmentName?: string;
  rollNumber?: string;
  phone?: string;
  emailVerifiedAt: string | null;
  verificationTokenHash?: string | null;
  verificationExpiresAt?: string | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export type ComplaintStatus =
  | 'submitted'
  | 'acknowledged'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'need_more_info'
  | 'resolved'
  | 'closed'
  | 'rejected'
  | 'reopened';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Attachment {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface Complaint {
  id: string;
  complaintNumber: string; // e.g. DMI-CMP-2026-1001
  createdBy: string;
  complainantName: string;
  complainantEmail: string;
  complainantRole: 'student' | 'faculty';
  isAnonymous: boolean;
  category: string;
  subject: string;
  description: string;
  departmentId: string;
  departmentName: string;
  assignedTo?: string | null;
  assignedOfficerName?: string | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  attachments: Attachment[];
  location?: string;
  preferredContact?: 'email' | 'phone' | 'in_person';
  slaHours: number;
  dueAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  resolutionNotes?: string | null;
  resolutionRating?: number | null;
  resolutionFeedback?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintEvent {
  id: string;
  complaintId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  eventType:
    | 'created'
    | 'status_changed'
    | 'assigned'
    | 'comment_added'
    | 'clarification_requested'
    | 'clarification_provided'
    | 'reopened'
    | 'rated'
    | 'closed';
  fromStatus?: ComplaintStatus | null;
  toStatus?: ComplaintStatus | null;
  publicMessage?: string;
  internalNote?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headName: string;
  headEmail: string;
  active: boolean;
  slaHoursDefault: number;
  categories: string[];
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: 'complaint' | 'user' | 'department' | 'system' | 'auth';
  targetId: string;
  details: string;
  ip?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  complaintId?: string;
  title: string;
  message: string;
  type: 'info' | 'status_update' | 'action_required' | 'sla_warning' | 'resolved';
  read: boolean;
  channel: 'in_app' | 'email';
  deliveryStatus: 'delivered' | 'pending' | 'failed';
  createdAt: string;
}

export interface SystemSettings {
  institutionName: string;
  campusLocation: string;
  contactEmail: string;
  contactPhone: string;
  requireEmailVerification: boolean;
  slaBreachHoursThreshold: number;
  autoEscalationEnabled: boolean;
  allowAnonymousComplaints: boolean;
  reopenAllowedDays: number;
}

interface DatabaseSchema {
  users: User[];
  complaints: Complaint[];
  complaint_events: ComplaintEvent[];
  departments: Department[];
  audit_logs: AuditLog[];
  notifications: Notification[];
  settings: SystemSettings;
  counter: number;
}

const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const DATA_DIR = isVercel ? path.resolve('/tmp', 'data') : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'ocms_store.json');
const TEMP_FILE = path.resolve(DATA_DIR, 'ocms_store.tmp.json');
const SEED_FILE = path.resolve(process.cwd(), 'data', 'ocms_store.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  // Graceful handling on read-only environments
}

const UPLOAD_DIR = isVercel ? path.resolve('/tmp', 'data', 'uploads') : path.resolve(DATA_DIR, 'uploads');
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  // Graceful handling on read-only environments
}

let dbData: DatabaseSchema | null = null;

function getInitialData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const now = new Date().toISOString();

  // Institutional departments with official dmice.ac.in emails
  const departments: Department[] = [
    {
      id: 'dept-cse',
      name: 'Computer Science and Engineering',
      code: 'CSE',
      description: 'Department of CSE, Labs, Project Mentorship, Academic Grievances.',
      headName: 'Dr. V. Suresh Kumar M.E., Ph.D, HOD CSE',
      headEmail: 'hod.cse@dmice.ac.in',
      active: true,
      slaHoursDefault: 24,
      categories: ['Lab Systems & Hardware', 'Curriculum & Project Mentorship', 'Class Timetable & Faculty Feedback', 'Department Facilities']
    },
    {
      id: 'dept-hostel',
      name: 'Hostel & Mess Administration',
      code: 'HMA',
      description: 'Hostel rooms, water, sanitation, food quality and hygiene in boy & girl hostels.',
      headName: 'Dr. R. Selvakumar, Chief Warden',
      headEmail: 'warden@dmice.ac.in',
      active: true,
      slaHoursDefault: 48,
      categories: ['Food Quality & Hygiene', 'Hostel Maintenance', 'Water & Electricity', 'Hostel Discipline']
    },
    {
      id: 'dept-infra',
      name: 'Campus Infrastructure & Maintenance',
      code: 'CIM',
      description: 'Classrooms, laboratory facilities, air conditioning, furniture, and washroom upkeep.',
      headName: 'Er. M. Stephen, Estate Officer',
      headEmail: 'estate@dmice.ac.in',
      active: true,
      slaHoursDefault: 48,
      categories: ['Classroom Facilities', 'Electrical & Air Conditioning', 'Sanitation & Hygiene', 'Civil Repairs']
    },
    {
      id: 'dept-it',
      name: 'IT & Campus Wi-Fi Services',
      code: 'ITS',
      description: 'High-speed campus network, ERP portal, lab computers, biometric and smart cards.',
      headName: 'Prof. A. Rajesh, Head IT',
      headEmail: 'ithead@dmice.ac.in',
      active: true,
      slaHoursDefault: 24,
      categories: ['Campus Wi-Fi & Internet', 'Computer Lab Systems', 'College ERP / Student Portal', 'Smart Card / Biometrics']
    },
    {
      id: 'dept-transport',
      name: 'Transport & Fleet Logistics',
      code: 'TRN',
      description: 'College bus routes, punctuality, driver conduct and student pass management.',
      headName: 'Mr. K. Pandian, Transport Officer',
      headEmail: 'transport@dmice.ac.in',
      active: true,
      slaHoursDefault: 48,
      categories: ['Bus Timings & Punctuality', 'Bus Route Modification', 'Bus Pass Issues', 'Driver & Staff Conduct']
    },
    {
      id: 'dept-antiragging',
      name: 'Anti-Ragging & Student Grievance Redressal Cell',
      code: 'SGRC',
      description: 'Statutory AICTE/UGC cell handling sensitive student welfare, harassment and safety concerns.',
      headName: 'Dr. V. Mary Stella, Presiding Officer',
      headEmail: 'sgrc@dmice.ac.in',
      active: true,
      slaHoursDefault: 24,
      categories: ['Anti-Ragging Grievance', 'Harassment or Discrimination', 'Student Welfare & Safety', 'Code of Conduct']
    }
  ];

  // Verified institutional users with dmice.ac.in domain
  const users: User[] = [
    {
      id: 'usr-superadmin',
      name: 'Dr. Anthony Xavier (Super Admin)',
      email: 'superadmin@dmice.ac.in',
      passwordHash: bcrypt.hashSync('DmiAdmin@2026', salt),
      role: 'super_admin',
      phone: '+91 94440 12345',
      emailVerifiedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-admin',
      name: 'Dr. V. Suresh Kumar (HOD CSE & Grievance Admin)',
      email: 'admin@dmice.ac.in',
      passwordHash: bcrypt.hashSync('DmiAdmin@2026', salt),
      role: 'admin',
      phone: '+91 98401 23456',
      emailVerifiedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-officer-hostel',
      name: 'Dr. R. Selvakumar (Hostel Warden)',
      email: 'officer.hostel@dmice.ac.in',
      passwordHash: bcrypt.hashSync('DmiOfficer@2026', salt),
      role: 'officer',
      departmentId: 'dept-hostel',
      departmentName: 'Hostel & Mess Administration',
      phone: '+91 98840 56789',
      emailVerifiedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-officer-it',
      name: 'Prof. A. Rajesh (Head IT)',
      email: 'officer.it@dmice.ac.in',
      passwordHash: bcrypt.hashSync('DmiOfficer@2026', salt),
      role: 'officer',
      departmentId: 'dept-it',
      departmentName: 'IT & Campus Wi-Fi Services',
      phone: '+91 94432 98765',
      emailVerifiedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-student-palani',
      name: 'Engineering Student',
      email: 'palanibalamurugan818@gmail.com',
      passwordHash: bcrypt.hashSync('DmiStudent@2026', salt),
      role: 'student',
      rollNumber: '21052421012',
      departmentName: 'Computer Science and Engineering',
      phone: '+91 93601 54321',
      emailVerifiedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-student-demo',
      name: 'Engineering Student',
      email: 'student@dmice.ac.in',
      passwordHash: bcrypt.hashSync('DmiStudent@2026', salt),
      role: 'student',
      rollNumber: '21052421012',
      departmentName: 'Computer Science and Engineering',
      phone: '+91 93601 54321',
      emailVerifiedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-student-abinesh',
      name: 'Campus Student',
      email: 'student2@dmice.ac.in',
      passwordHash: bcrypt.hashSync('DmiStudent@2026', salt),
      role: 'student',
      rollNumber: '21052421002',
      departmentName: 'Computer Science and Engineering',
      phone: '+91 90031 77654',
      emailVerifiedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  ];

  // ZERO SAMPLE TICKETS - ALL COMPLAINTS MUST BE LODGED LIVE BY REAL USERS
  const complaints: Complaint[] = [];
  const complaint_events: ComplaintEvent[] = [];

  const audit_logs: AuditLog[] = [
    {
      id: 'aud-1',
      actorId: 'usr-superadmin',
      actorName: 'Dr. Anthony Xavier',
      actorRole: 'super_admin',
      action: 'SYSTEM_BOOTSTRAP',
      targetType: 'system',
      targetId: 'dmi-ocms',
      details: 'DMI College of Engineering OCMS portal initialized on dmice.ac.in domain with 0 mock data.',
      ip: '127.0.0.1',
      timestamp: now
    }
  ];

  const notifications: Notification[] = [];

  const settings: SystemSettings = {
    institutionName: 'DMI College of Engineering',
    campusLocation: 'Palanchur, Chennai - 600 123, Tamil Nadu, India',
    contactEmail: 'grievance@dmice.ac.in',
    contactPhone: '+91 44 2681 0641',
    requireEmailVerification: true,
    slaBreachHoursThreshold: 24,
    autoEscalationEnabled: true,
    allowAnonymousComplaints: true,
    reopenAllowedDays: 7
  };

  return {
    users,
    complaints,
    complaint_events,
    departments,
    audit_logs,
    notifications,
    settings,
    counter: 1001 // Starts cleanly at 1001 for first real ticket
  };
}

export const db = {
  read(): DatabaseSchema {
    if (dbData) return dbData;
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        dbData = JSON.parse(raw) as DatabaseSchema;
        return dbData;
      } else if (fs.existsSync(SEED_FILE)) {
        const raw = fs.readFileSync(SEED_FILE, 'utf-8');
        dbData = JSON.parse(raw) as DatabaseSchema;
        try {
          this.write();
        } catch {}
        return dbData;
      }
    } catch (err) {
      console.error('[DB] Error reading store from disk, recreating defaults:', err);
    }
    dbData = getInitialData();
    try {
      this.write();
    } catch {}
    return dbData;
  },

  resetToClean(): void {
    dbData = getInitialData();
    try {
      this.write();
    } catch {}
  },

  write(): void {
    if (!dbData) return;
    try {
      const serialized = JSON.stringify(dbData, null, 2);
      fs.writeFileSync(TEMP_FILE, serialized, 'utf-8');
      fs.renameSync(TEMP_FILE, DB_FILE);
    } catch (err) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
      } catch (inner) {
        // Safe in-memory retention if filesystem is read-only
      }
    }
  },

  nextTicketNumber(): string {
    const data = this.read();
    const num = data.counter || 1001;
    data.counter = num + 1;
    this.write();
    return `DMI-CMP-2026-${num}`;
  }
};
