
'use client';

import { useState, useEffect } from 'react';

type StaffMember = {
    id: string;
    name: string;
    username: string;
    role: 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER';
    isActive: boolean;
    createdAt: string;
};

export default function StaffPage() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        role: 'WAITER'
    });
    const [submitting, setSubmitting] = useState(false);

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
        try {
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowAddModal(false);
                setFormData({ name: '', username: '', password: '', role: 'WAITER' });
                fetchStaff();
            } else {
                alert('Failed to create user');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this staff member?')) return;
        try {
            const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
            if (res.ok) fetchStaff();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Staff Roster...</div>;

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 lg:p-10 hide-scrollbar bg-[#FDFCF9]">
            <div className="max-w-7xl mx-auto space-y-8 pb-32">

                <div className="flex justify-between items-end border-b border-zinc-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase text-zinc-900">Staff Roster</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Manage Access & Roles</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-[#D43425] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-900 transition-colors shadow-lg shadow-red-500/20"
                    >
                        + Add Member
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staff.map((member) => (
                        <div key={member.id} className="bg-white border border-zinc-100 p-6 rounded-2xl flex flex-col gap-4 group hover:shadow-xl hover:border-zinc-200 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center font-black text-xl text-zinc-400 group-hover:bg-[#D43425] group-hover:text-white transition-colors">
                                    {member.name.charAt(0)}
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${member.role === 'WAITER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    member.role === 'KITCHEN' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        member.role === 'MANAGER' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                            'bg-zinc-50 text-zinc-600 border-zinc-100'
                                    }`}>
                                    {member.role}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-zinc-900 leading-tight">{member.name}</h3>
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">@{member.username}</p>
                            </div>

                            <div className="pt-4 border-t border-zinc-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-bold text-zinc-300 uppercase">Active since {new Date(member.createdAt).getFullYear()}</span>
                                <button
                                    onClick={() => handleDelete(member.id)}
                                    className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {/* ADD MEMBER MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter mb-6">New Team Member</h3>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Full Name</label>
                                <input
                                    required
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900 focus:outline-none focus:border-zinc-400"
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Username</label>
                                    <input
                                        required
                                        className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900 focus:outline-none focus:border-zinc-400"
                                        placeholder="johnd"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Password</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900 focus:outline-none focus:border-zinc-400"
                                        placeholder="••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Role Assignment</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['WAITER', 'KITCHEN', 'CASHIER', 'MANAGER'].map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role })}
                                            className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.role === role
                                                ? 'bg-zinc-900 text-white border-zinc-900'
                                                : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 text-[10px] font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-2 bg-[#D43425] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors"
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
