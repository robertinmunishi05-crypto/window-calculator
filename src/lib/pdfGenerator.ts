import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ClientData,
  ConfigItem,
  COLOR_LABELS,
  describeNode,
  calculateLinearMeters,
  calculateGlassPanelSizes,
  WindowNode,
  WindowColor,
  ProfileSystem,
  getFrameThicknessCm,
} from '@/types/configurator';

const COLOR_MAP: Record<WindowColor, { frame: number[]; glass: number[]; accent: number[]; panel: number[] }> = {
  white: { frame: [212, 212, 212], glass: [212, 232, 247], accent: [153, 153, 153], panel: [232, 232, 232] },
  brown: { frame: [107, 66, 38], glass: [184, 212, 232], accent: [139, 105, 20], panel: [139, 105, 20] },
  black: { frame: [42, 42, 42], glass: [168, 200, 224], accent: [102, 102, 102], panel: [68, 68, 68] },
};

// ===== DRAW NODE =====
function drawNodePDF(
  doc: jsPDF, node: WindowNode,
  x: number, y: number, w: number, h: number,
  color: WindowColor, widthMm: number, heightMm: number,
  showGlassSizes: boolean = false,
) {
  const c = COLOR_MAP[color];

  if (node.type === 'pane' && node.paneConfig) {
    const config = node.paneConfig;
    const isDoorPanel = config.doorFill === 'panel';
    const isDoorCombo = config.elementType === 'door' && config.doorFill === 'combo';

    // Fill
    if (isDoorPanel) {
      doc.setFillColor(c.panel[0], c.panel[1], c.panel[2]);
      doc.rect(x, y, w, h, 'F');
    } else if (isDoorCombo) {
      const panelRatio = (config.doorComboRatio ?? 50) / 100;
      const panelOnTop = config.doorComboPosition === 'panel-top';
      if (panelOnTop) {
        const pH = h * panelRatio;
        doc.setFillColor(c.panel[0], c.panel[1], c.panel[2]);
        doc.rect(x, y, w, pH, 'F');
        doc.setFillColor(c.glass[0], c.glass[1], c.glass[2]);
        doc.rect(x, y + pH, w, h - pH, 'F');
        doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
        doc.setLineWidth(0.3);
        doc.line(x, y + pH, x + w, y + pH);
      } else {
        const gH = h * (1 - panelRatio);
        doc.setFillColor(c.glass[0], c.glass[1], c.glass[2]);
        doc.rect(x, y, w, gH, 'F');
        doc.setFillColor(c.panel[0], c.panel[1], c.panel[2]);
        doc.rect(x, y + gH, w, h * panelRatio, 'F');
        doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
        doc.setLineWidth(0.3);
        doc.line(x, y + gH, x + w, y + gH);
      }
    } else {
      doc.setFillColor(c.glass[0], c.glass[1], c.glass[2]);
      doc.rect(x, y, w, h, 'F');
    }

    // Indicators
    if (config.elementType === 'fixed' && !isDoorPanel) {
      doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
      doc.setLineWidth(0.2);
      doc.line(x + 1, y + 1, x + w - 1, y + h - 1);
      doc.line(x + w - 1, y + 1, x + 1, y + h - 1);
    }
    if (config.elementType === 'opening') {
      doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
      doc.setLineWidth(0.3);
      const cx = x + w / 2, cy = y + h / 2;
      const dir = config.openingDirection || 'left';
      if (dir === 'left') { doc.line(cx + 3, cy, cx - 3, cy); doc.line(cx - 3, cy, cx - 1, cy - 2); }
      else { doc.line(cx - 3, cy, cx + 3, cy); doc.line(cx + 3, cy, cx + 1, cy - 2); }
    }
    if (config.elementType === 'slider') {
      doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
      doc.setLineWidth(0.3);
      const cx = x + w / 2, cy = y + h / 2;
      doc.line(cx - 4, cy, cx + 4, cy);
      doc.line(cx - 4, cy, cx - 2, cy - 2);
      doc.line(cx + 4, cy, cx + 2, cy - 2);
    }
    if (config.elementType === 'door') {
      doc.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
      doc.circle(x + w - 4, y + h / 2, 1, 'F');
    }

    // Type label inside segment (small, neutral) — no glass sizes, no IDs
    {
      const cx = x + w / 2, cy = y + h / 2;
      const typeLabel = isDoorPanel ? 'PNL' : config.elementType === 'door' ? 'DER' : config.elementType === 'opening' ? 'HAP' : config.elementType === 'slider' ? 'SHB' : 'FIX';
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90, 90, 90);
      doc.text(typeLabel, cx, cy + 1.5, { align: 'center' });
    }

    // Border
    doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
    return;
  }

  if (node.type === 'split' && node.children && node.sizes) {
    const totalSize = node.sizes.reduce((a, b) => a + b, 0);
    let offset = 0;
    node.children.forEach((child, i) => {
      const ratio = node.sizes![i] / totalSize;
      let cx: number, cy: number, cw: number, ch: number;
      let childWMm: number, childHMm: number;
      if (node.direction === 'vertical') {
        cx = x + offset; cy = y; cw = w * ratio; ch = h;
        childWMm = node.sizes![i]; childHMm = heightMm;
        offset += cw;
      } else {
        cx = x; cy = y + offset; cw = w; ch = h * ratio;
        childWMm = widthMm; childHMm = node.sizes![i];
        offset += ch;
      }
      drawNodePDF(doc, child, cx, cy, cw, ch, color, childWMm, childHMm, showGlassSizes);
      if (i < node.children!.length - 1) {
        doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
        doc.setLineWidth(1.5);
        if (node.direction === 'vertical') doc.line(x + offset, y, x + offset, y + h);
        else doc.line(x, y + offset, x + w, y + offset);
      }
    });
  }
}

// ===== SMART SKETCH LAYOUT =====
function calculateSketchLayout(items: ConfigItem[], pageWidth: number, margin: number, gap: number) {
  // Determine optimal columns based on item widths
  const availableWidth = pageWidth - margin * 2;
  
  // Group items into rows dynamically
  const rows: { items: ConfigItem[]; maxRatio: number }[] = [];
  let currentRow: ConfigItem[] = [];
  let currentRowWidth = 0;
  
  for (const item of items) {
    const itemRatio = item.width / item.height;
    const estimatedWidth = Math.min(availableWidth / 2, Math.max(30, 45 * itemRatio));
    
    if (currentRow.length > 0 && currentRowWidth + estimatedWidth + gap > availableWidth) {
      rows.push({ items: [...currentRow], maxRatio: 0 });
      currentRow = [item];
      currentRowWidth = estimatedWidth;
    } else {
      currentRow.push(item);
      currentRowWidth += estimatedWidth + (currentRow.length > 1 ? gap : 0);
    }
  }
  if (currentRow.length > 0) {
    rows.push({ items: [...currentRow], maxRatio: 0 });
  }
  
  return rows;
}

function drawItemSketch(
  doc: jsPDF, item: ConfigItem,
  x: number, y: number, maxW: number, maxH: number,
  showGlassSizes: boolean = false,
) {
  const ratio = item.width / item.height;
  let skW: number, skH: number;
  if (ratio > maxW / maxH) { skW = maxW; skH = maxW / ratio; }
  else { skH = maxH; skW = maxH * ratio; }

  // Reserve minimal outer space: left for vertical height label, bottom for width label
  const leftPad = 4;
  const bottomPad = 4;
  const usableW = maxW - leftPad;
  const usableH = maxH - bottomPad;
  const r2 = item.width / item.height;
  if (r2 > usableW / usableH) { skW = usableW; skH = usableW / r2; }
  else { skH = usableH; skW = usableH * r2; }

  // Anchor sketch to the LEFT (after the height label) so sketches start from the left side.
  // Any extra horizontal space falls on the right.
  const skX = x + leftPad;
  // Anchor sketch to the TOP so the bottom width label sits right under the frame.
  const skY = y;
  const frameT = 1.5;

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(frameT);
  doc.rect(skX, skY, skW, skH);

  drawNodePDF(doc, item.rootNode, skX + frameT, skY + frameT, skW - frameT * 2, skH - frameT * 2, item.color, item.width, item.height, showGlassSizes);

  // BOTTOM (outside, close to frame): width in cm
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${(item.width / 10).toFixed(1)} cm`, skX + skW / 2, skY + skH + 4, { align: 'center' });

  // LEFT (outside, close to frame): height in cm, rotated vertically (bottom→top)
  const heightLabelX = skX - 1.5;
  const heightLabelY = skY + skH / 2;
  doc.text(`${(item.height / 10).toFixed(1)} cm`, heightLabelX, heightLabelY, { align: 'center', angle: 90 });

  if (item.quantity > 1) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`x${item.quantity}`, skX + skW - 2, skY + skH + 4, { align: 'right' });
  }
}

// ===== HELPERS =====
function addHeader(doc: jsPDF, title: string) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(75, 55, 35);
  doc.rect(0, 0, pw, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pw / 2, 18, { align: 'center' });
}

function addFooter(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Window — Konfigurator Profesional', pw / 2, ph - 8, { align: 'center' });
    doc.text(`${i} / ${totalPages}`, pw - 15, ph - 8, { align: 'right' });
  }
}

function addClientInfo(doc: jsPDF, client: ClientData, startY: number): number {
  const date = new Date().toLocaleDateString('sq-AL');
  const pw = doc.internal.pageSize.getWidth();
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Data: ${date}`, pw - 15, startY, { align: 'right' });

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Klienti', 15, startY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let y = startY + 13;
  doc.text(`Emri: ${client.name || '—'}`, 15, y);
  if (client.phone) { y += 7; doc.text(`Tel: ${client.phone}`, 15, y); }
  if (client.address) { y += 7; doc.text(`Adresa: ${client.address}`, 15, y); }
  return y + 10;
}

// ===== SKETCH PAGES =====
function addSketchPages(doc: jsPDF, items: ConfigItem[], showGlassSizes: boolean) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 15;
  const gap = 8;
  const availW = pw - margin * 2;
  const maxCellH = 55;
  const rowH = maxCellH + 22;

  // Group identical items (same dimensions)
  const uniqueItems: ConfigItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.width}-${item.height}-${JSON.stringify(item.rootNode)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }

  let pageItems = [...uniqueItems];
  while (pageItems.length > 0) {
    doc.addPage();
    addHeader(doc, showGlassSizes ? 'Skicat Teknike' : 'Skicat e Elementeve');

    let curY = 38;
    while (pageItems.length > 0 && curY + rowH < ph - 20) {
      // Determine how many fit in this row
      let rowItems: ConfigItem[] = [];
      let usedWidth = 0;

      for (const item of pageItems) {
        const itemRatio = item.width / item.height;
        const cellW = Math.min(availW / 2, Math.max(35, maxCellH * itemRatio + 10));
        if (rowItems.length > 0 && usedWidth + cellW + gap > availW) break;
        rowItems.push(item);
        usedWidth += cellW + (rowItems.length > 1 ? gap : 0);
      }

      if (rowItems.length === 0) break;
      pageItems = pageItems.slice(rowItems.length);

      // Distribute evenly
      const cellW = (availW - gap * (rowItems.length - 1)) / rowItems.length;
      rowItems.forEach((item, i) => {
        const ix = margin + i * (cellW + gap);
        drawItemSketch(doc, item, ix, curY, cellW, maxCellH, showGlassSizes);
      });

      curY += rowH;
    }
  }
}

// ===== CLIENT PDF =====
export function generateClientPDF(client: ClientData, items: ConfigItem[]) {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('sq-AL');

  addHeader(doc, 'WINDOW — Oferta');
  let y = addClientInfo(doc, client, 38);

  // Simple table: just dimensions, color, quantity
  const tableData = items.map((item, i) => [
    (i + 1).toString(),
    item.projectId || '—',
    describeNode(item.rootNode),
    `${(item.width / 10).toFixed(1)} × ${(item.height / 10).toFixed(1)} cm`,
    COLOR_LABELS[item.color],
    item.quantity.toString(),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'ID', 'Konfigurimi', 'Dimensionet', 'Ngjyra', 'Sasia']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [75, 55, 35], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 246, 243] },
    theme: 'grid',
    columnStyles: { 1: { cellWidth: 22, fontStyle: 'bold' }, 2: { cellWidth: 45 } },
  });

  // Sketches without glass sizes
  addSketchPages(doc, items, false);
  addFooter(doc);
  doc.save(`window-klient-${client.name || 'pa-emer'}-${date}.pdf`);
}

// ===== COMPANY PDF =====
export function generateCompanyPDF(client: ClientData, items: ConfigItem[], profileSystem: ProfileSystem) {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('sq-AL');
  const pw = doc.internal.pageSize.getWidth();
  const frameThicknessCm = getFrameThicknessCm(profileSystem);
  const frameThicknessMm = frameThicknessCm * 10;

  addHeader(doc, 'WINDOW — Detajet Teknike');
  let y = addClientInfo(doc, client, 38);

  // Profile system info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(75, 55, 35);
  doc.text(`Sistemi: ${profileSystem.type.toUpperCase()} — Trashësia e kornizës: ${frameThicknessCm} cm`, 15, y);
  y += 8;

  // Full technical table
  const tableData = items.map((item, i) => {
    const lm = calculateLinearMeters(item);
    return [
      (i + 1).toString(),
      item.projectId || '—',
      describeNode(item.rootNode),
      `${(item.width / 10).toFixed(1)} × ${(item.height / 10).toFixed(1)}`,
      COLOR_LABELS[item.color],
      item.quantity.toString(),
      `${lm.outerFrame.toFixed(2)}`,
      `${lm.openingFrames.toFixed(2)}`,
      `${lm.innerDividers.toFixed(2)}`,
      `${lm.total.toFixed(2)}`,
    ];
  });

  const totalLM = items.reduce((sum, item) => sum + calculateLinearMeters(item).total * item.quantity, 0);
  const totalL = items.reduce((sum, item) => sum + calculateLinearMeters(item).outerFrame * item.quantity, 0);
  const totalZ = items.reduce((sum, item) => sum + calculateLinearMeters(item).openingFrames * item.quantity, 0);

  autoTable(doc, {
    startY: y,
    head: [['#', 'ID', 'Konfigurimi', 'Dim (cm)', 'Ngjyra', 'Sasia', 'L (m)', 'Z (m)', 'Ndarja', 'Total']],
    body: tableData,
    foot: [['', '', '', '', '', '', totalL.toFixed(2), totalZ.toFixed(2), '', totalLM.toFixed(2)]],
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: { fillColor: [75, 55, 35], textColor: 255, fontSize: 7 },
    footStyles: { fillColor: [240, 235, 228], textColor: [50, 50, 50], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 246, 243] },
    theme: 'grid',
    columnStyles: {
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 35 },
    },
  });

  // Glass/Panel summary table
  const allGlass: { item: number; label: string; w: string; h: string; type: string }[] = [];
  items.forEach((item, i) => {
    const sizes = calculateGlassPanelSizes(item.rootNode, item.width, item.height, frameThicknessMm);
    sizes.forEach(g => {
      for (let q = 0; q < item.quantity; q++) {
        allGlass.push({
          item: i + 1,
          label: g.label,
          w: g.widthCm.toFixed(2),
          h: g.heightCm.toFixed(2),
          type: g.type === 'glass' ? 'Xham' : 'Panel',
        });
      }
    });
  });

  if (allGlass.length > 0) {
    const glassY = (doc as any).lastAutoTable?.finalY ?? y + 60;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Lista e Xhamave / Paneleve (-3mm tolerancë)', 15, glassY + 10);

    autoTable(doc, {
      startY: glassY + 14,
      head: [['Element', 'Emërtimi', 'Gjerësia (cm)', 'Lartësia (cm)', 'Tipi']],
      body: allGlass.map(g => [g.item.toString(), g.label, g.w, g.h, g.type]),
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: [75, 55, 35], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 246, 243] },
      theme: 'grid',
    });
  }

  // Technical sketches with glass sizes
  addSketchPages(doc, items, true);
  addFooter(doc);
  doc.save(`window-kompani-${client.name || 'pa-emer'}-${date}.pdf`);
}
