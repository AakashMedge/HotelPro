
'use client';

import { useState, useEffect } from 'react';

type StaffMember = {
    id: string;
    name: string;
    username: string;
    role: 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER';
    isActive: boolean;
    createdAt: string;
    totalOrders: number;
    totalSales: number;
    assignedTables: {
        id: string;
        tableCode: string;
        section: string | null;
        status: string;
    }[];
};

export default function StaffPage() {
    const [activeTab, setActiveTab] = useState<'roster' | 'performance' | 'shifts'>('roster');
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
    // Edit/Manage State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({
        id: '',
        name: '',
        role: 'WAITER' as 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN' | 'CASHIER',
        newPassword: '' // Optional for reset
    });
    const [updating, setUpdating] = useState(false);

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

    const handleStartEdit = (member: StaffMember) => {
        setEditData({
            id: member.id,
            name: member.name,
            role: member.role,
            newPassword: ''
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const res = await fetch(`/api/staff/${editData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editData.name,
                    role: editData.role,
                    password: editData.newPassword || undefined // Only send if set
                })
            });

            if (res.ok) {
                setShowEditModal(false);
                fetchStaff();
                alert('Staff member updated successfully');
            } else {
                alert('Failed to update staff');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating staff');
        } finally {
            setUpdating(false);
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

                {/* COMMAND CENTER HEADER */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-zinc-100 shadow-sm space-y-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-4xl font-black tracking-tighter uppercase text-zinc-900 leading-none">Command Center</h2>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] mt-3">Personnel & Performance Intelligence</p>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-[#D43425] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-red-500/10"
                        >
                            + Draft New Member
                        </button>
                    </div>

                    <div className="flex gap-4 pt-4 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'roster', label: 'Team Roster', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
                            { id: 'performance', label: 'Performance', icon: 'M23 6l-9.5 9.5-5-5L1 18' },
                            { id: 'shifts', label: 'Shift Coverage', icon: 'M12 2v20M2 12h20' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-xl translate-y-[-2px]' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon} /></svg>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* VIEW: TEAM ROSTER */}
                {activeTab === 'roster' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {staff.map((member) => (
                            <div key={member.id} className="bg-white border border-zinc-100 p-8 rounded-[3rem] flex flex-col gap-6 group hover:shadow-2xl hover:border-zinc-200 transition-all duration-500 hover:-translate-y-1">
                                <div className="flex justify-between items-start">
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center font-black text-2xl text-zinc-300 group-hover:bg-[#D43425] group-hover:text-white transition-all transform group-hover:rotate-3 shadow-inner">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${member.role === 'WAITER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            member.role === 'KITCHEN' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                member.role === 'MANAGER' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                    member.role === 'CASHIER' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        member.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            'bg-zinc-50 text-zinc-600 border-zinc-100'
                                            }`}>
                                            {member.role}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-300'} animate-pulse`} />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight leading-tight">{member.name}</h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">Personnel ID: @{member.username}</p>
                                </div>

                                <div className="pt-6 border-t border-zinc-50 flex justify-between items-center group-hover:opacity-100 transition-opacity">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Enrolled</span>
                                        <span className="text-[10px] font-bold text-zinc-500">{new Date(member.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {member.role !== 'ADMIN' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleStartEdit(member)}
                                                className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-900 hover:text-white transition-all"
                                                title="Edit / Reset Password"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(member.id)}
                                                className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 active:scale-90"
                                                title="Remove Staff"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* VIEW: PERFORMANCE ANALYTICS */}
                {activeTab === 'performance' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {staff.filter(s => s.role === 'WAITER').sort((a, b) => b.totalSales - a.totalSales).map((waiter, idx) => (
                                <div key={waiter.id} className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-sm relative overflow-hidden group">
                                    {idx === 0 && (
                                        <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-6 rotate-12 shadow-xl">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Star Waiter</span>
                                        </div>
                                    )}
                                    <div className="relative z-10 flex flex-col gap-6">
                                        <div className="flex justify-between items-center">
                                            <div className="w-14 h-14 rounded-full bg-zinc-50 flex items-center justify-center font-black text-xl text-zinc-300 border border-zinc-100">
                                                {waiter.name.charAt(0)}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-zinc-900 leading-none">₹{Number(waiter.totalSales).toLocaleString()}</div>
                                                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">Total Sales Vol.</div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-black text-zinc-900">{waiter.name}</h3>
                                            <div className="w-full bg-zinc-100 h-2 rounded-full mt-3 overflow-hidden">
                                                <div
                                                    className="bg-[#D43425] h-full rounded-full"
                                                    style={{ width: `${Math.min(100, (waiter.totalOrders / 50) * 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-2">
                                                <span className="text-[9px] font-black text-zinc-400 uppercase">{waiter.totalOrders} Orders Handled</span>
                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{idx === 0 ? 'Top Performer' : `#${idx + 1} Rank`}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VIEW: SHIFT COVERAGE */}
                {activeTab === 'shifts' && (
                    <div className="bg-white rounded-[2.5rem] p-10 border border-zinc-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h4 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Floor Assignments</h4>
                                <div className="space-y-4">
                                    {staff.filter(s => s.role === 'WAITER').map(waiter => (
                                        <div key={waiter.id} className="flex items-center justify-between p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-zinc-400 text-xs shadow-sm">
                                                    {waiter.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-zinc-900">{waiter.name}</div>
                                                    <div className="text-[9px] font-bold text-zinc-400 uppercase">{waiter.assignedTables.length} Tables Active</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {waiter.assignedTables.map(t => (
                                                    <span key={t.id} className={`px-3 py-1 rounded-lg text-[8px] font-black text-white ${t.status === 'ACTIVE' ? 'bg-[#D43425]' : 'bg-green-500'}`}>T-{t.tableCode}</span>
                                                ))}
                                                {waiter.assignedTables.length === 0 && <span className="text-[8px] font-bold text-zinc-300 uppercase">Awaiting Post...</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-zinc-900 rounded-4xl p-8 text-white flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tighter">Floor Summary</h4>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Real-time occupancy status</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6 my-10">
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="text-3xl font-black">{staff.filter(s => s.isActive).length}</div>
                                        <div className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mt-2">Active Staff</div>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="text-3xl font-black">{staff.reduce((acc, s) => acc + s.assignedTables.length, 0)}</div>
                                        <div className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mt-2">Tables Covered</div>
                                    </div>
                                </div>
                                <button className="w-full bg-white text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-colors">Generate Coverage Report</button>
                            </div>
                        </div>
                    </div>
                )}

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
                                    {['WAITER', 'KITCHEN', 'CASHIER'].map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: role as any })}
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

            {/* EDIT MEMBER MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter mb-6">Manage Profile</h3>

                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Full Name</label>
                                <input
                                    required
                                    className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-xl font-bold text-zinc-900 focus:outline-none focus:border-zinc-400"
                                    value={editData.name}
                                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Role Assignment</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['WAITER', 'KITCHEN', 'CASHIER'].map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setEditData({ ...editData, role: role as any })}
                                            className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${editData.role === role
                                                ? 'bg-zinc-900 text-white border-zinc-900'
                                                : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    Reset Password
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-white border border-amber-200 p-3 rounded-xl font-bold text-zinc-900 focus:outline-none focus:border-amber-400 placeholder:text-amber-300/50"
                                    placeholder="Enter new password to reset"
                                    value={editData.newPassword}
                                    onChange={e => setEditData({ ...editData, newPassword: e.target.value })}
                                />
                                <p className="text-[9px] font-bold text-amber-500 mt-2 uppercase tracking-wide">Leave blank to keep current password</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-3 text-[10px] font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="flex-2 bg-zinc-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-colors"
                                >
                                    {updating ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
