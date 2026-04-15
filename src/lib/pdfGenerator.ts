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
} from '@/types/configurator';

const COLOR_MAP: Record<WindowColor, { frame: number[]; glass: number[]; accent: number[]; panel: number[] }> = {
  white: { frame: [212, 212, 212], glass: [212, 232, 247], accent: [153, 153, 153], panel: [232, 232, 232] },
  brown: { frame: [107, 66, 38], glass: [184, 212, 232], accent: [139, 105, 20], panel: [139, 105, 20] },
  black: { frame: [42, 42, 42], glass: [168, 200, 224], accent: [102, 102, 102], panel: [68, 68, 68] },
};

function drawNodePDF(
  doc: jsPDF,
  node: WindowNode,
  x: number, y: number, w: number, h: number,
  color: WindowColor,
  widthMm: number, heightMm: number,
  frameT: number = 2,
  divT: number = 1.5,
) {
  const c = COLOR_MAP[color];

  if (node.type === 'pane' && node.paneConfig) {
    const config = node.paneConfig;
    const isDoorPanel = config.doorFill === 'panel';
    const isDoorCombo = config.elementType === 'door' && config.doorFill === 'combo';

    if (isDoorPanel) {
      doc.setFillColor(c.panel[0], c.panel[1], c.panel[2]);
      doc.rect(x, y, w, h, 'F');
    } else if (isDoorCombo) {
      const panelRatio = (config.doorComboRatio ?? 50) / 100;
      const panelOnTop = config.doorComboPosition === 'panel-top';
      if (panelOnTop) {
        const panelH = h * panelRatio;
        doc.setFillColor(c.panel[0], c.panel[1], c.panel[2]);
        doc.rect(x, y, w, panelH, 'F');
        doc.setFillColor(c.glass[0], c.glass[1], c.glass[2]);
        doc.rect(x, y + panelH, w, h - panelH, 'F');
        doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
        doc.setLineWidth(0.3);
        doc.line(x, y + panelH, x + w, y + panelH);
      } else {
        const glassH = h * (1 - panelRatio);
        doc.setFillColor(c.glass[0], c.glass[1], c.glass[2]);
        doc.rect(x, y, w, glassH, 'F');
        doc.setFillColor(c.panel[0], c.panel[1], c.panel[2]);
        doc.rect(x, y + glassH, w, h * panelRatio, 'F');
        doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
        doc.setLineWidth(0.3);
        doc.line(x, y + glassH, x + w, y + glassH);
      }
    } else {
      doc.setFillColor(c.glass[0], c.glass[1], c.glass[2]);
      doc.rect(x, y, w, h, 'F');
    }

    // Fixed X
    if (config.elementType === 'fixed' && !isDoorPanel) {
      doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
      doc.setLineWidth(0.2);
      doc.line(x + 1, y + 1, x + w - 1, y + h - 1);
      doc.line(x + w - 1, y + 1, x + 1, y + h - 1);
    }

    // Opening arrow
    if (config.elementType === 'opening') {
      doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
      doc.setLineWidth(0.3);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const dir = config.openingDirection || 'left';
      if (dir === 'left') {
        doc.line(cx + 3, cy, cx - 3, cy);
        doc.line(cx - 3, cy, cx - 1, cy - 2);
      } else if (dir === 'right') {
        doc.line(cx - 3, cy, cx + 3, cy);
        doc.line(cx + 3, cy, cx + 1, cy - 2);
      }
    }

    // Slider arrows
    if (config.elementType === 'slider') {
      doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
      doc.setLineWidth(0.3);
      const cx = x + w / 2;
      const cy = y + h / 2;
      doc.line(cx - 4, cy, cx + 4, cy);
      doc.line(cx - 4, cy, cx - 2, cy - 2);
      doc.line(cx + 4, cy, cx + 2, cy - 2);
    }

    // Door handle
    if (config.elementType === 'door') {
      doc.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
      doc.circle(x + w - 4, y + h / 2, 1, 'F');
    }

    // === DIMENSION LABELS INSIDE ===
    const deduction = 3;
    const glassWMm = widthMm - deduction;
    const glassHMm = heightMm - deduction;
    const labelW = (glassWMm / 10).toFixed(1);
    const labelH = (glassHMm / 10).toFixed(1);
    
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    const labelText = `${labelW}×${labelH}`;
    const cx = x + w / 2;
    const cy = y + h / 2;
    
    // Background for readability
    const textW = doc.getTextWidth(labelText);
    doc.setFillColor(255, 255, 255);
    doc.rect(cx - textW / 2 - 1, cy - 2.5, textW + 2, 5, 'F');
    doc.setTextColor(30, 30, 30);
    doc.text(labelText, cx, cy + 1, { align: 'center' });

    // Type label below dimension
    const typeLabel = isDoorPanel ? 'PNL' : config.elementType === 'door' ? 'DER' : config.elementType === 'opening' ? 'HAP' : config.elementType === 'slider' ? 'SHB' : 'FIX';
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text(typeLabel, cx, cy + 5, { align: 'center' });

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
        cx = x + offset;
        cy = y;
        cw = w * ratio;
        ch = h;
        childWMm = node.sizes![i];
        childHMm = heightMm;
        offset += cw;
      } else {
        cx = x;
        cy = y + offset;
        cw = w;
        ch = h * ratio;
        childWMm = widthMm;
        childHMm = node.sizes![i];
        offset += ch;
      }

      drawNodePDF(doc, child, cx, cy, cw, ch, color, childWMm, childHMm, frameT, divT);

      if (i < node.children!.length - 1) {
        doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
        doc.setLineWidth(divT);
        if (node.direction === 'vertical') {
          doc.line(x + offset, y, x + offset, y + h);
        } else {
          doc.line(x, y + offset, x + w, y + offset);
        }
      }
    });
  }
}

function drawItemSketch(
  doc: jsPDF,
  item: ConfigItem,
  x: number, y: number,
  maxW: number, maxH: number,
) {
  const ratio = item.width / item.height;
  let skW: number, skH: number;
  if (ratio > maxW / maxH) {
    skW = maxW; skH = maxW / ratio;
  } else {
    skH = maxH; skW = maxH * ratio;
  }

  const skX = x + (maxW - skW) / 2;
  const skY = y + (maxH - skH) / 2;
  const frameT = 1.5;

  // Outer frame
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(frameT);
  doc.rect(skX, skY, skW, skH);

  // Draw recursive structure with real mm dimensions
  drawNodePDF(doc, item.rootNode, skX + frameT, skY + frameT, skW - frameT * 2, skH - frameT * 2, item.color, item.width, item.height);

  // Overall dimension annotation
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`${(item.width / 10).toFixed(1)} × ${(item.height / 10).toFixed(1)} cm`, x + maxW / 2, y + maxH + 5, { align: 'center' });
  
  const lm = calculateLinearMeters(item);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`L=${lm.outerFrame.toFixed(2)}m  Z=${lm.openingFrames.toFixed(2)}m  x${item.quantity}`, x + maxW / 2, y + maxH + 10, { align: 'center' });
}

export function generatePDF(client: ClientData, items: ConfigItem[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(75, 55, 35);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('WINDOW', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Konfigurator Profesional — Matje & Konfigurim', pageWidth / 2, 28, { align: 'center' });

  // Date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  const date = new Date().toLocaleDateString('sq-AL');
  doc.text(`Data: ${date}`, pageWidth - 15, 45, { align: 'right' });

  // Client info
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Klienti', 15, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let y = 58;
  doc.text(`Emri: ${client.name || '—'}`, 15, y);
  if (client.phone) { y += 7; doc.text(`Tel: ${client.phone}`, 15, y); }
  if (client.address) { y += 7; doc.text(`Adresa: ${client.address}`, 15, y); }

  // Table
  y += 12;
  const tableData = items.map((item, i) => {
    const lm = calculateLinearMeters(item);
    return [
      (i + 1).toString(),
      describeNode(item.rootNode),
      `${(item.width / 10).toFixed(1)} x ${(item.height / 10).toFixed(1)}`,
      COLOR_LABELS[item.color],
      item.quantity.toString(),
      `L=${lm.outerFrame.toFixed(2)}`,
      `Z=${lm.openingFrames.toFixed(2)}`,
      `${lm.total.toFixed(2)} m`,
    ];
  });

  const totalLM = items.reduce((sum, item) => {
    return sum + calculateLinearMeters(item).total * item.quantity;
  }, 0);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Konfigurimi', 'Dim. (cm)', 'Ngjyra', 'Sasia', 'L (m)', 'Z (m)', 'Total (m)']],
    body: tableData,
    foot: [['', '', '', '', '', '', 'TOTALI', `${totalLM.toFixed(2)} m`]],
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: { fillColor: [75, 55, 35], textColor: 255 },
    footStyles: { fillColor: [240, 235, 228], textColor: [50, 50, 50], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 246, 243] },
    theme: 'grid',
    columnStyles: {
      1: { cellWidth: 40 },
    },
  });

  // Draw sketches - 4 per row
  const cols = 4;
  const margin = 15;
  const gap = 8;
  const cellW = (pageWidth - margin * 2 - gap * (cols - 1)) / cols;
  const cellH = 50;
  const rowH = cellH + 16;
  const maxRows = Math.floor((pageHeight - 50) / (rowH + gap));

  let pageItems = [...items];
  while (pageItems.length > 0) {
    doc.addPage();

    doc.setFillColor(75, 55, 35);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Skicat e Elementeve', pageWidth / 2, 16, { align: 'center' });

    const itemsPerPage = maxRows * cols;
    const batch = pageItems.splice(0, itemsPerPage);

    batch.forEach((item, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const ix = margin + col * (cellW + gap);
      const iy = 35 + row * (rowH + gap);

      drawItemSketch(doc, item, ix, iy, cellW, cellH);
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 10;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Window — Konfigurator Profesional', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`${i} / ${totalPages}`, pageWidth - 15, footerY, { align: 'right' });
  }

  doc.save(`window-${client.name || 'klient'}-${date}.pdf`);
}
