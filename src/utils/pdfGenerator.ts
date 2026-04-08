import jsPDF from 'jspdf';

interface ExpenseRow {
  id: string;
  nature: string;
  amount: string;
  attachments: File[];
}

interface FormData {
  place: string;
  date: string;
  firstName: string;
  lastName: string;
  role: string;
  subject: string;
  motivation: string;
  paymentMethod: string;
  requestDate: string;
  expenses: ExpenseRow[];
  transportExpenses?: ExpenseRow[];
  accommodationExpenses?: ExpenseRow[];
  otherExpenses?: ExpenseRow[];
  kilometers: string;
  rentalVehicle: boolean;
  signature: string | null;
  signatureFile: File | null;
}

// Helper: load image as data URL
const loadImageAsDataUrl = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
};

export const generateExpenseReportPDF = async (
  formData: FormData,
  totalAmount: number,
  kilometricReimbursement: number
): Promise<Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // ─── Helper: wrapped text ───────────────────────────────────────
  const addWrappedText = (text: string, x: number, yPos: number, maxWidth: number, fontSize: number = 10): number => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, yPos);
    return yPos + lines.length * fontSize * 0.4;
  };

  // ─── Helper: check page break ──────────────────────────────────
  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 25) {
      pdf.addPage();
      y = margin;
    }
  };

  // ─── Helper: section title ─────────────────────────────────────
  const addSectionTitle = (title: string) => {
    checkPageBreak(15);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175); // blue-800
    pdf.text(title, margin, y);
    y += 2;
    pdf.setDrawColor(30, 64, 175);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + pdf.getTextWidth(title) + 5, y);
    y += 8;
    pdf.setTextColor(0, 0, 0);
  };

  // ─── Helper: expense table ─────────────────────────────────────
  const addExpenseTable = (expenses: ExpenseRow[], label: string, subtotalLabel: string): number => {
    const validExpenses = expenses.filter(e => e.nature.trim() && e.amount.trim());
    if (validExpenses.length === 0) return 0;

    let subtotal = 0;

    // Table header
    checkPageBreak(10 + validExpenses.length * 7 + 10);
    pdf.setFillColor(245, 247, 250);
    pdf.rect(margin, y - 4, contentWidth, 8, 'F');
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(margin, y - 4, contentWidth, 8, 'S');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60);
    pdf.text('Nature de la dépense', margin + 3, y);
    pdf.text('Montant (€)', pageWidth - margin - 25, y);
    y += 7;

    // Rows
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    validExpenses.forEach((expense, index) => {
      const amount = parseFloat(expense.amount) || 0;
      subtotal += amount;

      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 252);
        pdf.rect(margin, y - 4, contentWidth, 7, 'F');
      }
      pdf.setDrawColor(235, 235, 235);
      pdf.rect(margin, y - 4, contentWidth, 7, 'S');

      pdf.setFontSize(9);
      pdf.text(expense.nature, margin + 3, y);
      pdf.text(amount.toFixed(2) + ' €', pageWidth - margin - 25, y);
      y += 7;
    });

    // Subtotal row
    pdf.setFillColor(230, 235, 245);
    pdf.rect(margin, y - 4, contentWidth, 8, 'F');
    pdf.setDrawColor(180, 190, 210);
    pdf.rect(margin, y - 4, contentWidth, 8, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(subtotalLabel, margin + 3, y);
    pdf.text(subtotal.toFixed(2) + ' €', pageWidth - margin - 25, y);
    y += 10;

    return subtotal;
  };

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════

  // Logo
  try {
    const logoDataUrl = await loadImageAsDataUrl('/Logo SAM Athlétisme 2016-17.png');
    pdf.addImage(logoDataUrl, 'PNG', margin, y, 22, 22);
  } catch {
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, y, 22, 22, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SAM', margin + 11, y + 13, { align: 'center' });
  }

  // Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text('FICHE DE REMBOURSEMENT DE FRAIS', margin + 30, y + 10);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('SAM Athlétisme Mérignacais', margin + 30, y + 18);

  // Separator
  y += 28;
  pdf.setDrawColor(30, 64, 175);
  pdf.setLineWidth(0.8);
  pdf.line(margin, y, pageWidth - margin, y);
  // Red accent
  pdf.setDrawColor(220, 38, 38);
  pdf.setLineWidth(0.8);
  pdf.line(pageWidth - margin - 40, y, pageWidth - margin, y);
  y += 10;

  pdf.setTextColor(0, 0, 0);

  // ═══════════════════════════════════════════════════════════════
  // INFORMATIONS PERSONNELLES
  // ═══════════════════════════════════════════════════════════════

  addSectionTitle('INFORMATIONS PERSONNELLES');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const infoLines = [
    ['Lieu', formData.place],
    ['Date', formData.date ? new Date(formData.date).toLocaleDateString('fr-FR') : ''],
    ['Nom', formData.lastName],
    ['Prénom', formData.firstName],
    ['Rôle / Fonction', formData.role],
    ['Objet de la demande', formData.subject],
    ['Mode de paiement', formData.paymentMethod],
    ['Date de la demande', formData.requestDate ? new Date(formData.requestDate).toLocaleDateString('fr-FR') : ''],
  ];

  infoLines.forEach(([label, value]) => {
    checkPageBreak(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label} :`, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value || '', margin + 45, y);
    y += 5.5;
  });
  y += 5;

  // ═══════════════════════════════════════════════════════════════
  // MOTIVATION
  // ═══════════════════════════════════════════════════════════════

  addSectionTitle('MOTIVATION');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  y = addWrappedText(formData.motivation || '', margin, y, contentWidth, 10);
  y += 8;

  // ═══════════════════════════════════════════════════════════════
  // DÉPENSES
  // ═══════════════════════════════════════════════════════════════

  addSectionTitle('DÉTAIL DES DÉPENSES');

  // 1. Frais de transport
  const transportExpenses = formData.transportExpenses || formData.expenses.filter(e => e.nature.toLowerCase().includes('transport'));
  if (transportExpenses.length > 0 && transportExpenses.some(e => e.nature.trim())) {
    checkPageBreak(10);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(37, 99, 235); // blue-600
    pdf.text('Frais de transport', margin, y);
    y += 6;
    pdf.setTextColor(0, 0, 0);
    addExpenseTable(transportExpenses, 'Transport', 'Sous-total transport');
  }

  // Kilometric reimbursement
  if (parseFloat(formData.kilometers) > 0) {
    checkPageBreak(25);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Remboursement kilométrique : ${formData.kilometers} km × 0,321 €/km = ${kilometricReimbursement.toFixed(2)} €`, margin + 3, y);
    y += 5;
    pdf.text(`Véhicule de location : ${formData.rentalVehicle ? 'Oui' : 'Non'}`, margin + 3, y);
    y += 8;
  }

  // 2. Frais d'hébergement + repas
  const accommodationExpenses = formData.accommodationExpenses || [];
  if (accommodationExpenses.length > 0 && accommodationExpenses.some(e => e.nature.trim())) {
    checkPageBreak(10);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(5, 150, 105); // emerald-600
    pdf.text('Frais d\'hébergement + repas du soir', margin, y);
    y += 4;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Plafonds : 50 € pour la nuitée, 20 € pour le repas', margin, y);
    y += 6;
    pdf.setTextColor(0, 0, 0);
    addExpenseTable(accommodationExpenses, 'Hébergement', 'Sous-total hébergement + repas');
  }

  // 3. Autres frais
  const otherExpenses = formData.otherExpenses || [];
  if (otherExpenses.length > 0 && otherExpenses.some(e => e.nature.trim())) {
    checkPageBreak(10);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(217, 119, 6); // amber-600
    pdf.text('Autres frais', margin, y);
    y += 6;
    pdf.setTextColor(0, 0, 0);
    addExpenseTable(otherExpenses, 'Autres', 'Sous-total autres frais');
  }

  // If using legacy expenses array (fallback)
  if (!formData.transportExpenses && !formData.accommodationExpenses && !formData.otherExpenses) {
    addExpenseTable(formData.expenses, 'Dépenses', 'Total dépenses');
  }

  // ═══════════════════════════════════════════════════════════════
  // GRAND TOTAL
  // ═══════════════════════════════════════════════════════════════

  const grandTotal = totalAmount + kilometricReimbursement;

  checkPageBreak(20);
  pdf.setFillColor(30, 64, 175); // blue-800
  pdf.roundedRect(margin, y - 2, contentWidth, 16, 2, 2, 'F');
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('MONTANT TOTAL DE LA DEMANDE', margin + 5, y + 8);
  pdf.text(`${grandTotal.toFixed(2)} €`, pageWidth - margin - 5, y + 8, { align: 'right' });
  y += 22;

  pdf.setTextColor(0, 0, 0);

  // ═══════════════════════════════════════════════════════════════
  // SIGNATURES
  // ═══════════════════════════════════════════════════════════════

  checkPageBreak(70);
  addSectionTitle('SIGNATURES');

  const signBoxWidth = (contentWidth - 10) / 2;
  const signBoxHeight = 40;
  const leftX = margin;
  const rightX = margin + signBoxWidth + 10;

  // ─── Left box: Demandeur ───────────────────────────────────────
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.rect(leftX, y, signBoxWidth, signBoxHeight);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signature du demandeur', leftX + 3, y - 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`${formData.firstName} ${formData.lastName}`, leftX + 3, y + signBoxHeight + 5);

  // Add demandeur signature
  if (formData.signature && formData.signature.startsWith('data:image/')) {
    try {
      pdf.addImage(formData.signature, 'PNG', leftX + 5, y + 3, signBoxWidth - 10, signBoxHeight - 8);
    } catch (e) {
      console.warn('Could not add drawn signature:', e);
    }
  } else if (formData.signatureFile) {
    try {
      const reader = new FileReader();
      const sigDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (ev) => ev.target?.result ? resolve(ev.target.result as string) : reject(new Error('Read failed'));
        reader.onerror = reject;
        reader.readAsDataURL(formData.signatureFile!);
      });
      const fmt = formData.signatureFile.type.includes('png') ? 'PNG' : 'JPEG';
      pdf.addImage(sigDataUrl, fmt, leftX + 5, y + 3, signBoxWidth - 10, signBoxHeight - 8);
    } catch (e) {
      console.warn('Could not add uploaded signature:', e);
    }
  }

  // ─── Right box: Président ──────────────────────────────────────
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(rightX, y, signBoxWidth, signBoxHeight);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Michel Rémy', rightX + signBoxWidth - 3, y - 6, { align: 'right' });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Président du SAM athlétisme', rightX + signBoxWidth - 3, y - 2, { align: 'right' });
  pdf.setTextColor(0, 0, 0);

  // Add president signature image
  try {
    const presidentSigDataUrl = await loadImageAsDataUrl('/Signature_Michel.png');
    pdf.addImage(presidentSigDataUrl, 'JPEG', rightX + 10, y + 3, signBoxWidth - 20, signBoxHeight - 8);
  } catch (e) {
    console.warn('Could not add president signature:', e);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('(Signature)', rightX + signBoxWidth / 2, y + signBoxHeight / 2, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
  }

  y += signBoxHeight + 10;

  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════

  const footerY = pageHeight - 15;
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, margin, footerY);
  pdf.text('SAM Athlétisme Mérignacais — Formulaire de remboursement de frais', pageWidth - margin, footerY, { align: 'right' });

  return pdf.output('blob');
};
