'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, ChefHat, Receipt, UserCheck, X, AlertCircle } from 'lucide-react';

type StaffMember = {
    id: string;
    name: string;
    username: string;
    role: 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER';
    isActive: boolean;
    createdAt: string;
};

const ROLE_CONFIG = {
    ADMIN: { icon: Shield, color: 'from-slate-600 to-slate-800', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
    MANAGER: { icon: UserCheck, color: 'from-purple-500 to-purple-700', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    WAITER: { icon: Users, color: 'from-blue-500 to-blue-700', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    KITCHEN: { icon: ChefHat, color: 'from-amber-500 to-amber-700', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
    CASHIER: { icon: Receipt, color: 'from-emerald-500 to-emerald-700', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
};

export default function AdminStaffPage() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        role: 'WAITER' as 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER'
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/staff');
            const data = await res.json();
            if (data.success) {
                setStaff(data.staff);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        // Validation
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setSubmitting(false);
            return;
        }

        try {
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setShowAddModal(false);
                setFormData({ name: '', username: '', password: '', role: 'WAITER' });
                fetchStaff();
            } else {
                setError(data.error || 'Failed to create staff member');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/staff/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            if (res.ok) fetchStaff();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Loading Staff...</p>
                </div>
            </div>
        );
    }

    // Group staff by role
    const staffByRole = {
        ADMIN: staff.filter(s => s.role === 'ADMIN'),
        MANAGER: staff.filter(s => s.role === 'MANAGER'),
        WAITER: staff.filter(s => s.role === 'WAITER'),
        KITCHEN: staff.filter(s => s.role === 'KITCHEN'),
        CASHIER: staff.filter(s => s.role === 'CASHIER'),
    };

    return (
        <div className="h-full overflow-y-auto p-6 md:p-10 bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-8 pb-20">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Staff Management</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {staff.length} team members • {staff.filter(s => s.isActive).length} active
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm shadow-blue-200 active:scale-95"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Staff Member
                    </button>
                </div>

                {/* Empty State */}
                {staff.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Staff Members Yet</h3>
                        <p className="text-slate-500 mb-6">Start by adding your first team member.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all"
                        >
                            Add Your First Staff Member
                        </button>
                    </div>
                )}

                {/* Staff Grid by Role */}
                {staff.length > 0 && (
                    <div className="space-y-8">
                        {(['MANAGER', 'WAITER', 'KITCHEN', 'CASHIER'] as const).map(role => {
                            const roleStaff = staffByRole[role];
                            if (roleStaff.length === 0) return null;

                            const config = ROLE_CONFIG[role];
                            const Icon = config.icon;

                            return (
                                <div key={role}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${config.color} flex items-center justify-center`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-slate-800">
                                            {role}s <span className="text-slate-400 font-normal">({roleStaff.length})</span>
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {roleStaff.map(member => (
                                            <StaffCard
                                                key={member.id}
                                                member={member}
                                                onToggleStatus={handleToggleStatus}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Admin Users (read-only) */}
                        {staffByRole.ADMIN.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${ROLE_CONFIG.ADMIN.color} flex items-center justify-center`}>
                                        <Shield className="w-4 h-4 text-white" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-800">
                                        Administrators <span className="text-slate-400 font-normal">({staffByRole.ADMIN.length})</span>
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {staffByRole.ADMIN.map(member => (
                                        <StaffCard
                                            key={member.id}
                                            member={member}
                                            onToggleStatus={handleToggleStatus}
                                            isAdmin
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Add Staff Member</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                                <input
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="johnd"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['MANAGER', 'WAITER', 'KITCHEN', 'CASHIER'] as const).map(role => {
                                        const config = ROLE_CONFIG[role];
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role })}
                                                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.role === role
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <Icon className={`w-4 h-4 ${formData.role === role ? 'text-blue-600' : 'text-slate-400'}`} />
                                                <span className={`text-sm font-medium ${formData.role === role ? 'text-blue-600' : 'text-slate-600'}`}>
                                                    {role}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StaffCard({
    member,
    onToggleStatus,
    isAdmin = false
}: {
    member: StaffMember;
    onToggleStatus: (id: string, status: boolean) => void;
    isAdmin?: boolean;
}) {
    const config = ROLE_CONFIG[member.role];
    const Icon = config.icon;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${config.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                        <span className="text-white font-bold text-lg">{member.name.charAt(0)}</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">{member.name}</h3>
                        <p className="text-xs text-slate-500">@{member.username}</p>
                    </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bgColor} ${config.textColor}`}>
                    {member.role}
                </span>
                {!isAdmin && (
                    <button
                        onClick={() => onToggleStatus(member.id, member.isActive)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${member.isActive
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                    >
                        {member.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                )}
            </div>
        </div>
    );
}
