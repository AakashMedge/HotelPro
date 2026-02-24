'use client';

import { useState, useEffect } from 'react';
import {
    Users, UserPlus, Shield, ChefHat, Receipt, UserCheck, X,
    AlertCircle, Search, Trash2, Loader2, Lock
} from 'lucide-react';

type StaffMember = {
    id: string;
    name: string;
    username: string;
    role: 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER';
    isActive: boolean;
    createdAt: string;
};

const ROLE_CONFIG = {
    ADMIN: { color: 'text-slate-600', bg: 'bg-slate-50', icon: Shield },
    MANAGER: { color: 'text-purple-600', bg: 'bg-purple-50', icon: UserCheck },
    WAITER: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Users },
    KITCHEN: { color: 'text-orange-600', bg: 'bg-orange-50', icon: ChefHat },
    CASHIER: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Receipt },
};

// Role options per plan — ADMIN & SUPER_ADMIN are NEVER creatable from hotel admin panel
const ROLE_OPTIONS_BY_PLAN: Record<string, { value: string; label: string }[]> = {
    STARTER: [
        { value: 'WAITER', label: 'Waiter' },
        { value: 'MANAGER', label: 'Manager' },
    ],
    GROWTH: [
        { value: 'WAITER', label: 'Waiter' },
        { value: 'MANAGER', label: 'Manager' },
        { value: 'CASHIER', label: 'Cashier' },
        { value: 'KITCHEN', label: 'Kitchen Staff' },
    ],
    ELITE: [
        { value: 'WAITER', label: 'Waiter' },
        { value: 'MANAGER', label: 'Manager' },
        { value: 'CASHIER', label: 'Cashier' },
        { value: 'KITCHEN', label: 'Kitchen Staff' },
    ],
};

export default function AdminStaffPage() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [plan, setPlan] = useState<string>('STARTER');

    const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'WAITER' as string });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchStaff = () => {
        fetch('/api/staff')
            .then(res => res.json())
            .then(data => {
                if (data.success) setStaff(data.staff);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStaff();
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(data => {
                if (data.success && data.user?.plan) {
                    setPlan(data.user.plan);
                }
            });
    }, []);

    const availableRoles = ROLE_OPTIONS_BY_PLAN[plan] ?? ROLE_OPTIONS_BY_PLAN.STARTER;
    const isStarterPlan = plan === 'STARTER';

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                setShowAddModal(false);
                setFormData({ name: '', username: '', password: '', role: 'WAITER' });
                fetchStaff();
            } else {
                setError(data.error || 'Failed to create staff');
            }
        } catch {
            setError('Network error');
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
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this staff member?')) return;
        try {
            const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
            if (res.ok) fetchStaff();
        } catch (err) { console.error(err); }
    };

    const filteredStaff = staff.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.username.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-slate-500 font-medium">{staff.length} team members registered</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${isStarterPlan
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : plan === 'GROWTH'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : 'bg-purple-50 text-purple-600 border-purple-200'
                            }`}>
                            {plan} Plan
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    New Member
                </button>
            </div>

            {/* Starter plan info banner */}
            {isStarterPlan && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-blue-500 shrink-0" />
                    <p className="text-xs font-semibold text-blue-700">
                        <span className="font-black">Starter Plan:</span> You can add Waiters and Managers only.
                        Cashier &amp; Kitchen roles are available on Growth plan and above.
                    </p>
                </div>
            )}

            {/* Staff Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-50 flex items-center gap-4 bg-slate-50/30">
                    <Search className="w-4 h-4 text-slate-400 ml-2" />
                    <input
                        type="text"
                        placeholder="Search staff members..."
                        className="bg-transparent border-none text-sm font-medium focus:ring-0 w-full outline-none text-slate-900"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Username</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStaff.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                                        No staff members found. Add your first team member above.
                                    </td>
                                </tr>
                            )}
                            {filteredStaff.map((member) => {
                                const roleKey = member.role as keyof typeof ROLE_CONFIG;
                                const role = ROLE_CONFIG[roleKey] || ROLE_CONFIG.WAITER;
                                const Icon = role.icon;
                                return (
                                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg ${role.bg} ${role.color} flex items-center justify-center`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">{member.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-400">@{member.username}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${role.bg} ${role.color}`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {member.role === 'ADMIN' ? (
                                                <div className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-400 cursor-not-allowed inline-block">
                                                    Protected
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleToggleStatus(member.id, member.isActive)}
                                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${member.isActive
                                                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                                        }`}
                                                >
                                                    {member.isActive ? 'Active' : 'Inactive'}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {member.role !== 'ADMIN' && (
                                                    <button
                                                        onClick={() => handleDelete(member.id)}
                                                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD MEMBER MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Add Member</h3>
                                <p className="text-xs text-slate-400 font-medium">Create a new staff account.</p>
                            </div>
                            <button
                                onClick={() => { setShowAddModal(false); setError(''); }}
                                className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-semibold">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    placeholder="e.g. Rahul Sharma"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Username</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none"
                                        placeholder="rahul"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none"
                                        placeholder="••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Role Assignment — plan-filtered, ADMIN/SUPER_ADMIN never shown */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Role Assignment</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {availableRoles.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                                {isStarterPlan && (
                                    <p className="text-[10px] text-slate-400 pl-1 flex items-center gap-1 mt-1">
                                        <Lock className="w-3 h-3" />
                                        Cashier &amp; Kitchen available on Growth plan
                                    </p>
                                )}
                            </div>

                            <div className="pt-2">
                                <button
                                    disabled={submitting}
                                    type="submit"
                                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
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
