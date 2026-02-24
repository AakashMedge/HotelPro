
'use client';

import { useState, useEffect } from 'react';
import {
    Megaphone,
    Send,
    Bell,
    Info,
    AlertTriangle,
    CheckCircle2,
    Filter,
    Plus,
    X,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface Broadcast {
    id: string;
    title: string;
    content: string;
    type: 'ANNOUNCEMENT' | 'UPDATE' | 'ALERT';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    target: 'ALL' | 'STARTER' | 'GROWTH' | 'ELITE';
    sentBy: string;
    createdAt: string;
}

export default function BroadcastsPage() {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newBroadcast, setNewBroadcast] = useState({
        title: '',
        content: '',
        type: 'ANNOUNCEMENT',
        priority: 'MEDIUM',
        target: 'ALL'
    });

    useEffect(() => {
        fetchBroadcasts();
    }, []);

    const fetchBroadcasts = async () => {
        try {
            const res = await fetch('/api/hq/broadcasts');
            if (res.ok) {
                const data = await res.json();
                setBroadcasts(data.broadcasts || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newBroadcast.title || !newBroadcast.content) return alert("Fields required");
        setSaving(true);
        try {
            const res = await fetch('/api/hq/broadcasts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBroadcast),
            });
            if (res.ok) {
                setShowModal(false);
                setNewBroadcast({ title: '', content: '', type: 'ANNOUNCEMENT', priority: 'MEDIUM', target: 'ALL' });
                fetchBroadcasts();
            }
        } catch (err) {
            alert("Failed to send");
        } finally {
            setSaving(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ALERT': return 'bg-rose-100 text-rose-600 border-rose-200';
            case 'UPDATE': return 'bg-amber-100 text-amber-600 border-amber-200';
            default: return 'bg-blue-100 text-blue-600 border-blue-200';
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-indigo-600" />
                        Platform Broadcast System
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Communicate with all hotel administrators instantly.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 w-fit"
                >
                    <Plus className="w-5 h-5" />
                    New Broadcast
                </button>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Statistics / Quick Filter Column */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 border-b border-slate-50 pb-4 uppercase tracking-widest mb-6">Channel Health</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <Bell className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600">Total Sent</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">{broadcasts.length}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600">High Priority</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">
                                    {broadcasts.filter(b => b.priority === 'HIGH').length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Broadcast List Column */}
                <div className="xl:col-span-2 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                        </div>
                    ) : broadcasts.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                            <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">No broadcasts yet</h3>
                            <p className="text-slate-500 text-sm">Create your first announcement to reach your clients.</p>
                        </div>
                    ) : (
                        broadcasts.map((broadcast) => (
                            <div
                                key={broadcast.id}
                                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                            >
                                <div className={`absolute top-0 right-0 w-2 h-full ${broadcast.priority === 'HIGH' ? 'bg-rose-500' :
                                    broadcast.priority === 'MEDIUM' ? 'bg-amber-400' : 'bg-slate-200'
                                    }`} />

                                <div className="flex items-start justify-between mb-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getTypeColor(broadcast.type)}`}>
                                                {broadcast.type}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Target: {broadcast.target}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-extrabold text-slate-900">{broadcast.title}</h3>
                                    </div>
                                    <span className="text-xs font-medium text-slate-400">
                                        {format(new Date(broadcast.createdAt), 'MMM d, h:mm a')}
                                    </span>
                                </div>

                                <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                                    {broadcast.content}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            {broadcast.sentBy.charAt(0)}
                                        </div>
                                        <span className="text-xs font-bold text-slate-500">Sent by {broadcast.sentBy}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-500">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Delivered</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl animate-in zoom-in duration-300">
                        <div className="flex items-center justify-between p-8 border-b border-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">Compose Broadcast</h2>
                                <p className="text-sm text-slate-500 font-medium">Draft your platform-wide announcement.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-slate-50 p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setNewBroadcast({ ...newBroadcast, type: 'ANNOUNCEMENT' })}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${newBroadcast.type === 'ANNOUNCEMENT' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                            }`}
                                    >
                                        <Info className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase">General</span>
                                    </button>
                                    <button
                                        onClick={() => setNewBroadcast({ ...newBroadcast, type: 'UPDATE' })}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${newBroadcast.type === 'UPDATE' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                            }`}
                                    >
                                        <Send className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase">Update</span>
                                    </button>
                                    <button
                                        onClick={() => setNewBroadcast({ ...newBroadcast, type: 'ALERT' })}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${newBroadcast.type === 'ALERT' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                            }`}
                                    >
                                        <AlertTriangle className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase">Alert</span>
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                                    <input
                                        type="text"
                                        placeholder="Headline of the announcement..."
                                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                        value={newBroadcast.title}
                                        onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Content</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Describe the details..."
                                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
                                        value={newBroadcast.content}
                                        onChange={(e) => setNewBroadcast({ ...newBroadcast, content: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                                        <select
                                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none"
                                            value={newBroadcast.priority}
                                            onChange={(e) => setNewBroadcast({ ...newBroadcast, priority: e.target.value as any })}
                                        >
                                            <option value="LOW">Low Priority</option>
                                            <option value="MEDIUM">Medium Priority</option>
                                            <option value="HIGH">High Priority</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Segment</label>
                                        <select
                                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none"
                                            value={newBroadcast.target}
                                            onChange={(e) => setNewBroadcast({ ...newBroadcast, target: e.target.value as any })}
                                        >
                                            <option value="ALL">All Clients</option>
                                            <option value="STARTER">Starter Tier only</option>
                                            <option value="GROWTH">Growth Tier only</option>
                                            <option value="ELITE">Elite Tier only</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-50 flex items-center gap-4">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={saving}
                                className="flex-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {saving ? 'Broadcasting...' : 'Blast Announcement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
