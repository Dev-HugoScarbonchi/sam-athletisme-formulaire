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

  // Clean header with simple design
  // Logo placeholder (light grey rectangle)
  pdf.setFillColor(240, 240, 240); // Light grey
  pdf.rect(margin, yPosition, 24, 24, 'F');
  pdf.setDrawColor(200, 200, 200); // Grey border
  pdf.rect(margin, yPosition, 24, 24, 'S');
  
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SAM', margin + 12, yPosition + 15, { align: 'center' });

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FICHE DE REMBOURSEMENT DE FRAIS', margin + 35, yPosition + 12);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('SAM Athlétisme Mérignacais', margin + 35, yPosition + 22);
  
  // Simple line separator
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition + 30, pageWidth - margin, yPosition + 30);
  yPosition = yPosition + 40;

  // Ensure text color is black
  pdf.setTextColor(0, 0, 0);

  // Personal Information Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INFORMATIONS PERSONNELLES', margin, yPosition);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition + 2, margin + 80, yPosition + 2);
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
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition + 2, margin + 40, yPosition + 2);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  yPosition = addWrappedText(formData.motivation, margin, yPosition, pageWidth - 2 * margin);
  yPosition += 10;

  // Expenses Section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DÉTAIL DES DÉPENSES', margin, yPosition);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition + 2, margin + 70, yPosition + 2);
  yPosition += 10;

  // Table header
  pdf.setFillColor(250, 250, 250); // Very light grey
  pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'S');
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
      const attachmentNames = expense.attachments.map(file => file.name);
      
      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(248, 248, 248); // Very light grey
        const rowHeight = Math.max(6, attachmentNames.length * 3 + 3);
        pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, rowHeight, 'F');
      }
      
      // Add subtle border
      pdf.setDrawColor(230, 230, 230);
      const rowHeight = Math.max(6, attachmentNames.length * 3 + 3);
      pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, rowHeight, 'S');
      
      pdf.text(expense.nature, margin + 2, yPosition);
      pdf.text(amount.toFixed(2), pageWidth - margin - 30, yPosition);
      
      // Display file names instead of just count
      if (attachmentNames.length > 0) {
        pdf.setFontSize(8);
        attachmentNames.forEach((fileName, fileIndex) => {
          const displayName = fileName.length > 25 ? fileName.substring(0, 22) + '...' : fileName;
          pdf.text(`• ${displayName}`, pageWidth - margin - 80, yPosition + (fileIndex * 3));
        });
        pdf.setFontSize(10);
        yPosition += Math.max(6, attachmentNames.length * 3);
      } else {
        pdf.text('Aucun fichier', pageWidth - margin - 80, yPosition);
        yPosition += 6;
      }
    }
  });

  // Total expenses
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(220, 220, 220); // Light grey
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
  pdf.setDrawColor(180, 180, 180);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'S');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('TOTAL DÉPENSES', margin + 2, yPosition + 5);
  pdf.text(`${totalAmount.toFixed(2)} €`, pageWidth - margin - 30, yPosition + 5);
  yPosition += 15;

  // Ensure text color is black
  pdf.setTextColor(0, 0, 0);

  // Kilometric reimbursement section
  if (parseFloat(formData.kilometers) > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('REMBOURSEMENT KILOMÉTRIQUE', margin, yPosition);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition + 2, margin + 90, yPosition + 2);
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
    pdf.setFillColor(220, 220, 220); // Light grey
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
    pdf.setDrawColor(180, 180, 180);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'S');
    pdf.setTextColor(0, 0, 0); // Black text
    pdf.text('TOTAL KILOMÉTRIQUE', margin + 2, yPosition + 5);
    pdf.text(`${kilometricReimbursement.toFixed(2)} €`, pageWidth - margin - 30, yPosition + 5);
    yPosition += 15;

    // Ensure text color is black
    pdf.setTextColor(0, 0, 0);
  }

  // Grand total
  const grandTotal = totalAmount + kilometricReimbursement;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(200, 200, 200); // Medium grey
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');
  pdf.setDrawColor(150, 150, 150);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'S');
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text('MONTANT TOTAL DE LA DEMANDE', margin + 2, yPosition + 8);
  pdf.text(`${grandTotal.toFixed(2)} €`, pageWidth - margin - 40, yPosition + 8);
  yPosition += 20;

  // Ensure text color is black
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
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition + 2, margin + 40, yPosition + 2);
  yPosition += 15;

  // Signature boxes
  const signatureBoxWidth = (pageWidth - 3 * margin) / 2;
  const signatureBoxHeight = 40;

  // Left signature box - Demandeur
  pdf.setDrawColor(180, 180, 180);
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
  pdf.setDrawColor(180, 180, 180);
  pdf.rect(rightBoxX, yPosition, signatureBoxWidth, signatureBoxHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signature du président', rightBoxX + 5, yPosition - 3);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Michel Rémy, Président du club', rightBoxX + 5, yPosition + signatureBoxHeight + 8);

  // Add president signature placeholder
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120); // Medium grey
  pdf.text('(Signature à apposer)', rightBoxX + 5, yPosition + 20);

  // Footer
  yPosition = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120); // Medium grey
  pdf.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, margin, yPosition);
  pdf.text('SAM Athlétisme Mérignacais - Formulaire de remboursement de frais', pageWidth - margin, yPosition, { align: 'right' });

  return pdf.output('blob');
};