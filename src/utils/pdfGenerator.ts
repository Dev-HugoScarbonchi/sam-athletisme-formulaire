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
  kilometers: string;
  rentalVehicle: boolean;
  signature: string;
  signatureFile: File | null;
}

export const generateExpenseReportPDF = async (
  formData: FormData,
  totalAmount: number,
  kilometricReimbursement: number
): Promise<Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add text with automatic line wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return y + (lines.length * fontSize * 0.35);
  };

  // Header with logo placeholder and title
  pdf.setFillColor(37, 99, 235); // Blue color
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  // Logo placeholder (white rectangle)
  pdf.setFillColor(255, 255, 255);
  pdf.rect(margin, 8, 24, 24, 'F');
  pdf.setTextColor(37, 99, 235);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SAM', margin + 12, 22, { align: 'center' });

  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FICHE DE REMBOURSEMENT DE FRAIS', margin + 35, 20);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('SAM Athlétisme Mérignacais', margin + 35, 28);

  yPosition = 50;

  // Reset text color to black
  pdf.setTextColor(0, 0, 0);

  // Personal Information Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INFORMATIONS PERSONNELLES', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const personalInfo = [
    `Lieu: ${formData.place}`,
    `Date: ${new Date(formData.date).toLocaleDateString('fr-FR')}`,
    `Nom: ${formData.lastName}`,
    `Prénom: ${formData.firstName}`,
    `Rôle/Fonction: ${formData.role}`,
    `Objet de la demande: ${formData.subject}`,
    `Mode de paiement: ${formData.paymentMethod}`,
    `Date de la demande: ${new Date(formData.requestDate).toLocaleDateString('fr-FR')}`
  ];

  personalInfo.forEach(info => {
    yPosition = addWrappedText(info, margin, yPosition, pageWidth - 2 * margin);
    yPosition += 2;
  });

  yPosition += 5;

  // Motivation Section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MOTIVATION', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  yPosition = addWrappedText(formData.motivation, margin, yPosition, pageWidth - 2 * margin);
  yPosition += 10;

  // Expenses Section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DÉTAIL DES DÉPENSES', margin, yPosition);
  yPosition += 10;

  // Table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Nature de la dépense', margin + 2, yPosition);
  pdf.text('Montant (€)', pageWidth - margin - 30, yPosition);
  pdf.text('Justificatifs', pageWidth - margin - 80, yPosition);
  yPosition += 8;

  // Table content
  pdf.setFont('helvetica', 'normal');
  formData.expenses.forEach((expense, index) => {
    if (expense.nature.trim() && expense.amount.trim()) {
      const amount = parseFloat(expense.amount) || 0;
      const attachmentCount = expense.attachments.length;
      
      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 6, 'F');
      }
      
      pdf.text(expense.nature, margin + 2, yPosition);
      pdf.text(amount.toFixed(2), pageWidth - margin - 30, yPosition);
      pdf.text(`${attachmentCount} fichier(s)`, pageWidth - margin - 80, yPosition);
      yPosition += 6;
    }
  });

  // Total expenses
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(37, 99, 235);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text('TOTAL DÉPENSES', margin + 2, yPosition + 5);
  pdf.text(`${totalAmount.toFixed(2)} €`, pageWidth - margin - 30, yPosition + 5);
  yPosition += 15;

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // Kilometric reimbursement section
  if (parseFloat(formData.kilometers) > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('REMBOURSEMENT KILOMÉTRIQUE', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nombre de kilomètres: ${formData.kilometers} km`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Taux de remboursement: 0,321 €/km`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Véhicule de location: ${formData.rentalVehicle ? 'Oui' : 'Non'}`, margin, yPosition);
    yPosition += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(37, 99, 235);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text('TOTAL KILOMÉTRIQUE', margin + 2, yPosition + 5);
    pdf.text(`${kilometricReimbursement.toFixed(2)} €`, pageWidth - margin - 30, yPosition + 5);
    yPosition += 15;

    // Reset text color
    pdf.setTextColor(0, 0, 0);
  }

  // Grand total
  const grandTotal = totalAmount + kilometricReimbursement;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(220, 38, 127); // Red color
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text('MONTANT TOTAL DE LA DEMANDE', margin + 2, yPosition + 8);
  pdf.text(`${grandTotal.toFixed(2)} €`, pageWidth - margin - 40, yPosition + 8);
  yPosition += 20;

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // Check if we need a new page for signatures
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  // Signatures section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SIGNATURES', margin, yPosition);
  yPosition += 15;

  // Signature boxes
  const signatureBoxWidth = (pageWidth - 3 * margin) / 2;
  const signatureBoxHeight = 40;

  // Left signature box - Demandeur
  pdf.rect(margin, yPosition, signatureBoxWidth, signatureBoxHeight);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signature du demandeur', margin + 5, yPosition - 3);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${formData.firstName} ${formData.lastName}`, margin + 5, yPosition + signatureBoxHeight + 8);

  // Add demandeur signature if available
  if (formData.signature) {
    try {
      if (formData.signature.startsWith('data:image/')) {
        // For drawn signatures or uploaded images
        pdf.addImage(formData.signature, 'PNG', margin + 5, yPosition + 5, signatureBoxWidth - 10, 25);
      }
    } catch (error) {
      console.warn('Could not add demandeur signature to PDF:', error);
    }
  }

  // Right signature box - Président
  const rightBoxX = margin + signatureBoxWidth + margin;
  pdf.rect(rightBoxX, yPosition, signatureBoxWidth, signatureBoxHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signature du président', rightBoxX + 5, yPosition - 3);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Michel Rémy, Président du club', rightBoxX + 5, yPosition + signatureBoxHeight + 8);

  // Add president signature placeholder
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text('(Signature à apposer)', rightBoxX + 5, yPosition + 20);

  // Footer
  yPosition = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, margin, yPosition);
  pdf.text('SAM Athlétisme Mérignacais - Formulaire de remboursement de frais', pageWidth - margin, yPosition, { align: 'right' });

  return pdf.output('blob');
};