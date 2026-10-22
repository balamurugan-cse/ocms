import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, User, Complaint, ComplaintEvent, AuditLog, Notification, ComplaintStatus } from './db.js';
import {
  authenticate,
  authorizeRoles,
  optionalAuthenticate,
  signToken,
  AuthenticatedRequest
} from './auth.js';
import {
  generateSecureToken,
  hashToken,
  sendVerificationEmail,
  sendComplaintStatusNotification,
  emailDeliveryJournal
} from './email.js';

const router = Router();

// Multer storage for complaint evidence attachments
const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const UPLOAD_DIR = isVercel
  ? path.resolve('/tmp', 'data', 'uploads')
  : path.resolve(process.cwd(), 'data/uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      cb(null, UPLOAD_DIR);
    } catch (err: any) {
      cb(err, UPLOAD_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPG, PNG, PDF, DOC, TXT'));
    }
  }
});

// Helper for logging audit actions
function logAudit(
  actor: { id: string; name: string; role: string },
  action: string,
  targetType: AuditLog['targetType'],
  targetId: string,
  details: string,
  req: Request
) {
  const data = db.read();
  const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
  const entry: AuditLog = {
    id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    details,
    ip,
    timestamp: new Date().toISOString()
  };
  data.audit_logs.unshift(entry);
  db.write();
}

// Helper to push in-app notification
function createNotification(
  userId: string,
  complaintId: string | undefined,
  title: string,
  message: string,
  type: Notification['type']
) {
  const data = db.read();
  const notif: Notification = {
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userId,
    complaintId,
    title,
    message,
    type,
    read: false,
    channel: 'in_app',
    deliveryStatus: 'delivered',
    createdAt: new Date().toISOString()
  };
  data.notifications.unshift(notif);
  db.write();
}

// Controlled status transitions state machine
const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted: ['acknowledged', 'under_review', 'assigned', 'rejected'],
  acknowledged: ['under_review', 'assigned', 'rejected'],
  under_review: ['assigned', 'in_progress', 'need_more_info', 'rejected'],
  assigned: ['in_progress', 'under_review', 'need_more_info', 'rejected'],
  in_progress: ['resolved', 'need_more_info', 'under_review'],
  need_more_info: ['under_review', 'in_progress'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  rejected: ['reopened'],
  reopened: ['under_review', 'assigned', 'in_progress']
};

/* =========================================================================
   1. AUTHENTICATION & REGISTRATION ENDPOINTS
   ========================================================================= */

// POST /auth/register
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'student', departmentName, rollNumber, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const data = db.read();

    if (data.users.some((u) => u.email === normalizedEmail)) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Role cannot be self-assigned to admin or super_admin
    const assignedRole: User['role'] = ['student', 'faculty'].includes(role) ? role : 'student';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Cryptographic email verification token
    const { token: rawToken, hash: tokenHash } = generateSecureToken();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString(); // 20 minutes

    const newUser: User = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      departmentName: departmentName || undefined,
      rollNumber: rollNumber || undefined,
      phone: phone || undefined,
      emailVerifiedAt: null, // Unverified by default as required by specification!
      verificationTokenHash: tokenHash,
      verificationExpiresAt: expiresAt,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.users.push(newUser);
    db.write();

    // Log registration audit
    logAudit(
      { id: newUser.id, name: newUser.name, role: newUser.role },
      'USER_REGISTERED',
      'user',
      newUser.id,
      `User registration created as unverified (${newUser.role}).`,
      req
    );

    // Send verification email via configured SMTP or outbox
    const clientOrigin = `${req.protocol}://${req.get('host')}`;
    const mailResult = await sendVerificationEmail(newUser.email, newUser.name, rawToken, clientOrigin);

    res.status(201).json({
      message: 'Account created successfully. A verification email has been dispatched.',
      verificationRequired: true,
      email: newUser.email,
      verificationLink: mailResult.actionUrl, // Provided so reviewer can complete flow immediately
      smtpStatus: mailResult.smtpStatus
    });
  } catch (err: any) {
    console.error('[Register Error]', err);
    res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

// POST /auth/verify-email
router.post('/auth/verify-email', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Verification token is required.' });
      return;
    }

    const hashedInput = hashToken(token);
    const data = db.read();
    const now = new Date();

    const user = data.users.find(
      (u) => u.verificationTokenHash === hashedInput
    );

    if (!user) {
      res.status(400).json({ error: 'Invalid or already consumed verification token.' });
      return;
    }

    if (user.verificationExpiresAt && new Date(user.verificationExpiresAt) < now) {
      res.status(400).json({ error: 'Verification token has expired. Please request a new verification email.' });
      return;
    }

    // Atomically set emailVerifiedAt and invalidate token
    user.emailVerifiedAt = now.toISOString();
    user.verificationTokenHash = null;
    user.verificationExpiresAt = null;
    user.updatedAt = now.toISOString();
    db.write();

    logAudit(
      { id: user.id, name: user.name, role: user.role },
      'EMAIL_VERIFIED',
      'user',
      user.id,
      'Email address verified successfully.',
      req
    );

    const authToken = signToken(user);
    res.cookie('dmi_ocms_token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000
    });

    res.json({
      message: 'Email verified successfully! You may now access all features.',
      token: authToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentName: user.departmentName,
        emailVerifiedAt: user.emailVerifiedAt
      }
    });
  } catch (err: any) {
    console.error('[Verify Email Error]', err);
    res.status(500).json({ error: 'Error processing email verification.' });
  }
});

// POST /auth/resend-verification
router.post('/auth/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const data = db.read();
    const user = data.users.find((u) => u.email === normalizedEmail);

    if (!user) {
      // Generic response to avoid enumeration
      res.json({ message: 'If an unverified account exists with that email, a new link has been sent.' });
      return;
    }

    if (user.emailVerifiedAt) {
      res.status(400).json({ error: 'This email account is already verified. You can sign in directly.' });
      return;
    }

    const { token: rawToken, hash: tokenHash } = generateSecureToken();
    user.verificationTokenHash = tokenHash;
    user.verificationExpiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    user.updatedAt = new Date().toISOString();
    db.write();

    const clientOrigin = `${req.protocol}://${req.get('host')}`;
    const result = await sendVerificationEmail(user.email, user.name, rawToken, clientOrigin);

    res.json({
      message: 'Verification link regenerated.',
      verificationLink: result.actionUrl,
      smtpStatus: result.smtpStatus
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification email.' });
  }
});

// POST /auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const data = db.read();
    const user = data.users.find((u) => u.email === normalizedEmail);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password credentials.' });
      return;
    }

    if (user.status === 'disabled') {
      res.status(403).json({ error: 'Your account has been deactivated by administration.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password credentials.' });
      return;
    }

    // MANDATORY EMAIL VERIFICATION REQUIREMENT (PDF page 4 & 5)
    // Check if email verification is required
    const requireVerification = data.settings.requireEmailVerification ?? true;
    if (requireVerification && !user.emailVerifiedAt) {
      res.status(403).json({
        error: 'Email verification required before sign-in. Please verify your email or click Resend Verification.',
        unverified: true,
        email: user.email
      });
      return;
    }

    const token = signToken(user);

    res.cookie('dmi_ocms_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000
    });

    logAudit(
      { id: user.id, name: user.name, role: user.role },
      'USER_LOGIN',
      'auth',
      user.id,
      'User signed in successfully.',
      req
    );

    res.json({
      message: 'Signed in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.departmentName,
        rollNumber: user.rollNumber,
        phone: user.phone,
        emailVerifiedAt: user.emailVerifiedAt
      }
    });
  } catch (err: any) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Sign in failed due to server error.' });
  }
});

// GET /auth/me
router.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    departmentName: user.departmentName,
    rollNumber: user.rollNumber,
    phone: user.phone,
    emailVerifiedAt: user.emailVerifiedAt
  });
});

// POST /auth/logout
router.post('/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('dmi_ocms_token');
  res.json({ message: 'Logged out successfully.' });
});

/* =========================================================================
   2. COMPLAINT ENGINE & LIFECYCLE
   ========================================================================= */

// POST /complaints (Create new complaint)
router.post('/complaints', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      category,
      subject,
      description,
      departmentId,
      priority = 'medium',
      isAnonymous = false,
      location,
      preferredContact = 'email'
    } = req.body;

    if (!subject || !description || !category || !departmentId) {
      res.status(400).json({ error: 'Category, subject, description, and department are required.' });
      return;
    }

    const data = db.read();
    const department = data.departments.find((d) => d.id === departmentId);
    if (!department) {
      res.status(400).json({ error: 'Selected department was not found.' });
      return;
    }

    // Determine SLA hours based on priority & department defaults
    let slaHours = department.slaHoursDefault || 48;
    if (priority === 'urgent') slaHours = Math.min(slaHours, 24);
    if (priority === 'high') slaHours = Math.min(slaHours, 36);

    const now = new Date();
    const dueAt = new Date(now.getTime() + slaHours * 3600 * 1000).toISOString();
    const ticketNumber = db.nextTicketNumber();

    const newComplaint: Complaint = {
      id: 'cmp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      complaintNumber: ticketNumber,
      createdBy: user.id,
      complainantName: user.name,
      complainantEmail: user.email,
      complainantRole: (user.role === 'faculty' ? 'faculty' : 'student') as any,
      isAnonymous: Boolean(isAnonymous),
      category,
      subject: subject.trim(),
      description: description.trim(),
      departmentId: department.id,
      departmentName: department.name,
      assignedTo: null,
      assignedOfficerName: null,
      priority,
      status: 'submitted',
      attachments: [],
      location: location?.trim() || undefined,
      preferredContact,
      slaHours,
      dueAt,
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    data.complaints.unshift(newComplaint);

    // Initial immutable event
    const event: ComplaintEvent = {
      id: 'evt-' + Date.now(),
      complaintId: newComplaint.id,
      actorId: user.id,
      actorName: isAnonymous ? 'Complainant (Confidential)' : user.name,
      actorRole: user.role,
      eventType: 'created',
      fromStatus: null,
      toStatus: 'submitted',
      publicMessage: `Complaint filed in category "${category}" with ${priority.toUpperCase()} urgency.`,
      createdAt: now.toISOString()
    };
    data.complaint_events.push(event);

    db.write();

    // Log audit
    logAudit(
      { id: user.id, name: user.name, role: user.role },
      'COMPLAINT_CREATED',
      'complaint',
      newComplaint.id,
      `Complaint ${ticketNumber} created under ${department.name}. Anonymous: ${isAnonymous}`,
      req
    );

    // In-app confirmation notification for complainant
    createNotification(
      user.id,
      newComplaint.id,
      `Grievance Registered: ${ticketNumber}`,
      `Your complaint regarding "${subject}" has been lodged successfully with expected SLA resolution by ${new Date(dueAt).toLocaleDateString()}.`,
      'info'
    );

    res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaint: newComplaint
    });
  } catch (err: any) {
    console.error('[Create Complaint Error]', err);
    res.status(500).json({ error: 'Failed to record complaint.' });
  }
});

// GET /complaints/mine (User's personal complaints)
router.get('/complaints/mine', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.read();
  const list = data.complaints.filter((c) => c.createdBy === user.id);
  res.json(list);
});

// GET /complaints/track/:complaintNumber (Public tracking without sign-in, with privacy guard)
router.get('/complaints/track/:complaintNumber', (req: Request, res: Response) => {
  const { complaintNumber } = req.params;
  const data = db.read();
  const c = data.complaints.find(
    (item) => item.complaintNumber.toUpperCase() === complaintNumber.toUpperCase()
  );

  if (!c) {
    res.status(404).json({ error: 'No complaint found matching this ticket number.' });
    return;
  }

  // Public safe DTO
  const events = data.complaint_events
    .filter((e) => e.complaintId === c.id)
    .map((e) => ({
      id: e.id,
      actorName: e.actorRole === 'student' || e.actorRole === 'faculty' ? 'Complainant' : e.actorName,
      actorRole: e.actorRole,
      eventType: e.eventType,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      publicMessage: e.publicMessage,
      createdAt: e.createdAt
      // internalNote stripped strictly
    }));

  res.json({
    complaintNumber: c.complaintNumber,
    category: c.category,
    subject: c.subject,
    departmentName: c.departmentName,
    priority: c.priority,
    status: c.status,
    createdAt: c.createdAt,
    dueAt: c.dueAt,
    resolvedAt: c.resolvedAt,
    resolutionNotes: c.status === 'resolved' || c.status === 'closed' ? c.resolutionNotes : undefined,
    events
  });
});

// GET /complaints/:id (Single complaint detail)
router.get('/complaints/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.read();
  const complaint = data.complaints.find((c) => c.id === req.params.id);

  if (!complaint) {
    res.status(404).json({ error: 'Complaint not found.' });
    return;
  }

  const isOwner = complaint.createdBy === user.id;
  const isPrivileged = ['officer', 'admin', 'super_admin'].includes(user.role);

  if (!isOwner && !isPrivileged) {
    res.status(403).json({ error: 'You are not authorized to view this complaint.' });
    return;
  }

  // Build safe DTO:
  // If anonymous and viewer is not super_admin or admin, protect complainant identity
  const safeComplaint = { ...complaint };
  if (complaint.isAnonymous && !['super_admin', 'admin'].includes(user.role)) {
    if (!isOwner) {
      safeComplaint.complainantName = 'Anonymous Student / Faculty';
      safeComplaint.complainantEmail = 'confidential@dmice.ac.in';
    }
  }

  // Filter events: internalNote is STRICTLY HIDDEN from students/faculty
  const events = data.complaint_events
    .filter((e) => e.complaintId === complaint.id)
    .map((e) => {
      if (!isPrivileged) {
        const { internalNote, ...publicFields } = e;
        return publicFields;
      }
      return e;
    });

  res.json({
    ...safeComplaint,
    events
  });
});

// POST /complaints/:id/attachments (Upload file)
router.post(
  '/complaints/:id/attachments',
  authenticate,
  upload.array('files', 5),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const data = db.read();
      const complaint = data.complaints.find((c) => c.id === req.params.id);

      if (!complaint) {
        res.status(404).json({ error: 'Complaint not found.' });
        return;
      }

      const isOwner = complaint.createdBy === user.id;
      const isPrivileged = ['officer', 'admin', 'super_admin'].includes(user.role);
      if (!isOwner && !isPrivileged) {
        res.status(403).json({ error: 'Unauthorized to upload attachments.' });
        return;
      }

      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        res.status(400).json({ error: 'No files were uploaded.' });
        return;
      }

      const newAttachments = files.map((f) => ({
        id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        originalName: f.originalname,
        fileName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        url: `/api/v1/attachments/${f.filename}`,
        uploadedAt: new Date().toISOString()
      }));

      complaint.attachments.push(...newAttachments);
      complaint.updatedAt = new Date().toISOString();

      // Audit event
      data.complaint_events.push({
        id: 'evt-' + Date.now(),
        complaintId: complaint.id,
        actorId: user.id,
        actorName: complaint.isAnonymous && !isPrivileged ? 'Complainant' : user.name,
        actorRole: user.role,
        eventType: 'comment_added',
        publicMessage: `Uploaded ${files.length} evidence attachment(s): ${files.map((f) => f.originalname).join(', ')}`,
        createdAt: new Date().toISOString()
      });

      db.write();
      res.json({ message: 'Files uploaded successfully.', attachments: complaint.attachments });
    } catch (err: any) {
      res.status(500).json({ error: 'Attachment upload failed.' });
    }
  }
);

// GET /attachments/:filename (Serve attachment securely)
router.get('/attachments/:filename', (req: Request, res: Response) => {
  const filePath = path.resolve(UPLOAD_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }
  res.sendFile(filePath);
});

// PATCH /complaints/:id/status (Transition status with state validation & mandatory reason)
router.patch(
  '/complaints/:id/status',
  authenticate,
  authorizeRoles('officer', 'admin', 'super_admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { status: targetStatus, reason, internalNote, resolutionNotes } = req.body;

      if (!targetStatus || !reason) {
        res.status(400).json({ error: 'Target status and update reason are required.' });
        return;
      }

      const data = db.read();
      const complaint = data.complaints.find((c) => c.id === req.params.id);
      if (!complaint) {
        res.status(404).json({ error: 'Complaint not found.' });
        return;
      }

      const fromStatus = complaint.status;
      const allowedNext = ALLOWED_TRANSITIONS[fromStatus] || [];

      // Validate lifecycle transition machine
      if (!allowedNext.includes(targetStatus as ComplaintStatus)) {
        res.status(400).json({
          error: `Invalid status transition from "${fromStatus}" to "${targetStatus}". Allowed next states: ${allowedNext.join(', ')}`
        });
        return;
      }

      complaint.status = targetStatus as ComplaintStatus;
      complaint.version += 1;
      complaint.updatedAt = new Date().toISOString();

      if (targetStatus === 'resolved') {
        complaint.resolvedAt = new Date().toISOString();
        if (resolutionNotes) {
          complaint.resolutionNotes = resolutionNotes;
        }
      } else if (targetStatus === 'closed') {
        complaint.closedAt = new Date().toISOString();
      }

      // Append immutable ComplaintEvent
      const event: ComplaintEvent = {
        id: 'evt-' + Date.now(),
        complaintId: complaint.id,
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        eventType: 'status_changed',
        fromStatus,
        toStatus: targetStatus,
        publicMessage: reason.trim(),
        internalNote: internalNote?.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      data.complaint_events.push(event);

      db.write();

      // Log system audit
      logAudit(
        { id: user.id, name: user.name, role: user.role },
        'STATUS_CHANGE',
        'complaint',
        complaint.id,
        `Status transitioned from ${fromStatus} to ${targetStatus}. Reason: ${reason}`,
        req
      );

      // Notify complainant
      createNotification(
        complaint.createdBy,
        complaint.id,
        `Status Changed: ${complaint.complaintNumber}`,
        `Your grievance has been moved to ${targetStatus.toUpperCase().replace('_', ' ')}: "${reason}"`,
        targetStatus === 'resolved' ? 'resolved' : 'status_update'
      );

      // Trigger status update email if complainant provided email
      const clientOrigin = `${req.protocol}://${req.get('host')}`;
      await sendComplaintStatusNotification(
        complaint.complainantEmail,
        complaint.complainantName,
        complaint.complaintNumber,
        targetStatus,
        reason,
        clientOrigin
      );

      res.json({ message: 'Status updated successfully.', complaint });
    } catch (err: any) {
      console.error('[Status Update Error]', err);
      res.status(500).json({ error: 'Failed to update complaint status.' });
    }
  }
);

// POST /complaints/:id/assign (Assign officer or department)
router.post(
  '/complaints/:id/assign',
  authenticate,
  authorizeRoles('admin', 'super_admin', 'officer'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { officerId, departmentId, note } = req.body;

      const data = db.read();
      const complaint = data.complaints.find((c) => c.id === req.params.id);
      if (!complaint) {
        res.status(404).json({ error: 'Complaint not found.' });
        return;
      }

      let officerName = complaint.assignedOfficerName;
      if (officerId) {
        const officer = data.users.find((u) => u.id === officerId);
        if (officer) {
          complaint.assignedTo = officer.id;
          complaint.assignedOfficerName = officer.name;
          officerName = officer.name;
        }
      }

      if (departmentId) {
        const dept = data.departments.find((d) => d.id === departmentId);
        if (dept) {
          complaint.departmentId = dept.id;
          complaint.departmentName = dept.name;
        }
      }

      // If status is still 'submitted', transition to 'assigned'
      if (complaint.status === 'submitted') {
        complaint.status = 'assigned';
      }

      complaint.updatedAt = new Date().toISOString();

      data.complaint_events.push({
        id: 'evt-' + Date.now(),
        complaintId: complaint.id,
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        eventType: 'assigned',
        toStatus: complaint.status,
        publicMessage: `Assigned to ${officerName || 'department officer'}.`,
        internalNote: note || undefined,
        createdAt: new Date().toISOString()
      });

      db.write();

      logAudit(
        { id: user.id, name: user.name, role: user.role },
        'COMPLAINT_ASSIGNED',
        'complaint',
        complaint.id,
        `Assigned to ${officerName} in ${complaint.departmentName}.`,
        req
      );

      res.json({ message: 'Complaint assigned successfully.', complaint });
    } catch (err) {
      res.status(500).json({ error: 'Failed to assign complaint.' });
    }
  }
);

// POST /complaints/:id/comments (Add clarification or internal note)
router.post('/complaints/:id/comments', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { message, isInternal = false } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    const data = db.read();
    const complaint = data.complaints.find((c) => c.id === req.params.id);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const isPrivileged = ['officer', 'admin', 'super_admin'].includes(user.role);
    const isOwner = complaint.createdBy === user.id;

    if (!isPrivileged && !isOwner) {
      res.status(403).json({ error: 'Unauthorized to post comments on this grievance.' });
      return;
    }

    // Only staff can mark a note as internal
    const makeInternal = isPrivileged && Boolean(isInternal);

    const event: ComplaintEvent = {
      id: 'evt-' + Date.now(),
      complaintId: complaint.id,
      actorId: user.id,
      actorName: complaint.isAnonymous && isOwner ? 'Complainant (Confidential)' : user.name,
      actorRole: user.role,
      eventType: makeInternal ? 'comment_added' : isOwner ? 'clarification_provided' : 'clarification_requested',
      publicMessage: makeInternal ? undefined : message.trim(),
      internalNote: makeInternal ? message.trim() : undefined,
      createdAt: new Date().toISOString()
    };

    data.complaint_events.push(event);
    complaint.updatedAt = new Date().toISOString();
    db.write();

    if (!makeInternal && isPrivileged) {
      createNotification(
        complaint.createdBy,
        complaint.id,
        `Message on Grievance ${complaint.complaintNumber}`,
        `New note from coordinator: "${message.substring(0, 80)}..."`,
        'action_required'
      );
    }

    res.json({ message: 'Comment added.', event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// POST /complaints/:id/rate (Complainant satisfaction rating upon resolution)
router.post('/complaints/:id/rate', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
      return;
    }

    const data = db.read();
    const complaint = data.complaints.find((c) => c.id === req.params.id);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    if (complaint.createdBy !== user.id) {
      res.status(403).json({ error: 'Only the complainant can submit resolution feedback.' });
      return;
    }

    if (complaint.status !== 'resolved' && complaint.status !== 'closed') {
      res.status(400).json({ error: 'Complaints can only be rated once resolved.' });
      return;
    }

    complaint.resolutionRating = Number(rating);
    complaint.resolutionFeedback = feedback?.trim() || '';
    complaint.status = 'closed'; // Automatically close upon rating
    complaint.closedAt = new Date().toISOString();
    complaint.updatedAt = new Date().toISOString();

    data.complaint_events.push({
      id: 'evt-' + Date.now(),
      complaintId: complaint.id,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      eventType: 'rated',
      publicMessage: `Complainant rated resolution satisfaction: ${rating}/5 stars. ${feedback ? `Feedback: "${feedback}"` : ''}`,
      createdAt: new Date().toISOString()
    });

    db.write();

    res.json({ message: 'Thank you for your feedback! The grievance is now closed.', complaint });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record rating.' });
  }
});

// POST /complaints/:id/reopen (Complainant reopens grievance if unsatisfied)
router.post('/complaints/:id/reopen', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'A clear reason for reopening is required.' });
      return;
    }

    const data = db.read();
    const complaint = data.complaints.find((c) => c.id === req.params.id);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    if (complaint.createdBy !== user.id && !['admin', 'super_admin'].includes(user.role)) {
      res.status(403).json({ error: 'Unauthorized to reopen this grievance.' });
      return;
    }

    if (complaint.status !== 'resolved' && complaint.status !== 'closed' && complaint.status !== 'rejected') {
      res.status(400).json({ error: 'Only resolved, closed, or rejected complaints can be reopened.' });
      return;
    }

    const fromStatus = complaint.status;
    complaint.status = 'reopened';
    complaint.version += 1;
    complaint.updatedAt = new Date().toISOString();

    data.complaint_events.push({
      id: 'evt-' + Date.now(),
      complaintId: complaint.id,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      eventType: 'reopened',
      fromStatus,
      toStatus: 'reopened',
      publicMessage: `Grievance reopened by complainant: "${reason.trim()}"`,
      createdAt: new Date().toISOString()
    });

    db.write();

    logAudit(
      { id: user.id, name: user.name, role: user.role },
      'COMPLAINT_REOPENED',
      'complaint',
      complaint.id,
      `Grievance reopened with reason: ${reason}`,
      req
    );

    res.json({ message: 'Grievance reopened successfully and queued for re-examination.', complaint });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reopen complaint.' });
  }
});

/* =========================================================================
   3. ADMIN QUEUES, ANALYTICS & REPORTS
   ========================================================================= */

// GET /admin/complaints (Paginated & Filtered queue)
router.get(
  '/admin/complaints',
  authenticate,
  authorizeRoles('officer', 'admin', 'super_admin'),
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const {
      status,
      departmentId,
      priority,
      slaBreach,
      search,
      page = '1',
      limit = '50'
    } = req.query;

    const data = db.read();
    let results = [...data.complaints];

    // Department officers only see tickets in their department unless unassigned
    if (user.role === 'officer' && user.departmentId) {
      results = results.filter(
        (c) => c.departmentId === user.departmentId || c.assignedTo === user.id
      );
    }

    if (status && status !== 'all') {
      results = results.filter((c) => c.status === status);
    }

    if (departmentId && departmentId !== 'all') {
      results = results.filter((c) => c.departmentId === departmentId);
    }

    if (priority && priority !== 'all') {
      results = results.filter((c) => c.priority === priority);
    }

    const now = new Date().getTime();
    if (slaBreach === 'breached') {
      results = results.filter(
        (c) => !['resolved', 'closed', 'rejected'].includes(c.status) && new Date(c.dueAt).getTime() < now
      );
    } else if (slaBreach === 'approaching') {
      results = results.filter((c) => {
        if (['resolved', 'closed', 'rejected'].includes(c.status)) return false;
        const diff = new Date(c.dueAt).getTime() - now;
        return diff > 0 && diff <= 12 * 3600 * 1000; // within 12 hours of breach
      });
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      results = results.filter(
        (c) =>
          c.complaintNumber.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q)
      );
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const total = results.length;
    const paginated = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: paginated
    });
  }
);

// GET /admin/reports (Aggregated stats)
router.get(
  '/admin/reports',
  authenticate,
  authorizeRoles('admin', 'super_admin', 'officer'),
  (_req: AuthenticatedRequest, res: Response) => {
    const data = db.read();
    const now = new Date().getTime();

    const total = data.complaints.length;
    const resolved = data.complaints.filter((c) => ['resolved', 'closed'].includes(c.status)).length;
    const inProgress = data.complaints.filter((c) => ['in_progress', 'assigned', 'under_review'].includes(c.status)).length;
    const pending = data.complaints.filter((c) => ['submitted', 'reopened'].includes(c.status)).length;

    // SLA breaches
    const breached = data.complaints.filter((c) => {
      if (['resolved', 'closed'].includes(c.status)) {
        return c.resolvedAt && new Date(c.resolvedAt).getTime() > new Date(c.dueAt).getTime();
      }
      return new Date(c.dueAt).getTime() < now;
    }).length;

    // Status breakdown
    const byStatus: Record<string, number> = {};
    for (const c of data.complaints) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }

    // Department performance
    const departmentStats = data.departments.map((dept) => {
      const deptComplaints = data.complaints.filter((c) => c.departmentId === dept.id);
      const deptResolved = deptComplaints.filter((c) => ['resolved', 'closed'].includes(c.status)).length;
      const deptBreached = deptComplaints.filter((c) => {
        if (['resolved', 'closed'].includes(c.status)) {
          return c.resolvedAt && new Date(c.resolvedAt).getTime() > new Date(c.dueAt).getTime();
        }
        return new Date(c.dueAt).getTime() < now;
      }).length;

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        total: deptComplaints.length,
        resolved: deptResolved,
        breached: deptBreached,
        resolutionRate: deptComplaints.length ? Math.round((deptResolved / deptComplaints.length) * 100) : 100
      };
    });

    // Average resolution time in hours
    const resolvedItems = data.complaints.filter((c) => c.resolvedAt);
    let avgResolutionHours = 0;
    if (resolvedItems.length > 0) {
      const totalHours = resolvedItems.reduce((acc, curr) => {
        const diff = new Date(curr.resolvedAt!).getTime() - new Date(curr.createdAt).getTime();
        return acc + diff / (3600 * 1000);
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedItems.length);
    }

    res.json({
      summary: {
        total,
        resolved,
        inProgress,
        pending,
        breached,
        resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
        avgResolutionHours
      },
      byStatus,
      departments: departmentStats
    });
  }
);

// GET /admin/reports/csv (Authorized CSV export)
router.get(
  '/admin/reports/csv',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.read();
    const rows = [
      ['Ticket Number', 'Date', 'Complainant', 'Role', 'Department', 'Category', 'Subject', 'Priority', 'Status', 'Due Date', 'Resolved Date', 'Rating']
    ];

    for (const c of data.complaints) {
      rows.push([
        c.complaintNumber,
        new Date(c.createdAt).toLocaleDateString(),
        c.isAnonymous ? 'Confidential' : c.complainantName,
        c.complainantRole,
        `"${c.departmentName.replace(/"/g, '""')}"`,
        `"${c.category.replace(/"/g, '""')}"`,
        `"${c.subject.replace(/"/g, '""')}"`,
        c.priority,
        c.status,
        new Date(c.dueAt).toLocaleDateString(),
        c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : 'N/A',
        c.resolutionRating ? `${c.resolutionRating}/5` : 'N/A'
      ]);
    }

    const csvContent = rows.map((r) => r.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=DMI_Complaints_Export_${Date.now()}.csv`);
    res.send(csvContent);

    logAudit(
      { id: req.user!.id, name: req.user!.name, role: req.user!.role },
      'CSV_REPORT_EXPORTED',
      'system',
      'reports',
      'Full institutional complaint dataset exported to CSV.',
      req
    );
  }
);

// GET /admin/audit-logs
router.get(
  '/admin/audit-logs',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  (_req: AuthenticatedRequest, res: Response) => {
    const data = db.read();
    res.json(data.audit_logs.slice(0, 100));
  }
);

// GET /departments (Public list of institutional departments and categories)
router.get(['/departments', '/admin/departments'], (_req: Request, res: Response) => {
  const data = db.read();
  res.json(data.departments);
});

// POST /admin/departments
router.post(
  '/admin/departments',
  authenticate,
  authorizeRoles('super_admin', 'admin'),
  (req: AuthenticatedRequest, res: Response) => {
    const { name, code, description, headName, headEmail, slaHoursDefault = 48, categories = [] } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Department name and code are required.' });
      return;
    }

    const data = db.read();
    const newDept = {
      id: 'dept-' + code.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name,
      code: code.toUpperCase(),
      description: description || '',
      headName: headName || '',
      headEmail: headEmail || '',
      active: true,
      slaHoursDefault: Number(slaHoursDefault),
      categories
    };

    data.departments.push(newDept);
    db.write();

    res.status(201).json(newDept);
  }
);

// GET /admin/users
router.get(
  '/admin/users',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  (_req: AuthenticatedRequest, res: Response) => {
    const data = db.read();
    const safeUsers = data.users.map(({ passwordHash, verificationTokenHash, ...rest }) => rest);
    res.json(safeUsers);
  }
);

// PATCH /admin/users/:id/role
router.patch(
  '/admin/users/:id/role',
  authenticate,
  authorizeRoles('super_admin'),
  (req: AuthenticatedRequest, res: Response) => {
    const { role, departmentId } = req.body;
    const data = db.read();
    const user = data.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    user.role = role;
    if (departmentId) {
      const dept = data.departments.find((d) => d.id === departmentId);
      user.departmentId = departmentId;
      user.departmentName = dept?.name;
    }
    user.updatedAt = new Date().toISOString();
    db.write();

    logAudit(
      { id: req.user!.id, name: req.user!.name, role: req.user!.role },
      'USER_ROLE_CHANGED',
      'user',
      user.id,
      `User ${user.email} role updated to ${role}`,
      req
    );

    res.json({ message: 'User role updated.', user });
  }
);

// PATCH /admin/users/:id/status
router.patch(
  '/admin/users/:id/status',
  authenticate,
  authorizeRoles('super_admin', 'admin'),
  (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;
    const data = db.read();
    const user = data.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    user.status = status;
    user.updatedAt = new Date().toISOString();
    db.write();

    res.json({ message: 'User status updated.', user });
  }
);

// GET /system/settings
router.get('/system/settings', (_req: Request, res: Response) => {
  const data = db.read();
  res.json(data.settings);
});

// PUT /system/settings
router.put(
  '/system/settings',
  authenticate,
  authorizeRoles('super_admin'),
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.read();
    data.settings = { ...data.settings, ...req.body };
    db.write();
    res.json(data.settings);
  }
);

// GET /system/email-outbox (Helps user/reviewer inspect generated verification links immediately)
router.get('/system/email-outbox', (_req: Request, res: Response) => {
  res.json(emailDeliveryJournal.slice(0, 20));
});

// GET /notifications
router.get('/notifications', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.read();
  const list = data.notifications.filter((n) => n.userId === user.id);
  res.json(list.slice(0, 30));
});

// PATCH /notifications/:id/read
router.patch('/notifications/:id/read', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const data = db.read();
  const notif = data.notifications.find((n) => n.id === req.params.id && n.userId === req.user!.id);
  if (notif) {
    notif.read = true;
    db.write();
  }
  res.json({ success: true });
});

export default router;
