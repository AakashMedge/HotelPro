'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCode, Download, Plus, Layers, Trash2, Edit3,
    RefreshCw, Eye, Copy, Check, Building2, Wifi,
    Shield, ChevronDown, X, ArrowRight, Printer,
    RotateCcw, Ban, Zap, Grid3X3, MoreVertical, LayoutGrid, Power
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

type QRData = {
    id: string;
    shortCode: string;
    version: number;
    scanCount: number;
    lastScannedAt: string | null;
    createdAt: string;
};

type TableData = {
    id: string;
    tableCode: string;
    status: string;
    capacity: number;
    floorId: string | null;
    qrCodes: QRData[];
};

type FloorData = {
    id: string;
    name: string;
    type: string;
    prefix: string;
    sortOrder: number;
    isActive: boolean;
    tables: TableData[];
    _count: { tables: number };
};

const FLOOR_TYPES = [
    { value: 'MAIN_HALL', label: 'Main Hall', icon: '🏛️' },
    { value: 'AC_ROOM', label: 'AC Room', icon: '❄️' },
    { value: 'ROOFTOP', label: 'Rooftop', icon: '🌆' },
    { value: 'VIP', label: 'VIP Lounge', icon: '👑' },
    { value: 'OUTDOOR', label: 'Outdoor', icon: '🌿' },
    { value: 'BAR', label: 'Bar', icon: '🍸' },
    { value: 'BANQUET', label: 'Banquet Hall', icon: '🎉' },
    { value: 'CUSTOM', label: 'Custom', icon: '✨' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
    MAIN_HALL: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', accent: 'bg-indigo-600' },
    AC_ROOM: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', accent: 'bg-cyan-600' },
    ROOFTOP: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', accent: 'bg-amber-600' },
    VIP: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', accent: 'bg-purple-600' },
    OUTDOOR: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', accent: 'bg-emerald-600' },
    BAR: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', accent: 'bg-rose-600' },
    BANQUET: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', accent: 'bg-orange-600' },
    CUSTOM: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', accent: 'bg-slate-600' },
};

export default function AdminArchitecturePage() {
    const [loading, setLoading] = useState(true);
    const [floors, setFloors] = useState<FloorData[]>([]);
    const [unassignedTables, setUnassignedTables] = useState<TableData[]>([]);
    const [expandedFloor, setExpandedFloor] = useState<string | null>(null);

    // Modals
    const [showCreateFloor, setShowCreateFloor] = useState(false);
    const [showQRPreview, setShowQRPreview] = useState<{ tableCode: string; url: string; shortCode: string } | null>(null);
    const [showAssignModal, setShowAssignModal] = useState<TableData | null>(null);

    // Form state
    const [showCreateTable, setShowCreateTable] = useState<{ floorId: string; floorName: string } | null>(null);
    const [newTable, setNewTable] = useState({ tableCode: '', capacity: 4 });
    const [newFloor, setNewFloor] = useState({ name: '', type: 'MAIN_HALL', prefix: '' });
    const [creating, setCreating] = useState(false);
    const [generatingQR, setGeneratingQR] = useState<string | null>(null);
    const [downloadingQR, setDownloadingQR] = useState<string | null>(null);
    const [batchGenerating, setBatchGenerating] = useState<string | null>(null);
    const [exportingPDF, setExportingPDF] = useState<string | null>(null);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // ─── Fetch all data ───
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/floors');
            const data = await res.json();
            if (data.success) {
                setFloors(data.floors);
                setUnassignedTables(data.unassignedTables);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Create Floor ───
    const handleCreateFloor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFloor.name || !newFloor.prefix) return;
        setCreating(true);
        try {
            const res = await fetch('/api/floors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFloor),
            });
            const data = await res.json();
            if (data.success) {
                setShowCreateFloor(false);
                setNewFloor({ name: '', type: 'MAIN_HALL', prefix: '' });
                flashMessage('success', `Zone "${data.floor.name}" created successfully.`);
                fetchData();
            } else {
                flashMessage('error', data.error || 'Failed to create zone');
            }
        } catch {
            flashMessage('error', 'Connection error');
        } finally {
            setCreating(false);
        }
    };

    // ─── Create Table ───
    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTable.tableCode || !showCreateTable) return;
        setCreating(true);
        try {
            const res = await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newTable, floorId: showCreateTable.floorId }),
            });
            const data = await res.json();
            if (data.success) {
                setShowCreateTable(null);
                setNewTable({ tableCode: '', capacity: 4 });
                flashMessage('success', `Table "${data.table.tableCode}" created with Auto-QR.`);
                fetchData();
            } else {
                flashMessage('error', data.error || 'Failed to create table');
            }
        } catch {
            flashMessage('error', 'Connection error');
        } finally {
            setCreating(false);
        }
    };

    // ─── Delete Floor ───
    const handleDeleteFloor = async (id: string, name: string) => {
        if (!confirm(`Delete zone "${name}"? All tables will be unassigned.`)) return;
        try {
            const res = await fetch(`/api/floors?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                flashMessage('success', data.message);
                fetchData();
            } else {
                flashMessage('error', data.error);
            }
        } catch {
            flashMessage('error', 'Failed to delete zone');
        }
    };

    // ─── Generate QR ───
    const handleGenerateQR = async (tableId: string) => {
        setGeneratingQR(tableId);
        try {
            const res = await fetch('/api/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', tableId }),
            });
            const data = await res.json();
            if (data.success) {
                setShowQRPreview({
                    tableCode: data.qrCode.tableCode,
                    url: data.qrCode.url,
                    shortCode: data.qrCode.shortCode,
                });
                fetchData();
            } else {
                flashMessage('error', data.error);
            }
        } catch {
            flashMessage('error', 'QR generation failed');
        } finally {
            setGeneratingQR(null);
        }
    };

    // ─── Batch Generate QR ───
    const handleBatchGenerate = async (floorId: string) => {
        setBatchGenerating(floorId);
        try {
            const res = await fetch('/api/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'batch-generate', floorId }),
            });
            const data = await res.json();
            if (data.success) {
                flashMessage('success', `${data.generated} QR codes generated. ${data.skipped} already had QR.`);
                fetchData();
            } else {
                flashMessage('error', data.error);
            }
        } catch {
            flashMessage('error', 'Batch generation failed');
        } finally {
            setBatchGenerating(null);
        }
    };

    // ─── Download Single QR ───
    const handleDownloadSingleQR = async (tableCode: string, tableId: string, shortCode: string) => {
        setDownloadingQR(tableId);
        try {
            const res = await fetch('/api/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get-url', tableId }),
            });
            const data = await res.json();
            if (data.success && data.qrCode?.url) {
                const qrDataUrl = await QRCode.toDataURL(data.qrCode.url, { width: 400, margin: 2 });
                const link = document.createElement("a");
                link.download = `${shortCode}.png`;
                link.href = qrDataUrl;
                link.click();
            } else {
                flashMessage('error', 'Could not get QR URL');
            }
        } catch {
            flashMessage('error', 'Download failed');
        } finally {
            setDownloadingQR(null);
        }
    };

    // ─── Export Floor QRs to PDF ───
    const handleExportFloorPDF = async (floor: FloorData) => {
        setExportingPDF(floor.id);
        try {
            const res = await fetch('/api/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get-urls-for-floor', floorId: floor.id }),
            });
            const data = await res.json();
            if (data.success && data.results?.length > 0) {
                const doc = new jsPDF();
                const pageWidth = doc.internal.pageSize.getWidth();

                const margin = 20;
                const size = 60; // QR size
                const cols = 2;
                const rows = 3;
                const xGap = (pageWidth - (margin * 2) - (size * cols)) / (cols - 1);
                const yGap = 35;

                let index = 0;
                for (const qr of data.results) {
                    if (index > 0 && index % (cols * rows) === 0) {
                        doc.addPage();
                    }

                    const gridPos = index % (cols * rows);
                    const col = gridPos % cols;
                    const row = Math.floor(gridPos / cols);

                    const x = margin + col * (size + xGap);
                    const y = margin + row * (size + yGap + 20);

                    // Add Title
                    doc.setFontSize(16);
                    doc.setFont("helvetica", "bold");
                    doc.text(`Table: ${qr.tableCode}`, x + (size / 2), y - 5, { align: 'center' });

                    // Generate QR Image using data URL
                    const imgData = await QRCode.toDataURL(qr.url, { width: 400, margin: 1 });
                    doc.addImage(imgData, 'PNG', x, y, size, size);

                    // Add Short Code
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text(`Code: ${qr.shortCode}`, x + (size / 2), y + size + 7, { align: 'center' });

                    index++;
                }

                doc.save(`${floor.name.replace(/\s+/g, '_')}_QR_Codes.pdf`);
                flashMessage('success', `Exported ${data.results.length} QR codes as PDF`);
            } else {
                flashMessage('error', data.error || 'No active QRs to export.');
            }
        } catch {
            flashMessage('error', 'PDF Export failed');
        } finally {
            setExportingPDF(null);
        }
    };

    // ─── Rotate QR ───
    const handleRotateQR = async (tableId: string) => {
        if (!confirm('Rotate QR? This will invalidate the current QR code. Any photographed QR will stop working.')) return;
        try {
            const res = await fetch('/api/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'rotate', tableId }),
            });
            const data = await res.json();
            if (data.success) {
                flashMessage('success', `QR rotated to v${data.qrCode.version}`);
                setShowQRPreview({
                    tableCode: `v${data.qrCode.version}`,
                    url: data.qrCode.url,
                    shortCode: data.qrCode.shortCode,
                });
                fetchData();
            } else {
                flashMessage('error', data.error);
            }
        } catch {
            flashMessage('error', 'QR rotation failed');
        }
    };

    // ─── Revoke QR ───
    const handleRevokeQR = async (tableId: string) => {
        if (!confirm('REVOKE all QR codes for this table? This is irreversible — you will need to generate a new QR.')) return;
        try {
            const res = await fetch('/api/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke', tableId }),
            });
            const data = await res.json();
            if (data.success) {
                flashMessage('success', `${data.revokedCount} QR code(s) revoked.`);
                fetchData();
            } else {
                flashMessage('error', data.error);
            }
        } catch {
            flashMessage('error', 'QR revocation failed');
        }
    };

    // ─── Assign Table to Floor ───
    const handleAssignTable = async (tableId: string, floorId: string | null) => {
        try {
            const res = await fetch('/api/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'assign-table', tableId, floorId }),
            });
            const data = await res.json();
            if (data.success) {
                flashMessage('success', 'Table reassigned.');
                setShowAssignModal(null);
                fetchData();
            } else {
                flashMessage('error', data.error);
            }
        } catch {
            flashMessage('error', 'Assignment failed');
        }
    };

    // ─── Flash Message ───
    const flashMessage = (type: 'success' | 'error', text: string) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage(null), 4000);
    };

    // Stats
    const totalTables = floors.reduce((acc, f) => acc + f.tables.length, 0) + unassignedTables.length;
    const totalQR = floors.reduce((acc, f) => acc + f.tables.filter(t => t.qrCodes.length > 0).length, 0)
        + unassignedTables.filter(t => t.qrCodes.length > 0).length;
    const qrCoverage = totalTables > 0 ? Math.round((totalQR / totalTables) * 100) : 0;

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Architecture...</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto pb-32">

            {/* ── Flash Messages ── */}
            <AnimatePresence>
                {actionMessage && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                        className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 ${actionMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            }`}
                    >
                        {actionMessage.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {actionMessage.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Property Architecture</h1>
                            <p className="text-sm font-medium text-slate-500">Design zones, assign table nodes, and generate QR identities.</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCreateFloor(true)}
                        className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Zone
                    </button>
                    <button
                        onClick={fetchData}
                        className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Zones</p>
                    <p className="text-3xl font-bold text-slate-900">{floors.length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tables</p>
                    <p className="text-3xl font-bold text-slate-900">{totalTables}</p>
                </div>
                <div className={`p-6 rounded-3xl border shadow-sm ${qrCoverage === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' : 'bg-amber-50 text-amber-700 border-amber-100/50'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1">QR Coverage</p>
                    <p className="text-3xl font-bold">{qrCoverage}%</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 p-6 rounded-3xl border border-indigo-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Active QR Codes</p>
                    <p className="text-3xl font-bold">{totalQR}</p>
                </div>
            </div>

            {/* ── Zone Cards ── */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 px-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Zone Deployment Registry</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {floors.map(floor => {
                        const colors = TYPE_COLORS[floor.type] || TYPE_COLORS.CUSTOM;
                        const floorType = FLOOR_TYPES.find(ft => ft.value === floor.type);
                        const tablesWithQR = floor.tables.filter(t => t.qrCodes.length > 0).length;
                        const isExpanded = expandedFloor === floor.id;

                        return (
                            <motion.div
                                key={floor.id}
                                layout
                                className={`bg-white rounded-4xl border shadow-sm overflow-hidden transition-all ${isExpanded ? 'col-span-1 md:col-span-2 xl:col-span-3 border-indigo-200' : `${colors.border}`}`}
                            >
                                {/* Floor Header */}
                                <div className="p-6 pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl ${colors.bg}`}>
                                                {floorType?.icon || '🏢'}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900 tracking-tight">{floor.name}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${colors.text}`}>{floorType?.label}</span>
                                                    <span className="text-[10px] font-bold text-slate-300">•</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{floor.prefix}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleDeleteFloor(floor.id, floor.name)}
                                                className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl">
                                            <Grid3X3 className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-600">{floor.tables.length} Tables</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl">
                                            <QrCode className="w-3 h-3 text-slate-400" />
                                            <span className={`text-[10px] font-bold ${tablesWithQR === floor.tables.length && floor.tables.length > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {tablesWithQR}/{floor.tables.length} QR
                                            </span>
                                        </div>
                                        {!floor.isActive && (
                                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl">Inactive</span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="px-6 pb-4 flex gap-2">
                                    <button
                                        onClick={() => setShowCreateTable({ floorId: floor.id, floorName: floor.name })}
                                        className="flex-1 py-2.5 bg-indigo-50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-indigo-600 flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Table
                                    </button>
                                    <button
                                        onClick={() => setExpandedFloor(isExpanded ? null : floor.id)}
                                        className={`flex-[0.8] py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-indigo-600 hover:text-white'}`}
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        {isExpanded ? 'Hide' : 'View'}
                                    </button>
                                    <button
                                        onClick={() => handleBatchGenerate(floor.id)}
                                        disabled={batchGenerating === floor.id || floor.tables.length === 0}
                                        className="flex-[0.8] py-2.5 bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-1.5 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-40"
                                    >
                                        {batchGenerating === floor.id ? (
                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Zap className="w-3 h-3" />
                                        )}
                                        Batch
                                    </button>
                                    <button
                                        onClick={() => handleExportFloorPDF(floor)}
                                        disabled={exportingPDF === floor.id || tablesWithQR === 0}
                                        className="flex-[0.8] py-2.5 bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-1.5 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-40"
                                    >
                                        {exportingPDF === floor.id ? (
                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Printer className="w-3 h-3" />
                                        )}
                                        PDF
                                    </button>
                                </div>

                                {/* Expanded Tables Grid */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                                                {floor.tables.length === 0 ? (
                                                    <div className="text-center py-12 bg-slate-50 rounded-2xl">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No tables assigned to this zone yet.</p>
                                                        <p className="text-xs text-slate-400 mt-2">Assign tables from the "Unassigned" section below.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                        {floor.tables.map(table => {
                                                            const hasQR = table.qrCodes.length > 0;
                                                            const qr = table.qrCodes[0];
                                                            return (
                                                                <div key={table.id} className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-lg transition-all group relative">

                                                                    {/* Quick Download */}
                                                                    {hasQR && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDownloadSingleQR(table.tableCode, table.id, qr.shortCode);
                                                                            }}
                                                                            disabled={downloadingQR === table.id}
                                                                            title="Download PNG"
                                                                            className="absolute top-2 right-2 p-1.5 bg-slate-50 shadow-sm opacity-0 group-hover:opacity-100 hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 rounded-lg transition-all z-10"
                                                                        >
                                                                            {downloadingQR === table.id ? (
                                                                                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                            ) : (
                                                                                <Download className="w-3.5 h-3.5" />
                                                                            )}
                                                                        </button>
                                                                    )}

                                                                    <div className="text-center">
                                                                        <p className="text-2xl font-black text-slate-900 tracking-tight">{table.tableCode}</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{table.capacity} Seats</p>
                                                                    </div>

                                                                    {/* QR Status */}
                                                                    <div className={`mt-3 py-1.5 rounded-lg text-center text-[9px] font-bold uppercase tracking-widest ${hasQR
                                                                        ? 'bg-emerald-50 text-emerald-600'
                                                                        : 'bg-slate-50 text-slate-400'
                                                                        }`}>
                                                                        {hasQR ? `QR v${qr.version}` : 'No QR'}
                                                                    </div>

                                                                    {hasQR && qr.scanCount > 0 && (
                                                                        <p className="text-[8px] text-slate-400 text-center mt-1 font-bold">
                                                                            {qr.scanCount} scans
                                                                        </p>
                                                                    )}

                                                                    {/* Action Buttons */}
                                                                    <div className="mt-3 space-y-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        {!hasQR ? (
                                                                            <button
                                                                                onClick={() => handleGenerateQR(table.id)}
                                                                                disabled={generatingQR === table.id}
                                                                                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                                                                            >
                                                                                {generatingQR === table.id ? 'Generating...' : 'Generate QR'}
                                                                            </button>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleRotateQR(table.id)}
                                                                                    className="w-full py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center justify-center gap-1"
                                                                                >
                                                                                    <RotateCcw className="w-2.5 h-2.5" /> Rotate
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleRevokeQR(table.id)}
                                                                                    className="w-full py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-1"
                                                                                >
                                                                                    <Ban className="w-2.5 h-2.5" /> Revoke
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}

                    {/* ── Create Zone Card ── */}
                    <button
                        onClick={() => setShowCreateFloor(true)}
                        className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-4xl p-8 flex flex-col items-center justify-center gap-4 group hover:border-indigo-300 hover:bg-white transition-all min-h-[200px]"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-colors shadow-sm">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 group-hover:text-indigo-600">Initialize Zone</span>
                    </button>
                </div>
            </div>


            {/* ── Security Badge ── */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:scale-[1.7]">
                    <Shield className="w-48 h-48" />
                </div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                        <Shield className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-lg font-bold tracking-tight">QR Security Layer Active</h4>
                        <p className="text-xs font-medium text-slate-400 max-w-md leading-relaxed">
                            256-bit cryptographic tokens · HMAC signatures · Session binding · Rate limiting · Auto-rotation support
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-2xl">
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400">Protected</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════ */}
            {/* MODALS */}
            {/* ═══════════════════════════════════════════════ */}

            {/* ── Create Floor Modal ── */}
            <AnimatePresence>
                {showCreateFloor && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100"
                        >
                            <div className="p-10">
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Building2 className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Initialize New Zone</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Property Architecture Node</p>
                                </div>

                                <form onSubmit={handleCreateFloor} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Zone Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newFloor.name}
                                            onChange={e => setNewFloor(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Main Hall, AC Room 1"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-4 ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Zone Type</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {FLOOR_TYPES.map(ft => (
                                                <button
                                                    key={ft.value}
                                                    type="button"
                                                    onClick={() => setNewFloor(prev => ({ ...prev, type: ft.value }))}
                                                    className={`py-3 rounded-xl text-center transition-all border ${newFloor.type === ft.value
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    <span className="text-lg block">{ft.icon}</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-widest mt-1 block">{ft.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Prefix Code (2-5 chars)</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={5}
                                            value={newFloor.prefix}
                                            onChange={e => setNewFloor(prev => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                                            placeholder="e.g. MH, AC, VIP"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold uppercase tracking-widest placeholder:text-slate-300 focus:ring-4 ring-indigo-500/10 outline-none transition-all text-center"
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateFloor(false)}
                                            className="flex-1 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 active:scale-95"
                                        >
                                            {creating ? 'Creating...' : 'Deploy Zone'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Create Table Modal ── */}
            <AnimatePresence>
                {showCreateTable && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100"
                        >
                            <div className="p-10">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Plus className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Table</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-4">
                                        Deploying into <span className="text-indigo-600">{showCreateTable.floorName}</span>
                                    </p>
                                </div>

                                <form onSubmit={handleCreateTable} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Table Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={newTable.tableCode}
                                            onChange={e => setNewTable({ ...newTable, tableCode: e.target.value.toUpperCase() })}
                                            placeholder="e.g. T-01, VIP-1"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-4 ring-emerald-500/10 outline-none transition-all uppercase"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Seating Capacity</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max="100"
                                            value={newTable.capacity}
                                            onChange={e => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 4 })}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-4 ring-emerald-500/10 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateTable(null)}
                                            className="flex-[0.8] py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {creating ? (
                                                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <QrCode className="w-3.5 h-3.5" />
                                            )}
                                            Add & Generate
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── QR Preview Modal ── */}
            <AnimatePresence>
                {showQRPreview && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 relative"
                        >
                            <button
                                onClick={() => setShowQRPreview(null)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                            >
                                <X size={20} />
                            </button>
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">QR Generated</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                    {showQRPreview.shortCode}
                                </p>

                                {/* Visual QR Code */}
                                <div className="mt-8 mb-6 flex justify-center bg-white p-4 rounded-3xl border border-slate-100 mx-auto shadow-sm" style={{ width: 'max-content' }}>
                                    <QRCodeCanvas
                                        id="qr-canvas"
                                        value={showQRPreview.url}
                                        size={180}
                                        level={"H"}
                                        includeMargin={false}
                                        bgColor={"#ffffff"}
                                        fgColor={"#000000"}
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => {
                                            const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
                                            if (canvas) {
                                                const pngUrl = canvas.toDataURL("image/png");
                                                const downloadLink = document.createElement("a");
                                                downloadLink.href = pngUrl;
                                                downloadLink.download = `${showQRPreview.shortCode}.png`;
                                                document.body.appendChild(downloadLink);
                                                downloadLink.click();
                                                document.body.removeChild(downloadLink);
                                            }
                                        }}
                                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
                                    >
                                        <Download className="w-4 h-4" /> Download PNG
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(showQRPreview.url);
                                            setCopiedUrl(true);
                                            setTimeout(() => setCopiedUrl(false), 2000);
                                        }}
                                        className="flex-1 py-4 bg-slate-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Assign Table Modal ── */}
            <AnimatePresence>
                {showAssignModal && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100"
                        >
                            <div className="p-10">
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Assign Table {showAssignModal.tableCode}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Select a zone</p>
                                </div>

                                <div className="space-y-2">
                                    {floors.map(floor => {
                                        const colors = TYPE_COLORS[floor.type] || TYPE_COLORS.CUSTOM;
                                        const floorType = FLOOR_TYPES.find(ft => ft.value === floor.type);
                                        return (
                                            <button
                                                key={floor.id}
                                                onClick={() => handleAssignTable(showAssignModal.id, floor.id)}
                                                className={`w-full p-4 rounded-2xl border flex items-center justify-between group hover:shadow-md transition-all ${colors.border} hover:border-indigo-300`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{floorType?.icon}</span>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-slate-900">{floor.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{floor._count.tables} tables</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                            </button>
                                        );
                                    })}

                                    {floors.length === 0 && (
                                        <div className="text-center py-8 bg-slate-50 rounded-2xl">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No zones created yet.</p>
                                            <p className="text-xs text-slate-400 mt-1">Create a zone first.</p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setShowAssignModal(null)}
                                    className="w-full mt-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
