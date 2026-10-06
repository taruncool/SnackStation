import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Bill } from './data.service';

/** Native side: android/app/src/main/java/com/snackstation/app/ThermalPrinterPlugin.java */
interface ThermalPrinterPlugin {
  listPaired(): Promise<{ devices: PairedPrinter[] }>;
  print(options: { address: string; data: string }): Promise<void>;
}
const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');

export interface PairedPrinter {
  name: string;
  address: string;
}

export interface PrinterSettings {
  address: string;
  name: string;
  paperWidth: 58 | 80;
}

/** Everything printed on the bill header/footer — edit here to change it. */
export const SHOP = {
  name: 'Snack Station',
  addressLines: ['Eat Street', 'Kakinada - 9982299366'],
  logo: 'assets/images/snack-station-logo.png',
  footer: ['Thank You!', 'Thank you for visiting Snack Station.', 'Visit Again!'],
};

const STORAGE_PRINTER = 'snackstation_printer';

// ESC/POS commands understood by practically every Bluetooth receipt printer.
const ESC = 0x1b;
const GS = 0x1d;
const CMD = {
  init: [ESC, 0x40],
  alignLeft: [ESC, 0x61, 0],
  alignCenter: [ESC, 0x61, 1],
  boldOn: [ESC, 0x45, 1],
  boldOff: [ESC, 0x45, 0],
  sizeNormal: [GS, 0x21, 0x00],
  sizeDouble: [GS, 0x21, 0x11],
  sizeTall: [GS, 0x21, 0x01],
  fontA: [ESC, 0x4d, 0],
  fontB: [ESC, 0x4d, 1], // smaller font: 42 chars on 58mm, 64 on 80mm
  cut: [GS, 0x56, 66, 0],
};

/** Line widths per paper size. On 58mm the items table uses the smaller
 *  Font B (42 chars) so names fit on one line with Qty | Price | Total. */
const LAYOUT = {
  58: { cols: 32, smallCols: 42, tableSmall: true, qty: 4, price: 8, total: 9, logoDots: 160 },
  80: { cols: 48, smallCols: 64, tableSmall: false, qty: 5, price: 10, total: 11, logoDots: 224 },
};

/**
 * Prints bills. In the Android app it sends ESC/POS bytes to a paired
 * Bluetooth thermal printer (chosen once per device and remembered); in a
 * browser it opens the receipt in the normal print dialog instead.
 */
@Injectable({ providedIn: 'root' })
export class PrinterService {
  readonly isNative = Capacitor.isNativePlatform();
  private logoCache: Partial<Record<58 | 80, number[]>> = {};

  getSettings(): PrinterSettings | null {
    try {
      const raw = localStorage.getItem(STORAGE_PRINTER);
      return raw ? (JSON.parse(raw) as PrinterSettings) : null;
    } catch {
      return null;
    }
  }

  saveSettings(settings: PrinterSettings) {
    try {
      localStorage.setItem(STORAGE_PRINTER, JSON.stringify(settings));
    } catch {
      // localStorage unavailable — the choice just won't be remembered
    }
  }

  /** Printers already paired in the phone's Bluetooth settings. */
  async listPaired(): Promise<PairedPrinter[]> {
    const { devices } = await ThermalPrinter.listPaired();
    return devices;
  }

  /** Throws with a readable message if printing fails. */
  async printBill(bill: Bill) {
    if (!this.isNative) {
      this.printInBrowser(bill);
      return;
    }
    const settings = this.getSettings();
    if (!settings) throw new Error('No printer selected — choose one in printer settings.');
    const bytes = await this.buildReceipt(bill, settings.paperWidth);
    await ThermalPrinter.print({ address: settings.address, data: toBase64(bytes) });
  }

  async printTest(settings: PrinterSettings) {
    const { cols } = LAYOUT[settings.paperWidth];
    const out: number[] = [...CMD.init, ...CMD.alignCenter];
    out.push(...(await this.logoRaster(settings.paperWidth)));
    out.push(...CMD.boldOn);
    text(out, `${SHOP.name}\n`);
    out.push(...CMD.boldOff);
    text(out, `Printer test - ${settings.paperWidth}mm\n`);
    text(out, '-'.repeat(cols) + '\n');
    text(out, 'If the dashed line fits the\npaper, the width is right.\n');
    out.push(...lineFeeds(4), ...CMD.cut);
    await ThermalPrinter.print({ address: settings.address, data: toBase64(Uint8Array.from(out)) });
  }

  /**
   * ESC/POS receipt in the shop's format: logo, name + address, bill no. and
   * date, Item | Qty | Price | Total, subtotal / discount / GRAND TOTAL, and
   * the thank-you footer. 58mm paper fits 32 characters a line, 80mm 48.
   */
  async buildReceipt(bill: Bill, paperWidth: 58 | 80): Promise<Uint8Array> {
    const L = LAYOUT[paperWidth];
    const cols = L.cols;
    const rule = '-'.repeat(cols) + '\n';
    const out: number[] = [];

    // Header
    out.push(...CMD.init, ...CMD.alignCenter);
    out.push(...(await this.logoRaster(paperWidth)));
    out.push(...CMD.boldOn, ...CMD.sizeDouble);
    text(out, `${SHOP.name}\n`);
    out.push(...CMD.sizeNormal, ...CMD.boldOff);
    for (const line of SHOP.addressLines) text(out, `${line}\n`);
    out.push(...CMD.alignLeft);
    text(out, rule);

    // Bill info
    text(out, `Bill No  : ${bill.id}\n`);
    text(out, `Date     : ${formatDateTime(bill.createdAt)}\n`);
    const customer = [bill.customerName, bill.customerPhone].filter(Boolean).join(' ');
    if (customer) {
      const [first, ...rest] = wrap(customer, cols - 11);
      text(out, `Customer : ${first}\n`);
      for (const line of rest) text(out, `${' '.repeat(11)}${line}\n`);
    }
    text(out, rule);

    // Items — the name shares the line with the numbers when it fits,
    // otherwise it gets its own line(s) above them (never cut off).
    const tCols = L.tableSmall ? L.smallCols : cols;
    const tName = tCols - L.qty - L.price - L.total;
    if (L.tableSmall) out.push(...CMD.fontB);
    out.push(...CMD.boldOn);
    text(out, pad('Item', tName) + padLeft('Qty', L.qty) + padLeft('Price', L.price) + padLeft('Total', L.total) + '\n');
    out.push(...CMD.boldOff);
    text(out, '-'.repeat(tCols) + '\n');
    for (const i of bill.items) {
      const numbers = padLeft(String(i.qty), L.qty) + padLeft(money(i.price), L.price) + padLeft(money(i.qty * i.price), L.total);
      if (i.name.length < tName) {
        text(out, pad(i.name, tName) + numbers + '\n');
      } else {
        for (const line of wrap(i.name, tCols)) text(out, line + '\n');
        text(out, ' '.repeat(tName) + numbers + '\n');
      }
    }
    if (L.tableSmall) out.push(...CMD.fontA);
    text(out, rule);

    // Totals
    text(out, twoCol('Subtotal', money(bill.subtotal), cols));
    const discountLabel = bill.discountPercent ? `Discount (${bill.discountPercent}%)` : 'Discount';
    text(out, twoCol(discountLabel, bill.discount > 0 ? `-${money(bill.discount)}` : money(0), cols));
    text(out, rule);
    out.push(...CMD.boldOn, ...CMD.sizeTall);
    text(out, twoCol('GRAND TOTAL', `Rs ${money(bill.total)}`, cols));
    out.push(...CMD.sizeNormal, ...CMD.boldOff);
    text(out, twoCol('Paid by', bill.paymentMethod.toUpperCase(), cols));
    text(out, rule);

    // Footer
    out.push(...CMD.alignCenter, ...CMD.boldOn);
    text(out, `${SHOP.footer[0]}\n`);
    out.push(...CMD.boldOff);
    for (const line of SHOP.footer.slice(1)) {
      // A line just too long for the normal font prints in Font B instead
      // of breaking mid-sentence.
      if (line.length > cols && line.length <= L.smallCols) {
        out.push(...CMD.fontB);
        text(out, `${line}\n`);
        out.push(...CMD.fontA);
      } else {
        for (const w of wrap(line, cols)) text(out, `${w}\n`);
      }
    }
    out.push(...lineFeeds(4), ...CMD.cut);
    return Uint8Array.from(out);
  }

  /**
   * The logo as an ESC/POS raster image (GS v 0), black-and-white. Thermal
   * printers only print black, so the red disc prints black with the
   * lettering left white. Returns no bytes if the image can't be loaded,
   * so a missing logo never blocks printing.
   */
  private async logoRaster(paperWidth: 58 | 80): Promise<number[]> {
    const cached = this.logoCache[paperWidth];
    if (cached) return cached;
    try {
      const img = await loadImage(SHOP.logo);
      const size = LAYOUT[paperWidth].logoDots; // dots; 8 dots = 1mm
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      const bytesPerRow = size / 8;
      const bytes: number[] = [GS, 0x76, 0x30, 0, bytesPerRow & 0xff, bytesPerRow >> 8, size & 0xff, size >> 8];
      for (let y = 0; y < size; y++) {
        for (let bx = 0; bx < bytesPerRow; bx++) {
          let b = 0;
          for (let bit = 0; bit < 8; bit++) {
            const p = (y * size + bx * 8 + bit) * 4;
            const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
            if (lum < 200) b |= 0x80 >> bit;
          }
          bytes.push(b);
        }
      }
      bytes.push(0x0a);
      this.logoCache[paperWidth] = bytes;
      return bytes;
    } catch (err) {
      console.error('Receipt logo could not be loaded — printing without it', err);
      return [];
    }
  }

  /**
   * Prints the receipt through a hidden iframe rather than a new window:
   * the bill auto-prints after Submit (not directly from a click), and
   * browsers block pop-ups opened that way — an iframe isn't a pop-up.
   */
  private printInBrowser(bill: Bill) {
    document.getElementById('ss-print-frame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'ss-print-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; visibility:hidden;';
    document.body.appendChild(frame);
    const w = frame.contentWindow;
    if (!w) throw new Error("Couldn't prepare the receipt for printing.");
    const logoUrl = new URL(SHOP.logo, document.baseURI).href;
    const rows = bill.items
      .map(
        (i) =>
          `<tr><td>${escapeHtml(i.name)}</td><td class="r">${i.qty}</td><td class="r">${money(i.price)}</td><td class="r">${money(
            i.qty * i.price
          )}</td></tr>`
      )
      .join('');
    const customer = [bill.customerName, bill.customerPhone].filter(Boolean).map(escapeHtml).join(' ');
    w.document.write(`<!DOCTYPE html><html><head><title>${bill.id}</title><style>
      @page { size: 58mm auto; margin: 2mm; }
      body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; width: 54mm; margin: 0 auto; color: #000; }
      .c { text-align: center; } .r { text-align: right; white-space: nowrap; }
      .logo { width: 22mm; height: 22mm; display: block; margin: 0 auto 4px; }
      h1 { font-size: 16px; margin: 0; text-align: center; }
      table { width: 100%; border-collapse: collapse; } td, th { padding: 1px 0; vertical-align: top; }
      th { text-align: left; font-weight: bold; } th.r { text-align: right; }
      hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
      .grand td { font-size: 14px; font-weight: bold; }
    </style></head><body>
      <img class="logo" src="${logoUrl}" alt="">
      <h1>${escapeHtml(SHOP.name)}</h1>
      ${SHOP.addressLines.map((l) => `<div class="c">${escapeHtml(l)}</div>`).join('')}<hr>
      <div>Bill No : ${bill.id}</div><div>Date : ${formatDateTime(bill.createdAt)}</div>
      ${customer ? `<div>Customer : ${customer}</div>` : ''}<hr>
      <table><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></table><hr>
      <table>${rows}</table><hr>
      <table>
        <tr><td>Subtotal</td><td class="r">${money(bill.subtotal)}</td></tr>
        <tr><td>Discount${bill.discountPercent ? ` (${bill.discountPercent}%)` : ''}</td><td class="r">${bill.discount > 0 ? '-' : ''}${money(bill.discount)}</td></tr>
      </table><hr>
      <table>
        <tr class="grand"><td>GRAND TOTAL</td><td class="r">Rs ${money(bill.total)}</td></tr>
        <tr><td>Paid by</td><td class="r">${escapeHtml(bill.paymentMethod.toUpperCase())}</td></tr>
      </table><hr>
      <div class="c"><strong>${escapeHtml(SHOP.footer[0])}</strong></div>
      ${SHOP.footer.slice(1).map((l) => `<div class="c">${escapeHtml(l)}</div>`).join('')}
    </body></html>`);
    w.document.close();
    let printed = false;
    const go = () => {
      if (printed) return;
      printed = true;
      w.focus();
      w.print();
    };
    // Wait for the logo so it isn't missing from the printout.
    const img = w.document.querySelector('img');
    if (img && !img.complete) {
      img.onload = go;
      img.onerror = go;
      setTimeout(go, 1500);
    } else {
      setTimeout(go, 200);
    }
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Couldn't load ${src}`));
    img.src = src;
  });
}

// Receipt printers use a single-byte code page: keep text to plain ASCII.
function text(out: number[], s: string) {
  const ascii = s.replace(/₹/g, 'Rs').normalize('NFKD').replace(/[^\x0A\x20-\x7E]/g, '?');
  for (let i = 0; i < ascii.length; i++) out.push(ascii.charCodeAt(i));
}

function lineFeeds(n: number) {
  return Array(n).fill(0x0a);
}

function pad(s: string, width: number) {
  return s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length);
}

function padLeft(s: string, width: number) {
  return s.length >= width ? s.slice(-width) : ' '.repeat(width - s.length) + s;
}

function wrap(s: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of s.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= width) line += ' ' + word;
    else {
      lines.push(line);
      line = word;
    }
    while (line.length > width) {
      lines.push(line.slice(0, width));
      line = line.slice(width);
    }
  }
  if (line) lines.push(line);
  return lines;
}

function twoCol(left: string, right: string, cols: number) {
  return pad(left, cols - right.length) + right + '\n';
}

function money(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/** 29-09-2026 04:16 PM — same style as the sample receipt. */
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  const h12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() < 12 ? 'AM' : 'PM';
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(h12)}:${p(d.getMinutes())} ${ampm}`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function toBase64(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
