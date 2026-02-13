/**
 * HQ / Super Admin Types
 * 
 * All types related to Super Admin operations and client management.
 */

// We use string literals here instead of importing from @prisma/client 
// to avoid build breakages when the generated client is out of sync.
export type ClientPlan = 'BASIC' | 'ADVANCE' | 'PREMIUM' | 'BUSINESS';
export type ClientStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'ARCHIVED' | 'PROVISIONING' | 'PROVISIONING_FAILED';

// ============================================
// CLIENT MANAGEMENT TYPES
// ============================================

export interface CreateClientInput {
    // Hotel Details
    name: string;
    slug: string;
    plan: ClientPlan;

    // Primary Admin User
    adminUsername: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;

    // Optional
    domain?: string;
}

export interface UpdateClientInput {
    name?: string;
    plan?: ClientPlan;
    status?: ClientStatus;
    domain?: string;
}

export interface ClientWithStats {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    plan: ClientPlan;
    status: ClientStatus;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        users: number;
        orders: number;
        tables: number;
        menuItems: number;
    };
    subscription?: ClientSubscription;
}

// ============================================
// SUBSCRIPTION TYPES (Dummy for now)
// ============================================

export interface ClientSubscription {
    planStartDate: Date;
    planEndDate: Date;
    trialEndsAt: Date | null;
    isTrialActive: boolean;
    nextBillingDate: Date;
    monthlyPrice: number;
}

// Dummy pricing for plans
export const PLAN_PRICING: Record<string, number> = {
    BASIC: 1999,      // ₹1,999/month - Starter
    ADVANCE: 4999,    // ₹4,999/month - Growth
    PREMIUM: 9999,    // ₹9,999/month - Enterprise Core
    BUSINESS: 19999,  // ₹19,999/month - Platform Elite
};

// Trial period in days
export const TRIAL_PERIOD_DAYS = 14;

// ============================================
// API RESPONSE TYPES
// ============================================

export interface HQApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface ClientListResponse {
    clients: ClientWithStats[];
    totalCount: number;
    page: number;
    pageSize: number;
}

// ============================================
// ADMIN USER CREATION TYPES
// ============================================

export interface CreateAdminUserInput {
    clientId: string;
    username: string;
    name: string;
    email: string;
    password: string;
}
