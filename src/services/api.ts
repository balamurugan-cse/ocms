import {
  User,
  Complaint,
  Department,
  AuditLog,
  NotificationItem,
  ReportSummary,
  EmailDispatchRecord
} from '../types';

const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('dmi_token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || 'Server error occurred.';
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  // Authentication
  async register(payload: {
    name: string;
    email: string;
    password: string;
    role?: 'student' | 'faculty';
    departmentName?: string;
    rollNumber?: string;
    phone?: string;
  }) {
    return request<{
      message: string;
      verificationRequired: boolean;
      email: string;
      verificationLink: string;
      smtpStatus: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async verifyEmail(token: string) {
    return request<{
      message: string;
      token: string;
      user: User;
    }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async resendVerification(email: string) {
    return request<{
      message: string;
      verificationLink: string;
      smtpStatus: string;
    }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async login(payload: { email: string; password: string }) {
    return request<{
      message: string;
      token: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async logout() {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST'
    });
  },

  async getMe() {
    return request<User>('/auth/me');
  },

  // Complaints
  async createComplaint(payload: {
    category: string;
    subject: string;
    description: string;
    departmentId: string;
    priority: string;
    isAnonymous?: boolean;
    location?: string;
    preferredContact?: string;
  }) {
    return request<{ message: string; complaint: Complaint }>('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getMyComplaints() {
    return request<Complaint[]>('/complaints/mine');
  },

  async getComplaint(id: string) {
    return request<Complaint>(`/complaints/${id}`);
  },

  async trackPublicComplaint(complaintNumber: string) {
    return request<any>(`/complaints/track/${encodeURIComponent(complaintNumber)}`);
  },

  async uploadAttachments(complaintId: string, files: File[]) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return request<{ message: string; attachments: any[] }>(`/complaints/${complaintId}/attachments`, {
      method: 'POST',
      body: formData
    });
  },

  async updateStatus(
    complaintId: string,
    payload: {
      status: string;
      reason: string;
      internalNote?: string;
      resolutionNotes?: string;
    }
  ) {
    return request<{ message: string; complaint: Complaint }>(`/complaints/${complaintId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async assignComplaint(
    complaintId: string,
    payload: {
      officerId?: string;
      departmentId?: string;
      note?: string;
    }
  ) {
    return request<{ message: string; complaint: Complaint }>(`/complaints/${complaintId}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async addComment(
    complaintId: string,
    payload: {
      message: string;
      isInternal?: boolean;
    }
  ) {
    return request<{ message: string; event: any }>(`/complaints/${complaintId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async rateComplaint(
    complaintId: string,
    payload: {
      rating: number;
      feedback?: string;
    }
  ) {
    return request<{ message: string; complaint: Complaint }>(`/complaints/${complaintId}/rate`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async reopenComplaint(complaintId: string, reason: string) {
    return request<{ message: string; complaint: Complaint }>(`/complaints/${complaintId}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // Admin & Management
  async getAdminComplaints(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return request<{
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      data: Complaint[];
    }>(`/admin/complaints?${query}`);
  },

  async getAdminReports() {
    return request<ReportSummary>('/admin/reports');
  },

  getExportCsvUrl() {
    const token = localStorage.getItem('dmi_token');
    return `/api/v1/admin/reports/csv?token=${encodeURIComponent(token || '')}`;
  },

  async getDepartments() {
    return request<Department[]>('/admin/departments');
  },

  async createDepartment(payload: any) {
    return request<Department>('/admin/departments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getUsers() {
    return request<User[]>('/admin/users');
  },

  async updateUserRole(userId: string, role: string, departmentId?: string) {
    return request<any>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, departmentId })
    });
  },

  async updateUserStatus(userId: string, status: string) {
    return request<any>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async getAuditLogs() {
    return request<AuditLog[]>('/admin/audit-logs');
  },

  async getSystemSettings() {
    return request<any>('/system/settings');
  },

  async updateSystemSettings(settings: any) {
    return request<any>('/system/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  async getEmailOutbox() {
    return request<EmailDispatchRecord[]>('/system/email-outbox');
  },

  // Notifications
  async getNotifications() {
    return request<NotificationItem[]>('/notifications');
  },

  async markNotificationRead(id: string) {
    return request<any>(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  }
};

