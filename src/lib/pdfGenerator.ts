import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClientData, ConfigItem, PRODUCT_LABELS, COLOR_LABELS, PANE_TYPE_LABELS } from '@/types/configurator';

export function generatePDF(client: ClientData, items: ConfigItem[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(75, 55, 35);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OFERTË', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Dyer & Dritare — Konfigurim Profesional', pageWidth / 2, 28, { align: 'center' });

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
    const total = area * item.pricePerSqm * item.quantity;
    
    // Build structure description
    let structureDesc = PRODUCT_LABELS[item.productType];
    if (item.productType === 'dritare' && item.structure) {
      const paneDescs = item.structure.panes.map(p => PANE_TYPE_LABELS[p.type]).join(' + ');
      structureDesc += ` (${paneDescs})`;
    }

    return [
      (i + 1).toString(),
      structureDesc,
      `${item.width} x ${item.height}`,
      area.toFixed(2),
      COLOR_LABELS[item.color],
      item.quantity.toString(),
      `€${item.pricePerSqm}`,
      `€${total.toFixed(2)}`,
    ];
  });

  const grandTotal = items.reduce((sum, item) => {
    const area = (item.width / 1000) * (item.height / 1000);
    return sum + area * item.pricePerSqm * item.quantity;
  }, 0);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Produkti', 'Dim. (mm)', 'm²', 'Ngjyra', 'Sasia', '€/m²', 'Totali']],
    body: tableData,
    foot: [['', '', '', '', '', '', 'TOTALI', `€${grandTotal.toFixed(2)}`]],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [75, 55, 35], textColor: 255 },
    footStyles: { fillColor: [240, 235, 228], textColor: [50, 50, 50], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 246, 243] },
    theme: 'grid',
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Dokumenti u gjenerua automatikisht — Dyer & Dritare Konfigurator', pageWidth / 2, footerY, { align: 'center' });

  doc.save(`oferte-${client.name || 'klient'}-${date}.pdf`);
}
