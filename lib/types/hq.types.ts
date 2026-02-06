/**
 * HQ / Super Admin Types
 * 
 * All types related to Super Admin operations and client management.
 */

import { ClientPlan, ClientStatus } from "@prisma/client";

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
export const PLAN_PRICING: Record<ClientPlan, number> = {
    BASIC: 2999,      // ₹2,999/month
    ADVANCE: 5999,    // ₹5,999/month
    PREMIUM: 9999,    // ₹9,999/month
    BUSINESS: 19999,  // ₹19,999/month
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
