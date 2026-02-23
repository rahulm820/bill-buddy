import { QueueBill, AppUser } from "./store";

export interface PrintOptions {
  bill: QueueBill;
  user: AppUser | null;
  showGST?: boolean;
  gstRate?: number;
  note?: string;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

function padLine(left: string, right: string, width = 40): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(spaces) + right;
}

// ─── Generate printable HTML ──────────────────────────────────────────────────

export function generateBillHTML(opts: PrintOptions): string {
  const { bill, user, showGST = false, gstRate = 18, note } = opts;

  const subtotal = bill.rows.reduce(
    (s, r) => s + (parseFloat(r.price) || 0) * (parseFloat(r.qty) || 0),
    0
  );
  const gstAmount = showGST ? (subtotal * gstRate) / 100 : 0;
  const total = subtotal + gstAmount;

  const date = new Date();
  const dateStr = date.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const rows = bill.rows.map(r => {
    const price = parseFloat(r.price) || 0;
    const qty   = parseFloat(r.qty)   || 0;
    const amt   = price * qty;
    return `
      <tr>
        <td class="item-name">${r.name || "—"}</td>
        <td class="text-right">${fmt(price)}</td>
        <td class="text-center">${qty}</td>
        <td class="text-right">${fmt(amt)}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bill #${bill.num} — ${user?.business_name || user?.name || "BillStock"}</title>
  <style>
    /* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Page setup ── */
@page {
  size: 80mm auto;
  margin: 5mm 4mm;
}

@media print and (min-width: 100mm) {
  @page { size: A4; margin: 15mm; }
}

body {
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;              /* ⬆ Bigger base font */
  line-height: 1.5;
  color: #000;
  background: #fff;
  width: 100%;
  max-width: 80mm;
  margin: 0 auto;
  padding: 6px 0;
}

/* ── Header ── */
.header { text-align: center; margin-bottom: 10px; }

.shop-name {
  font-size: 20px;              /* ⬆ Bigger */
  font-weight: 900;             /* ⬆ Bold */
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.shop-sub {
  font-size: 11px;
  font-weight: 600;
  color: #222;
  margin-bottom: 2px;
}

.divider {
  border: none;
  border-top: 1px dashed #000;
  margin: 8px 0;
}

.divider-solid {
  border: none;
  border-top: 2px solid #000;   /* ⬆ Stronger line */
  margin: 8px 0;
}

/* ── Bill meta ── */
.meta {
  font-size: 12px;
  margin-bottom: 6px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}

.meta-row span:last-child {
  font-weight: bold;
}

/* ── Items table ── */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin: 6px 0;
}

thead th {
  text-align: left;
  font-weight: 800;
  border-bottom: 1px dashed #000;
  padding: 4px 2px;
  font-size: 11px;
  text-transform: uppercase;
}

th.text-right, td.text-right { text-align: right; }
th.text-center, td.text-center { text-align: center; }

tbody td {
  padding: 5px 2px;             /* ⬆ More spacing */
  vertical-align: top;
  font-weight: 500;
}

.item-name {
  font-weight: 600;
  word-break: break-word;
}

/* ── Totals ── */
.totals {
  margin-top: 6px;
  font-size: 13px;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
}

.totals-row span:last-child {
  font-weight: bold;
}

.totals-row.grand {
  font-size: 18px;              /* ⭐ BIG TOTAL */
  font-weight: 900;
  padding-top: 6px;
}

/* ── Note ── */
.note {
  font-size: 11px;
  margin-top: 6px;
  font-style: italic;
  text-align: center;
}

/* ── Footer ── */
.footer {
  text-align: center;
  margin-top: 12px;
  font-size: 11px;
  color: #222;
}

.thank-you {
  font-size: 14px;
  font-weight: 900;
  margin-bottom: 3px;
  text-transform: uppercase;
}

/* ── Screen preview ── */
@media screen {
  body {
    max-width: 360px;
    margin: 20px auto;
    padding: 20px;
    border: 1px dashed #ccc;
    border-radius: 6px;
    box-shadow: 0 4px 18px rgba(0,0,0,0.08);
  }

  .print-btn {
    display: block;
    margin: 20px auto 0;
    padding: 12px 32px;
    background: #111;
    color: #f5c842;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
  }
}

@media print {
  .print-btn { display: none !important; }
}

  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="shop-name">${user?.business_name || user?.name || "S S"}</div>
    ${user?.phone ? `<div class="shop-sub">📞 ${user.phone}</div>` : ""}
    ${!user?.email ? `<div class="shop-sub">${user.email}</div>` : ""}
  </div>

  <hr class="divider-solid" />

  <!-- Bill meta -->
  <div class="meta">
    <!--<div class="meta-row"><span>Bill No:</span><span><strong>#${bill.num}</strong></span></div>-->
    <div class="meta-row"><span>Date:</span><span>${dateStr}</span></div>
    <div class="meta-row"><span>Time:</span><span>${timeStr}</span></div>
    ${bill.customer ? `<div class="meta-row"><span>Customer:</span><span>${bill.customer}</span></div>` : ""}
  </div>

  <hr class="divider" />

  <!-- Items -->
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-right">Rate</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <hr class="divider" />

  <!-- Totals -->
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    ${showGST ? `<div class="totals-row"><span>GST (${gstRate}%)</span><span>${fmt(gstAmount)}</span></div>` : ""}
  </div>

  <hr class="divider-solid" />

  <div class="totals">
    <div class="totals-row grand"><span>TOTAL</span><span>${fmt(total)}</span></div>
  </div>

  ${note ? `<hr class="divider" /><div class="note">📝 ${note}</div>` : ""}

  <hr class="divider" />

  <!-- Footer -->
  <div class="footer">
    <div class="thank-you">Thank You!</div>
    <div>Visit Again 🙏</div>
    <div style="margin-top:4px;font-size:8px;color:#888;">ShyamSundar Kirana</div>
  </div>

  <!-- Screen-only print button -->
  <button class="print-btn" onclick="window.print()">🖨️ Print</button>

</body>
</html>`;
}

// ─── Open print window ────────────────────────────────────────────────────────

export function printBill(opts: PrintOptions): void {
  const html = generateBillHTML(opts);

  // Open in a new popup window — browsers show the system print dialog
  const win = window.open("", "_blank", "width=420,height=600,scrollbars=yes");
  if (!win) {
    // Popup was blocked — fallback: write into an iframe
    printViaIframe(html);
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  // Wait for resources to load then trigger print dialog
  win.onload = () => {
    win.focus();
    win.print();
    // Close window after print dialog closes (slight delay for UX)
    win.onafterprint = () => win.close();
  };
}

function printViaIframe(html: string): void {
  const existing = document.getElementById("bill-print-frame");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "bill-print-frame";
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 2000);
  };
}