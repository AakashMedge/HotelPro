
'use client';

import { useState, useEffect } from 'react';

type User = {
    id: string;
    name: string;
    username: string;
    role: string;
    createdAt: string;
    isActive: boolean;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Reuse staff API for now if it returns all users
        // Manager API was filtered? Let's check api/staff
        // api/staff returns all users.
        fetch('/api/staff')
            .then(res => res.json())
            .then(data => {
                if (data.success) setUsers(data.staff);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-10 font-mono text-xs">Loading User Registry...</div>;

    return (
        <div className="h-full overflow-y-auto p-8 font-mono bg-[#F2F2F2]">
            <div className="max-w-6xl mx-auto space-y-8 pb-32">
                <div className="flex justify-between items-end border-b-2 border-black pb-4">
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Global User Registry</h1>
                    <span className="text-xs font-bold uppercase">{users.length} Records Found</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs uppercase tracking-wide border-2 border-black bg-white">
                        <thead className="bg-[#E5E5E5] font-black border-b-2 border-black">
                            <tr>
                                <th className="p-4 border-r border-black">UID (Truncated)</th>
                                <th className="p-4 border-r border-black">Identity Name</th>
                                <th className="p-4 border-r border-black">System Role</th>
                                <th className="p-4 border-r border-black">Access ID</th>
                                <th className="p-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-zinc-50">
                                    <td className="p-4 border-r border-zinc-200 font-mono text-zinc-400">{user.id.substring(0, 8)}...</td>
                                    <td className="p-4 border-r border-zinc-200 font-bold">{user.name}</td>
                                    <td className="p-4 border-r border-zinc-200">
                                        <span className={`px-2 py-1 ${user.role === 'ADMIN' ? 'bg-black text-white' :
                                                user.role === 'MANAGER' ? 'bg-zinc-200' : 'bg-white border border-zinc-300'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4 border-r border-zinc-200">@{user.username}</td>
                                    <td className="p-4 text-right">
                                        {user.isActive ? <span className="text-green-600 font-bold">ACTIVE</span> : <span className="text-red-600 font-bold">REVOKED</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
