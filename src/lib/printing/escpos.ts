// Universal ESC/POS Command Generator for Petpooja / Vyapar Style Thermal Receipts
// Supports 58mm (32 chars) and 80mm (48 chars) thermal printers with rich dark bold formatting + Native QR Code.

export interface ReceiptItem {
    name: string;
    qty: number;
    price: number;
    variant?: string;
    notes?: string;
}

export interface ReceiptData {
    businessName: string;
    tagline?: string;
    gstin?: string;
    phone?: string;
    address?: string;
    billNo?: string;
    invoiceNo: string;
    tableNo?: string;
    customerName?: string;
    customerPhone?: string;
    waiterName?: string;
    cashierName?: string;
    date?: string;
    items: ReceiptItem[];
    subtotal: number;
    discount?: number;
    gstAmount?: number;
    gstRate?: number;
    serviceCharge?: number;
    grandTotal: number;
    paymentMethod?: string;
    paperWidth?: '58mm' | '80mm';
    qrLink?: string;
}

export class EscPosBuilder {
    private buffer: number[] = [];
    private lineWidth: number;

    constructor(paperWidth: '58mm' | '80mm' = '58mm') {
        this.lineWidth = paperWidth === '58mm' ? 32 : 48;
        this.init();
    }

    private append(bytes: number[]) {
        this.buffer.push(...bytes);
    }

    private appendText(text: string) {
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            this.buffer.push(code < 128 ? code : 32);
        }
    }

    // 1. Initialize printer & set default density
    init() {
        this.append([0x1B, 0x40]); // ESC @ (Initialize)
        this.append([0x1B, 0x47, 0x01]); // ESC G 1 (Double strike mode on -> extra dark black font)
        return this;
    }

    // 2. Alignment
    align(align: 'left' | 'center' | 'right') {
        const val = align === 'left' ? 0 : align === 'center' ? 1 : 2;
        this.append([0x1B, 0x61, val]);
        return this;
    }

    // 3. Bold & Double strike for deep dark print
    bold(enable: boolean = true) {
        this.append([0x1B, 0x45, enable ? 1 : 0]); // ESC E n (Emphasized)
        this.append([0x1B, 0x47, enable ? 1 : 0]); // ESC G n (Double strike)
        return this;
    }

    // 4. Font Sizing (1 = normal, 2 = double width/height)
    size(width: 1 | 2 = 1, height: 1 | 2 = 1) {
        const val = ((width - 1) << 4) | (height - 1);
        this.append([0x1D, 0x21, val]); // GS ! n
        return this;
    }

    // 5. Output line
    line(text: string = '') {
        this.appendText(text + '\n');
        return this;
    }

    // 6. Dividers (single / double)
    divider(char: string = '-') {
        this.align('left');
        this.size(1, 1);
        this.bold(false);
        this.line(char.repeat(this.lineWidth));
        return this;
    }

    // 7. Two Column (Left text, Right text)
    twoColumn(left: string, right: string, isBold: boolean = false) {
        this.align('left');
        this.bold(isBold);
        const maxLeft = this.lineWidth - right.length - 1;
        let l = left;
        if (l.length > maxLeft) {
            l = l.substring(0, maxLeft);
        }
        const spaces = Math.max(1, this.lineWidth - l.length - right.length);
        this.line(l + ' '.repeat(spaces) + right);
        return this;
    }

    // 8. Three Column Item Row (Universal POS Format)
    itemRow(qty: number, name: string, price: number, variant?: string) {
        this.align('left');
        this.bold(false);
        const priceStr = price.toFixed(2);
        const qtyPrefix = `${qty}x `;
        const maxNameLen = this.lineWidth - qtyPrefix.length - priceStr.length - 1;

        let displayName = name.toUpperCase();
        if (displayName.length > maxNameLen) {
            displayName = displayName.substring(0, maxNameLen);
        }

        const leftSide = `${qtyPrefix}${displayName}`;
        const spaces = Math.max(1, this.lineWidth - leftSide.length - priceStr.length);
        this.line(leftSide + ' '.repeat(spaces) + priceStr);

        if (variant) {
            this.line(`   (${variant})`);
        }
        return this;
    }

    // 9. Native ESC/POS QR Code Generation
    qrCode(url: string) {
        this.align('center');
        const urlBytes: number[] = [];
        for (let i = 0; i < url.length; i++) {
            urlBytes.push(url.charCodeAt(i));
        }

        const len = urlBytes.length + 3;
        const pL = len % 256;
        const pH = Math.floor(len / 256);

        // Function 165: Select QR Model 2
        this.append([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
        // Function 167: Set Module Size (3-4 for 58mm, fits centered perfectly)
        this.append([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, this.lineWidth === 32 ? 0x04 : 0x05]);
        // Function 169: Error Correction Level M
        this.append([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]);
        // Function 180: Store Data
        this.append([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...urlBytes]);
        // Function 181: Print QR Symbol
        this.append([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);
        return this;
    }

    // 10. Feed & Paper Cut
    cut() {
        this.append([0x0A, 0x0A, 0x0A]); // Feed 3 lines
        this.append([0x1D, 0x56, 0x41, 0x03]); // GS V 65 3 (Partial cut with feed)
        return this;
    }

    // 11. Drawer Kick
    kickDrawer() {
        this.append([0x1B, 0x70, 0x00, 0x19, 0xFA]);
        return this;
    }

    build(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}

// Universal Petpooja / Vyapar Style Tax Invoice Formatter
export function generateEscPosReceipt(data: ReceiptData): Uint8Array {
    const is58 = (data.paperWidth || '58mm') === '58mm';
    const builder = new EscPosBuilder(is58 ? '58mm' : '80mm');
    const now = new Date();
    const dateStr = data.date || now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // 1. RESTAURANT NAME (Balanced Bold Header: Double Width, Standard Height)
    builder
        .align('center')
        .size(2, 1)
        .bold(true)
        .line(data.businessName || 'HOTELPRO RESTAURANT')
        .size(1, 1);

    // 2. HEADER DETAILS
    if (data.tagline) {
        builder.bold(false).line(data.tagline);
    }
    if (data.address) {
        builder.bold(false).line(data.address);
    }
    if (data.phone) {
        builder.bold(false).line(`Tel: ${data.phone}`);
    }

    if (data.gstin) {
        builder.line(`GSTIN: ${data.gstin}`);
    }

    builder.divider('=');

    // 3. BILL METADATA (BILL NO, TABLE, CASHIER, CUSTOMER, PHONE)
    const billNum = data.billNo || '#1';
    builder.twoColumn(`BILL NO: ${billNum}`, `TABLE: ${data.tableNo || 'N/A'}`);
    builder.twoColumn(`DATE: ${dateStr}`, `TIME: ${timeStr}`);
    if (data.cashierName || data.waiterName) {
        builder.line(`CASHIER: ${data.cashierName || data.waiterName}`);
    }
    builder.line(`CUSTOMER: ${data.customerName || 'Walk-in'}`);
    if (data.customerPhone) {
        builder.line(`PHONE: ${data.customerPhone}`);
    }

    builder.divider('-');

    // 4. ITEM TABLE HEADER (Bold)
    builder.twoColumn('ITEM', 'AMT (Rs)', true);
    builder.divider('-');

    // 5. ITEMIZED LIST
    for (const item of data.items) {
        builder.itemRow(item.qty, item.name, item.price * item.qty, item.variant);
        if (item.notes) {
            builder.line(`   * Note: ${item.notes}`);
        }
    }

    builder.divider('-');

    // 6. SUBTOTAL & TAX
    builder.twoColumn('SUBTOTAL', data.subtotal.toFixed(2));

    if (data.discount && data.discount > 0) {
        builder.twoColumn('DISCOUNT', `-${data.discount.toFixed(2)}`);
    }

    if (data.gstAmount && data.gstAmount > 0) {
        const halfRate = ((data.gstRate || 5) / 2).toFixed(1);
        const halfGst = (data.gstAmount / 2).toFixed(2);
        builder.twoColumn(`CGST (${halfRate}%)`, halfGst);
        builder.twoColumn(`SGST (${halfRate}%)`, halfGst);
    }

    if (data.serviceCharge && data.serviceCharge > 0) {
        builder.twoColumn('SERVICE CHG', data.serviceCharge.toFixed(2));
    }

    builder.divider('=');

    // 7. GRAND TOTAL (Bold & Compact)
    builder
        .size(1, 1)
        .bold(true)
        .twoColumn('TOTAL AMOUNT', `Rs ${Math.round(data.grandTotal)}.00`, true)
        .bold(false);

    builder.divider('-');

    // 8. PAYMENT & FOOTER
    builder
        .twoColumn('PAYMENT', `${data.paymentMethod || 'CASH'} (PAID)`)
        .divider('-')
        .align('center')
        .bold(true)
        .line('THANK YOU FOR DINING WITH US!')
        .bold(false)
        .line('HotelPro POS | Visit Again')
        .line('');

    // 9. NATIVE QR CODE (Direct Hardware Print)
    const qrTarget = data.qrLink || 'https://hotel-pro-devionx.vercel.app';
    builder
        .qrCode(qrTarget)
        .line('')
        .align('center')
        .size(1, 1)
        .bold(false)
        .line('www.devionx.com')
        .cut();

    return builder.build();
}
