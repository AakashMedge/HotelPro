'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface BillItem {
    id: string;
    itemName: string;
    quantity: number;
    priceSnapshot: number;
}

interface BillData {
    id: string;
    invoiceNo: string;
    tableId: string;
    tableCode: string;
    customerName: string;
    customerPhone?: string;
    guests: number;
    billType: string;
    cashierName: string;
    paymentMethod: string;
    closedAt: string;
    subtotal: number;
    discountAmount: number;
    gstAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
    appliedGstRate: number;
    appliedServiceRate: number;
    items: BillItem[];
    settings: {
        businessName: string;
        gstin?: string;
        currencySymbol: string;
        address?: string;
    };
}

export default function BillReceiptPage() {
    const { tableId, orderId } = useParams();
    const router = useRouter();
    const screenRef = useRef<HTMLDivElement>(null);

    const [bill, setBill] = useState<BillData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const fetchBill = useCallback(async () => {
        try {
            const [orderRes, settingsRes] = await Promise.all([
                fetch(`/api/orders/${orderId}`),
                fetch('/api/settings'),
            ]);
            const [orderData, settingsData] = await Promise.all([orderRes.json(), settingsRes.json()]);

            if (orderData.success && orderData.order) {
                const o = orderData.order;
                const itemsList: BillItem[] = (o.items || []).map((i: any) => ({
                    id: i.id || i.menuItemId,
                    itemName: i.itemName || i.name || 'Item',
                    quantity: Number(i.quantity || 1),
                    priceSnapshot: Number(i.price || i.priceSnapshot || 0),
                }));

                const dateStr = o.closedAt || o.createdAt || new Date().toISOString();
                const d = new Date(dateStr);
                const yr = String(d.getFullYear()).slice(-2);
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                const dy = String(d.getDate()).padStart(2, '0');
                const invoiceNo = `INV-${yr}${mo}${dy}-${String(o.id).slice(-4).toUpperCase()}`;

                const computedSubtotal = Number(o.subtotal || itemsList.reduce((sum, item) => sum + (item.priceSnapshot * item.quantity), 0));
                const computedGst = Number(o.gstAmount || 0);
                const computedService = Number(o.serviceChargeAmount || 0);
                const computedDiscount = Number(o.discountAmount || 0);
                const computedGrandTotal = Number(o.grandTotal || Math.round(computedSubtotal - computedDiscount + computedGst + computedService));

                setBill({
                    id: o.id,
                    invoiceNo,
                    tableId: o.tableId || (tableId as string),
                    tableCode: o.tableCode || o.table?.tableCode || 'T-01',
                    customerName: o.customerName || 'Aakash',
                    customerPhone: o.customerPhone || undefined,
                    guests: o.guests || 2,
                    billType: 'Dine In',
                    cashierName: 'Staff',
                    paymentMethod: o.paymentMethod || 'CASH',
                    closedAt: dateStr,
                    subtotal: computedSubtotal,
                    discountAmount: computedDiscount,
                    gstAmount: computedGst,
                    serviceChargeAmount: computedService,
                    grandTotal: computedGrandTotal,
                    appliedGstRate: Number(o.appliedGstRate || 5),
                    appliedServiceRate: Number(o.appliedServiceRate || 5),
                    items: itemsList,
                    settings: {
                        businessName: settingsData.settings?.businessName || 'Shalu Dhaba',
                        gstin: settingsData.settings?.gstin,
                        currencySymbol: settingsData.settings?.currencySymbol || '₹',
                        address: settingsData.settings?.address,
                    },
                });
            }
        } catch (err) {
            console.error('[BILL_RECEIPT]', err);
        } finally {
            setLoading(false);
        }
    }, [orderId, tableId]);

    useEffect(() => {
        setMounted(true);
        fetchBill();
    }, [fetchBill]);

    const handlePrint = () => {
        window.print();
    };

    const handleEditBill = () => {
        router.push(`/billing/pos/${tableId}?orderId=${orderId}`);
    };

    const handleFinishAndClose = async () => {
        try {
            await fetch(`/api/orders/${orderId}/settle`, {
                method: 'POST',
            });
        } catch (e) {
            console.error('[FINISH_SETTLE_ERROR]', e);
        }
        router.push('/billing/pos');
    };

    if (!mounted) return null;

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-[#F8F9FA]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-2 border-zinc-200 border-t-[#065F46] rounded-full animate-spin" />
                <span className="text-xs font-medium text-zinc-500">Generating Invoice...</span>
            </div>
        </div>
    );

    if (!bill) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#F8F9FA]">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Invoice Record Not Found</p>
            <button onClick={() => router.push('/billing/pos')} className="px-6 py-2.5 bg-[#065F46] text-white rounded-lg text-xs font-semibold">
                Back to POS
            </button>
        </div>
    );

    const sym = bill.settings.currencySymbol;
    const billDate = new Date(bill.closedAt);
    const dateFormatted = billDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const cgstRate = (bill.appliedGstRate / 2).toFixed(1);
    const cgstAmt = (bill.gstAmount / 2).toFixed(2);
    const sgstRate = (bill.appliedGstRate / 2).toFixed(1);
    const sgstAmt = (bill.gstAmount / 2).toFixed(2);

    const rawTotal = bill.subtotal - bill.discountAmount + bill.gstAmount + bill.serviceChargeAmount;
    const roundOff = Math.round((bill.grandTotal - rawTotal) * 100) / 100;

    return (
        <div className="min-h-full bg-[#F8F9FA] flex flex-col overflow-y-auto font-sans text-zinc-800 pb-12">

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 1. ON-SCREEN PREVIEW UI (Hidden when printing)           */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div className="print:hidden grow flex items-start justify-center px-4 py-8">
                <motion.div
                    ref={screenRef}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-6 md:p-8 space-y-6"
                >

                    {/* TAX INVOICE TITLE */}
                    <div className="text-center space-y-1">
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900 uppercase">TAX INVOICE</h2>
                        <p className="text-xs font-semibold text-zinc-700">{bill.settings.businessName}</p>
                        {bill.settings.gstin && (
                            <p className="text-[11px] text-zinc-500 font-mono">GSTIN: {bill.settings.gstin}</p>
                        )}
                        <p className="text-xs font-medium text-zinc-500 font-mono">Invoice No: {bill.invoiceNo}</p>
                    </div>

                    {/* METADATA GRID (2 COLUMNS) */}
                    <div className="pt-4 border-t border-zinc-200/80 grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                            <span className="text-zinc-500 block">Bill Date & Time</span>
                            <span className="font-semibold text-zinc-900">{dateFormatted}, {timeFormatted}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-zinc-500 block">Table No.</span>
                            <span className="font-bold text-zinc-900">{bill.tableCode}</span>
                        </div>

                        <div>
                            <span className="text-zinc-500 block">Customer Name</span>
                            <span className="font-semibold text-zinc-900">{bill.customerName}</span>
                            {bill.customerPhone && (
                                <span className="text-[11px] font-mono text-zinc-500 block">{bill.customerPhone}</span>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="text-zinc-500 block">Guests</span>
                            <span className="font-semibold text-zinc-900">{bill.guests}</span>
                        </div>

                        <div>
                            <span className="text-zinc-500 block">Bill Type</span>
                            <span className="font-semibold text-zinc-900">{bill.billType}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-zinc-500 block">Cashier</span>
                            <span className="font-semibold text-zinc-900">{bill.cashierName}</span>
                        </div>
                    </div>

                    {/* ITEMIZED TABLE */}
                    <div className="border border-zinc-200/80 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-[#262626] text-white">
                                <tr>
                                    <th className="py-2.5 px-3 text-center font-bold w-8">#</th>
                                    <th className="py-2.5 px-3 text-left font-bold">Item</th>
                                    <th className="py-2.5 px-3 text-center font-bold">Qty</th>
                                    <th className="py-2.5 px-3 text-right font-bold">Rate ({sym})</th>
                                    <th className="py-2.5 px-3 text-right font-bold">Amount ({sym})</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200/60 bg-white">
                                {bill.items.map((item, idx) => (
                                    <tr key={item.id || idx}>
                                        <td className="py-3 px-3 text-center font-medium text-zinc-500">{idx + 1}</td>
                                        <td className="py-3 px-3 text-left font-semibold text-zinc-900">{item.itemName}</td>
                                        <td className="py-3 px-3 text-center font-semibold text-zinc-700">{item.quantity}</td>
                                        <td className="py-3 px-3 text-right font-medium text-zinc-700">{item.priceSnapshot.toFixed(2)}</td>
                                        <td className="py-3 px-3 text-right font-bold text-zinc-900">{(item.quantity * item.priceSnapshot).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* TOTALS & TAX BREAKDOWN */}
                    <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between text-zinc-600">
                            <span>Subtotal</span>
                            <span className="font-bold text-zinc-900">{sym}{bill.subtotal.toFixed(2)}</span>
                        </div>

                        {bill.discountAmount > 0 && (
                            <div className="flex justify-between text-emerald-700 font-medium">
                                <span>Discount</span>
                                <span>- {sym}{bill.discountAmount.toFixed(2)}</span>
                            </div>
                        )}

                        {bill.gstAmount > 0 && (
                            <>
                                <div className="flex justify-between text-zinc-500">
                                    <span>CGST ({cgstRate}%)</span>
                                    <span className="font-semibold text-zinc-800">{sym}{cgstAmt}</span>
                                </div>
                                <div className="flex justify-between text-zinc-500">
                                    <span>SGST ({sgstRate}%)</span>
                                    <span className="font-semibold text-zinc-800">{sym}{sgstAmt}</span>
                                </div>
                            </>
                        )}

                        {bill.serviceChargeAmount > 0 && (
                            <div className="flex justify-between text-zinc-500">
                                <span>Service Charge ({bill.appliedServiceRate}%)</span>
                                <span className="font-semibold text-zinc-800">{sym}{bill.serviceChargeAmount.toFixed(2)}</span>
                            </div>
                        )}

                        {roundOff !== 0 && (
                            <div className="flex justify-between text-zinc-500">
                                <span>Round Off</span>
                                <span className="font-semibold text-zinc-800">{roundOff > 0 ? `+${sym}${roundOff.toFixed(2)}` : `-${sym}${Math.abs(roundOff).toFixed(2)}`}</span>
                            </div>
                        )}

                        <div className="h-px bg-zinc-200/80 my-2" />

                        <div className="flex justify-between items-baseline pt-1">
                            <span className="text-sm font-bold text-zinc-900">Grand Total</span>
                            <span className="text-2xl font-bold text-zinc-900">{sym}{bill.grandTotal.toFixed(2)}</span>
                        </div>

                        <div className="pt-2 border-t border-zinc-200/60 grid grid-cols-2 text-xs">
                            <div>
                                <span className="text-zinc-500 block">Payment Mode</span>
                                <span className="font-bold text-emerald-700">{bill.paymentMethod}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-zinc-500 block">Payment Status</span>
                                <span className="font-bold text-emerald-700">Paid</span>
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                        <button
                            onClick={handleEditBill}
                            className="py-2.5 px-3 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                            <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit Bill</span>
                        </button>

                        <button
                            onClick={handlePrint}
                            className="py-2.5 px-3 bg-[#065F46] hover:bg-[#044E39] text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>Print</span>
                        </button>

                        <button
                            onClick={handleFinishAndClose}
                            className="py-2.5 px-3 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs col-span-1 sm:col-span-1"
                        >
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Finish & Next</span>
                        </button>
                    </div>

                    {/* BARCODE & THANK YOU FOOTER */}
                    <div className="text-center space-y-3 pt-3">
                        <p className="text-xs font-bold text-zinc-800">Thank you! Visit again.</p>

                        <div className="flex flex-col items-center justify-center">
                            <div className="h-10 w-48 bg-zinc-900 rounded-xs flex items-center justify-between px-2 overflow-hidden">
                                {Array.from({ length: 42 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="h-full bg-white"
                                        style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px` }}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 mt-1 tracking-widest">{bill.invoiceNo}</span>
                        </div>

                        <p className="text-[10px] text-zinc-400 font-medium">
                            HotelPro &nbsp;|&nbsp; Made with ❤️ &nbsp;|&nbsp; Help us improve
                        </p>
                    </div>

                </motion.div>
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 2. AUTHENTIC 80mm THERMAL RECEIPT (PRINT OUTPUT ONLY)      */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div id="thermal-print-receipt" className="hidden print:block font-mono">
                <div className="text-center font-bold text-base uppercase mb-0.5">
                    {bill.settings.businessName}
                </div>
                {bill.settings.gstin && (
                    <div className="text-center text-[10px] uppercase mb-0.5">
                        GSTIN: {bill.settings.gstin}
                    </div>
                )}
                
                <div className="text-center text-[10px] font-mono overflow-hidden whitespace-nowrap my-0.5">
                    --------------------------------------------------
                </div>
                <div className="text-center font-bold text-sm tracking-wider uppercase mb-0.5">
                    *** TAX INVOICE ***
                </div>
                <div className="text-center text-[10px] font-mono overflow-hidden whitespace-nowrap my-0.5">
                    --------------------------------------------------
                </div>

                {/* RECEIPT HEADER DETAILS */}
                <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                        <span>INV NO: {bill.invoiceNo}</span>
                        <span>TBL: {bill.tableCode}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>DATE: {dateFormatted}</span>
                        <span>TIME: {timeFormatted}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>CASHIER: {bill.cashierName}</span>
                        <span>CUST: {bill.customerName}</span>
                    </div>
                    {bill.customerPhone && (
                        <div className="flex justify-between">
                            <span>MOB: {bill.customerPhone}</span>
                        </div>
                    )}
                </div>

                <div className="text-center text-[10px] font-mono overflow-hidden whitespace-nowrap my-0.5">
                    --------------------------------------------------
                </div>

                {/* ITEMS LIST */}
                <div className="text-xs space-y-1">
                    <div className="flex justify-between font-bold border-b border-black pb-0.5">
                        <span>ITEM</span>
                        <span className="text-right">AMT ({sym})</span>
                    </div>
                    {bill.items.map((item, idx) => (
                        <div key={item.id || idx} className="space-y-0.5">
                            <div className="flex justify-between font-bold">
                                <span className="uppercase">{item.itemName}</span>
                                <span>{(item.quantity * item.priceSnapshot).toFixed(2)}</span>
                            </div>
                            <div className="text-[10px] text-zinc-700 pl-2">
                                {item.quantity} x {sym}{item.priceSnapshot.toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center text-[10px] font-mono overflow-hidden whitespace-nowrap my-0.5">
                    --------------------------------------------------
                </div>

                {/* TOTALS BREAKDOWN */}
                <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                        <span>SUBTOTAL</span>
                        <span>{sym}{bill.subtotal.toFixed(2)}</span>
                    </div>

                    {bill.discountAmount > 0 && (
                        <div className="flex justify-between font-bold">
                            <span>DISCOUNT</span>
                            <span>-{sym}{bill.discountAmount.toFixed(2)}</span>
                        </div>
                    )}

                    {bill.gstAmount > 0 && (
                        <>
                            <div className="flex justify-between text-[11px]">
                                <span>CGST ({cgstRate}%)</span>
                                <span>{sym}{cgstAmt}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span>SGST ({sgstRate}%)</span>
                                <span>{sym}{sgstAmt}</span>
                            </div>
                        </>
                    )}

                    {bill.serviceChargeAmount > 0 && (
                        <div className="flex justify-between text-[11px]">
                            <span>SERVICE CHARGE ({bill.appliedServiceRate}%)</span>
                            <span>{sym}{bill.serviceChargeAmount.toFixed(2)}</span>
                        </div>
                    )}

                    {roundOff !== 0 && (
                        <div className="flex justify-between text-[11px]">
                            <span>ROUND OFF</span>
                            <span>{roundOff > 0 ? `+${sym}${roundOff.toFixed(2)}` : `-${sym}${Math.abs(roundOff).toFixed(2)}`}</span>
                        </div>
                    )}

                    <div className="text-center text-[10px] font-mono overflow-hidden whitespace-nowrap my-0.5">
                        --------------------------------------------------
                    </div>

                    <div className="flex justify-between font-bold text-sm pt-0.5">
                        <span>TOTAL AMOUNT</span>
                        <span>{sym}{bill.grandTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-xs pt-0.5">
                        <span>PAYMENT ({bill.paymentMethod})</span>
                        <span className="font-bold">PAID</span>
                    </div>
                </div>

                <div className="text-center text-[10px] font-mono overflow-hidden whitespace-nowrap my-1">
                    --------------------------------------------------
                </div>

                {/* RECEIPT FOOTER */}
                <div className="text-center space-y-1.5">
                    <p className="text-xs font-bold uppercase">THANK YOU FOR DINING WITH US!</p>

                    <div className="flex flex-col items-center justify-center pt-0.5">
                        <div className="h-8 w-44 bg-black rounded-xs flex items-center justify-between px-2 overflow-hidden">
                            {Array.from({ length: 38 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-full bg-white"
                                    style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px` }}
                                />
                            ))}
                        </div>
                        <span className="text-[9px] font-mono mt-0.5">{bill.invoiceNo}</span>
                    </div>

                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest pt-0.5">
                        HotelPro | Made with ❤️ | Help us improve
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 3. STYLESHEET: SUPPRESS BROWSER HEADER/FOOTERS & PRINT CSS */}
            {/* ══════════════════════════════════════════════════════════ */}
            <style jsx global>{`
                @page {
                    margin: 0mm !important;
                    size: 80mm auto !important;
                }
                @media print {
                    /* Suppress default browser header (URL/Title) and footer (Date/Page) */
                    header, footer, nav, aside, button, .print\\:hidden {
                        display: none !important;
                    }
                    html, body, main {
                        height: auto !important;
                        overflow: visible !important;
                        background: #ffffff !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        font-family: 'Courier New', Courier, monospace !important;
                    }
                    #thermal-print-receipt {
                        display: block !important;
                        visibility: visible !important;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        margin: 0 auto !important;
                        padding: 4mm 3mm !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'Courier New', Courier, monospace !important;
                    }
                }
            `}</style>
        </div>
    );
}
