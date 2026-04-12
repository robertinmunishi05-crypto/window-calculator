import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ClientData,
  ConfigItem,
  COLOR_LABELS,
  describeNode,
  calculateLinearMeters,
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
  frameT: number = 2,
  divT: number = 1.5,
) {
  const c = COLOR_MAP[color];

  if (node.type === 'pane' && node.paneConfig) {
    const config = node.paneConfig;
    const isDoorPanel = config.elementType === 'door' && config.doorFill === 'panel';
    const isDoorCombo = config.elementType === 'door' && config.doorFill === 'combo';

    if (isDoorPanel) {
      doc.setFillColor(c.panel[0], c.panel[1], c.panel[2]);
      doc.rect(x, y, w, h, 'F');
    } else if (isDoorCombo) {
      const panelRatio = (config.doorComboRatio ?? 50) / 100;
      const glassH = h * (1 - panelRatio);
      doc.setFillColor(c.glass[0], c.glass[1], c.glass[2]);
      doc.rect(x, y, w, glassH, 'F');
      doc.setFillColor(c.panel[0], c.panel[1], c.panel[2]);
      doc.rect(x, y + glassH, w, h * panelRatio, 'F');
      doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
      doc.setLineWidth(0.3);
      doc.line(x, y + glassH, x + w, y + glassH);
    } else {
      doc.setFillColor(c.glass[0], c.glass[1], c.glass[2]);
      doc.rect(x, y, w, h, 'F');
    }

    // Fixed X
    if (config.elementType === 'fixed') {
      doc.setDrawColor(c.frame[0], c.frame[1], c.frame[2]);
      doc.setLineWidth(0.2);
      doc.line(x + 1, y + 1, x + w - 1, y + h - 1);
      doc.line(x + w - 1, y + 1, x + 1, y + h - 1);
    }

    // Opening arrow
    if (config.elementType === 'opening' || config.elementType === 'tilt-turn') {
      doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
      doc.setLineWidth(0.3);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const dir = config.openingDirection || 'left';
      if (dir === 'left' || dir === 'side') {
        doc.line(cx + 3, cy, cx - 3, cy);
        doc.line(cx - 3, cy, cx - 1, cy - 2);
      } else if (dir === 'right') {
        doc.line(cx - 3, cy, cx + 3, cy);
        doc.line(cx + 3, cy, cx + 1, cy - 2);
      } else if (dir === 'top') {
        doc.line(cx, cy + 3, cx, cy - 3);
        doc.line(cx, cy - 3, cx - 2, cy - 1);
      }
    }

    // Slider
    if (config.elementType === 'slider') {
      doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
      doc.setLineWidth(0.3);
      const cy = y + h / 2;
      doc.line(x + 3, cy, x + w - 3, cy);
    }

    // Door handle
    if (config.elementType === 'door') {
      doc.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
      doc.circle(x + w - 4, y + h / 2, 1, 'F');
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

      if (node.direction === 'vertical') {
        cx = x + offset;
        cy = y;
        cw = w * ratio;
        ch = h;
        offset += cw;
      } else {
        cx = x;
        cy = y + offset;
        cw = w;
        ch = h * ratio;
        offset += ch;
      }

      drawNodePDF(doc, child, cx, cy, cw, ch, color, frameT, divT);

      // Divider
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

export function generatePDF(client: ClientData, items: ConfigItem[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

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
    const area = (item.width / 1000) * (item.height / 1000);
    const lm = calculateLinearMeters(item);

    return [
      (i + 1).toString(),
      describeNode(item.rootNode),
      `${item.width} x ${item.height}`,
      area.toFixed(2),
      COLOR_LABELS[item.color],
      item.quantity.toString(),
      `${lm.total.toFixed(2)} m`,
    ];
  });

  const totalLM = items.reduce((sum, item) => {
    return sum + calculateLinearMeters(item).total * item.quantity;
  }, 0);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Konfigurimi', 'Dim. (mm)', 'm²', 'Ngjyra', 'Sasia', 'Profil (m)']],
    body: tableData,
    foot: [['', '', '', '', '', 'TOTALI', `${totalLM.toFixed(2)} m`]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [75, 55, 35], textColor: 255 },
    footStyles: { fillColor: [240, 235, 228], textColor: [50, 50, 50], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 246, 243] },
    theme: 'grid',
    columnStyles: {
      1: { cellWidth: 50 },
    },
  });

  // Draw sketches for each item on new pages
  items.forEach((item, idx) => {
    doc.addPage();

    // Header bar
    doc.setFillColor(75, 55, 35);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Element ${idx + 1} — Skica`, pageWidth / 2, 16, { align: 'center' });

    // Info
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dimensionet: ${item.width} × ${item.height} mm`, 15, 38);
    doc.text(`Ngjyra: ${COLOR_LABELS[item.color]}`, 15, 45);
    const lm = calculateLinearMeters(item);
    doc.text(`Profil total: ${lm.total.toFixed(2)} m`, 15, 52);
    doc.text(`  Kornizë e jashtme: ${lm.outerFrame.toFixed(2)} m | Ndarje: ${lm.innerDividers.toFixed(2)} m | Hapëse: ${lm.openingFrames.toFixed(2)} m`, 15, 59);

    // Draw the window sketch
    const sketchMaxW = pageWidth - 40;
    const sketchMaxH = 120;
    const ratio = item.width / item.height;
    let skW: number, skH: number;
    if (ratio > sketchMaxW / sketchMaxH) {
      skW = sketchMaxW; skH = sketchMaxW / ratio;
    } else {
      skH = sketchMaxH; skW = sketchMaxH * ratio;
    }

    const skX = (pageWidth - skW) / 2;
    const skY = 70;
    const frameT = 2;

    // Outer frame
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(frameT);
    doc.rect(skX, skY, skW, skH);

    // Draw recursive structure
    drawNodePDF(doc, item.rootNode, skX + frameT, skY + frameT, skW - frameT * 2, skH - frameT * 2, item.color);

    // Dimension annotations
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    // Width annotation
    doc.text(`${item.width} mm`, skX + skW / 2, skY + skH + 8, { align: 'center' });
    // Height annotation
    doc.text(`${item.height} mm`, skX - 5, skY + skH / 2, { align: 'right', angle: 90 } as any);

    // Configuration description
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Konfigurimi: ${describeNode(item.rootNode)}`, 15, skY + skH + 20);
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Window — Konfigurator Profesional', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`${i} / ${totalPages}`, pageWidth - 15, footerY, { align: 'right' });
  }

  doc.save(`window-${client.name || 'klient'}-${date}.pdf`);
}
