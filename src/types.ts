export type UserRole = 'student' | 'faculty' | 'officer' | 'admin' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  rollNumber?: string;
  phone?: string;
  emailVerifiedAt: string | null;
  status: 'active' | 'disabled';
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
}

export interface Complaint {
  id: string;
  complaintNumber: string;
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
  events?: ComplaintEvent[];
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
  targetType: string;
  targetId: string;
  details: string;
  ip?: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  complaintId?: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  channel: string;
  createdAt: string;
}

export interface ReportSummary {
  summary: {
    total: number;
    resolved: number;
    inProgress: number;
    pending: number;
    breached: number;
    resolutionRate: number;
    avgResolutionHours: number;
  };
  byStatus: Record<string, number>;
  departments: Array<{
    id: string;
    name: string;
    code: string;
    total: number;
    resolved: number;
    breached: number;
    resolutionRate: number;
  }>;
}

export interface EmailDispatchRecord {
  id: string;
  recipient: string;
  subject: string;
  type: string;
  token?: string;
  actionUrl?: string;
  deliveredViaSmtp: boolean;
  status: string;
  errorMessage?: string;
  timestamp: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  category: 'Workshop' | 'Hackathon' | 'Symposium' | 'Webinar' | 'Coding Competition' | 'Cultural';
  description: string;
  date: string;
  time: string;
  venue: string;
  format: 'offline' | 'online' | 'hybrid';
  organizer: string;
  department: string;
  capacity: number;
  registeredCount: number;
  featured: boolean;
  contactEmail: string;
  createdAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId?: string;
  studentName: string;
  email: string;
  college: string;
  department: string;
  phone: string;
  rollNumber?: string;
  registeredAt: string;
  status: 'confirmed' | 'waitlist';
  eventDetails?: CampusEvent;
}

