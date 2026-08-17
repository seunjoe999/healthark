export type StaffRole = 'care_staff' | 'team_leader' | 'admin' | 'deputy_manager' | 'home_manager' | 'group_admin' | 'senior_carer' | 'auditor'
  | 'director' | 'registered_manager' | 'service_manager' | 'supervisor' | 'recruitment_admin';
export type StaffStatus = 'active' | 'on_leave' | 'suspended' | 'resigned' | 'terminated';
export type SUStatus = 'live' | 'pre_admission' | 'archive' | 'on_hold' | 'hospital';
export type EmergencyRating = 'low' | 'medium' | 'high';
export type LeaveType = 'annual' | 'sick' | 'unauthorised' | 'maternity' | 'paternity' | 'compassionate' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'declined' | 'cancelled';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ReviewFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'eight_weekly' | 'yearly';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface JwtPayload {
  staffId: string;
  organisationId: string;
  homeId: string | null;
  role: StaffRole;
  email: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface HomePermissions {
  homeId: string;
  canViewCarePlans: boolean;
  canEditCarePlans: boolean;
  canViewSensitive: boolean;
  canRunReports: boolean;
  canManageStaff: boolean;
  canApproveLeave: boolean;
  canViewPhones: boolean;
  canViewKeysafe: boolean;
  canViewFinancials: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
