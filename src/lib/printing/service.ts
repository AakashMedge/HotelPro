
// Thermal Printer Layouts for HotelPro

// Standard 80mm width CSS for thermal printers
const THERMAL_CSS = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

@media print {
  @page { margin: 0; size: 80mm auto; }
  body { margin: 0; padding: 0; font-family: 'Space Mono', monospace; font-size: 12px; width: 80mm; color: black; }
}
body { font-family: 'Space Mono', monospace; font-size: 12px; padding: 10px; width: 80mm; margin: 0 auto; color: black; background: white; }

.receipt { width: 100%; box-sizing: border-box; }
.center { text-align: center; }
.right { text-align: right; }
.bold { font-weight: 700; }
.text-lg { font-size: 14px; }
.text-xl { font-size: 16px; }
.text-2xl { font-size: 20px; }
.uppercase { text-transform: uppercase; }

.line { border-top: 1px dashed #000; margin: 8px 0; width: 100%; }
.double-line { border-top: 3px double #000; margin: 8px 0; width: 100%; }

.row { display: flex; justify-content: space-between; margin-bottom: 4px; }
.col { display: flex; flex-direction: column; }

.item-row { display: grid; grid-template-columns: 30px 1fr 50px; margin-bottom: 4px; gap: 4px; }
.item-qty { font-weight: 700; }
.item-price { text-align: right; }

.footer { margin-top: 15px; text-align: center; font-size: 10px; }
.barcode { height: 40px; background: #000; margin: 10px auto; width: 80%; }
</style>
`;

// Helper to format currency
const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(Number(amount));
};

export const PrintingService = {

    // 1. Generate Customer Bill (Tax Invoice)
    generateBillHTML: (order: any, settings: any) => {
        const date = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bill #${order.orderId}</title>
            ${THERMAL_CSS}
        </head>
        <body>
            <div class="receipt">
                <div class="center">
                    <div class="bold text-xl uppercase">${settings.businessName || 'HOTEL PRO'}</div>
                    <div>Wait, Eat, Repeat</div>
                    <div class="line"></div>
                    <div class="row">
                        <span>GSTIN: ${settings.gstin || 'N/A'}</span>
                        <span>${date}</span>
                    </div>
                    <div class="row">
                        <span>Bill No: #${order.orderId.substring(0, 8)}</span>
                        <span>Table: ${order.tableNo}</span>
                    </div>
                    <div class="text-left">Waitstaff: ${order.waiterName || 'Staff'}</div>
                </div>

                <div class="double-line"></div>

                <div class="item-row bold" style="font-size: 10px; text-transform: uppercase;">
                    <span>Qty</span>
                    <span>Item</span>
                    <span class="right">Amt</span>
                </div>

                <div class="line"></div>

                ${order.items.map((item: any) => `
                    <div class="item-row">
                        <span class="item-qty">${item.quantity}</span>
                        <span class="item-name">
                            ${item.name}
                            ${item.variant ? `<br/><span style="font-size:10px; font-weight:normal;">(${item.variant})</span>` : ''}
                        </span>
                        <span class="item-price">${formatCurrency(item.price * item.quantity)}</span>
                    </div>
                `).join('')}

                <div class="line"></div>

                <div class="row">
                    <span>Subtotal</span>
                    <span>${formatCurrency(order.subtotal)}</span>
                </div>
                
                ${order.discount > 0 ? `
                <div class="row">
                    <span>Discount</span>
                    <span>-${formatCurrency(order.discount)}</span>
                </div>` : ''}

                <div class="row">
                    <span>CGST (${order.gstRate / 2}%)</span>
                    <span>${formatCurrency(order.gstAmount / 2)}</span>
                </div>
                <div class="row">
                    <span>SGST (${order.gstRate / 2}%)</span>
                    <span>${formatCurrency(order.gstAmount / 2)}</span>
                </div>
                
                ${order.serviceCharge > 0 ? `
                <div class="row">
                    <span>Service Chg</span>
                    <span>${formatCurrency(order.serviceCharge)}</span>
                </div>` : ''}

                <div class="double-line"></div>

                <div class="row bold text-xl">
                    <span>TOTAL</span>
                    <span>${formatCurrency(order.grandTotal)}</span>
                </div>

                <div class="double-line"></div>

                <div class="center footer">
                    <div class="bold">THANK YOU! VISIT AGAIN</div>
                    <div>Powered by HotelPro OS</div>
                    <div style="margin-top:5px; font-size:10px;">${order.paymentMethod || 'CASH'}</div>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
        `;
    },

    // 2. Generate Kitchen Order Ticket (KOT)
    generateKOTHTML: (order: any) => {
        const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>KOT #${order.orderId}</title>
            ${THERMAL_CSS}
        </head>
        <body>
            <div class="receipt">
                <div class="center">
                    <div class="bold text-2xl">KOT</div>
                    <div class="text-lg">Table: ${order.tableNo}</div>
                    <div class="line"></div>
                    <div class="bold right">${time}</div>
                </div>

                <div class="double-line"></div>

                ${order.items.map((item: any) => `
                    <div class="row" style="margin-bottom: 8px;">
                        <span class="item-qty text-xl" style="width: 40px; padding-right:10px;">${item.quantity}</span>
                        <div class="col" style="flex:1;">
                            <span class="item-name text-lg bold uppercase">${item.name}</span>
                            ${item.notes ? `<div style="font-size:12px; font-style:italic;">Note: ${item.notes}</div>` : ''}
                            ${item.variant ? `<div style="font-size:12px;">Var: ${item.variant}</div>` : ''}
                            ${item.modifiers ? `<div style="font-size:12px;">+ ${item.modifiers.join(', ')}</div>` : ''}
                        </div>
                    </div>
                    <div style="border-bottom: 1px dotted #ccc; margin-bottom: 8px;"></div>
                `).join('')}

                <div class="double-line"></div>

                <div class="center bold text-lg">
                    ${order.isNew ? '*** NEW ORDER ***' : '*** UPDATED ORDER ***'}
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
        `;
    },

    // 3. Trigger the Print Dialog
    print: (htmlContent: string) => {
        const printWindow = window.open('', '_blank', 'width=400,height=600,left=200,top=200');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            // The script inside the HTML will trigger print() automatically
        } else {
            alert('Popup blocked! Please allow popups for printing.');
        }
    }
};
