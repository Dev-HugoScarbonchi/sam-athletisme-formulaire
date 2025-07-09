import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, FileText, Car, CreditCard, Upload, CheckCircle, AlertCircle, Image, Shield, ExternalLink } from 'lucide-react';
import { generateExpenseReportPDF } from './utils/pdfGenerator';
import { Analytics } from "@vercel/analytics/react";
import { SignatureSection } from './components/SignatureSection';

interface ExpenseRow {
  id: string;
  nature: string;
  amount: string;
  attachments: File[];
}

interface AttachmentGroup {
  id: string;
  files: File[];
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

interface FormErrors {
  [key: string]: string;
}

interface ValidationError {
  field: string;
  message: string;
  inputRef?: string;
}

interface ErrorPopupProps {
  errors: ValidationError[];
  onClose: () => void;
}

const ErrorPopup: React.FC<ErrorPopupProps> = ({ errors, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Erreurs de validation</h3>
          </div>
          
          <p className="text-gray-600 mb-4">
            Veuillez corriger les erreurs suivantes avant de soumettre le formulaire :
          </p>
          
          <div className="space-y-2 mb-6 overflow-y-auto flex-1 max-h-60">
            {errors.map((error, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-gray-900">{error.field}</p>
                  <p className="text-sm text-gray-600">{error.message}</p>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={onClose}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Fermer et corriger
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [formData, setFormData] = useState<FormData>({
    place: '',
    date: '',
    firstName: '',
    lastName: '',
    role: '',
    subject: '',
    motivation: '',
    paymentMethod: '',
    requestDate: '',
    expenses: [{ id: '1', nature: '', amount: '', attachments: [] }],
    kilometers: '',
    rentalVehicle: false,
    signature: '',
    signatureFile: null
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [emailSendSuccess, setEmailSendSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [signatureMode, setSignatureMode] = useState<'upload' | 'draw'>('upload');
  const [drawnSignature, setDrawnSignature] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Enhanced attachment system
  const [attachments, setAttachments] = useState<{
    transport: AttachmentGroup[];
    banking: AttachmentGroup[];
    other: AttachmentGroup[];
  }>({
    transport: [{ id: '1', files: [] }],
    banking: [{ id: '1', files: [] }],
    other: [{ id: '1', files: [] }]
  });

  // Calculate total amount
  const totalAmount = formData.expenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount) || 0;
    return sum + amount;
  }, 0);

  // Calculate kilometric reimbursement
  const kilometricReimbursement = (parseFloat(formData.kilometers) || 0) * 0.321;

  const validateFormNew = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validation des champs obligatoires
    if (!formData.place.trim()) {
      errors.push({ field: 'Lieu', message: 'Le lieu est obligatoire', inputRef: 'place' });
    }
    if (!formData.date) {
      errors.push({ field: 'Date', message: 'La date est obligatoire', inputRef: 'date' });
    }
    if (!formData.firstName.trim()) {
      errors.push({ field: 'Prénom', message: 'Le prénom est obligatoire', inputRef: 'firstName' });
    }
    if (!formData.lastName.trim()) {
      errors.push({ field: 'Nom', message: 'Le nom est obligatoire', inputRef: 'lastName' });
    }
    if (!formData.role.trim()) {
      errors.push({ field: 'Rôle/Fonction', message: 'Le rôle est obligatoire', inputRef: 'role' });
    }
    if (!formData.subject.trim()) {
      errors.push({ field: 'Objet de la demande', message: 'L\'objet est obligatoire', inputRef: 'subject' });
    }
    if (!formData.motivation.trim()) {
      errors.push({ field: 'Motivation', message: 'La motivation est obligatoire', inputRef: 'motivation' });
    }

    // Validation des dépenses
    const validExpenses = formData.expenses.filter(expense => 
      expense.nature.trim() && expense.amount.trim()
    );

    if (validExpenses.length === 0 && (!formData.kilometers || parseFloat(formData.kilometers) <= 0)) {
      errors.push({ 
        field: 'Dépenses', 
        message: 'Au moins une dépense ou un remboursement kilométrique est requis',
        inputRef: 'expenses'
      });
    }

    // Validation des montants
    validExpenses.forEach((expense, index) => {
      const amount = parseFloat(expense.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push({ 
          field: `Dépense ${index + 1}`, 
          message: 'Le montant doit être un nombre positif',
          inputRef: `expense-${expense.id}`
        });
      }
    });

    // Validation kilométrique
    if (formData.kilometers && formData.kilometers.trim()) {
      const km = parseFloat(formData.kilometers);
      if (isNaN(km) || km <= 0) {
        errors.push({ 
          field: 'Kilométrage', 
          message: 'Le nombre de kilomètres doit être un nombre positif',
          inputRef: 'kilometers'
        });
      }
    }

    // Validation de la signature
    if (!formData.signature && !formData.signatureFile) {
      errors.push({ 
        field: 'Signature', 
        message: 'Une signature est obligatoire (dessinée ou uploadée)',
        inputRef: 'signature'
      });
    }

    return errors;
  };

  const scrollToError = (inputRef: string) => {
    const element = document.getElementById(inputRef) || document.querySelector(`[data-field="${inputRef}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Clear validation errors for this field when user starts typing
    setValidationErrors(prev => prev.filter(error => error.inputRef !== field));
  };

  // Handle expense row changes
  const handleExpenseChange = (id: string, field: keyof ExpenseRow, value: string) => {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.map(expense =>
        expense.id === id ? { ...expense, [field]: value } : expense
      )
    }));
    // Clear validation errors for this expense when user starts typing
    setValidationErrors(prev => prev.filter(error => error.inputRef !== `expense-${id}`));
  };

  // Add new expense row
  const addExpenseRow = () => {
    const newId = Date.now().toString();
    setFormData(prev => ({
      ...prev,
      expenses: [...prev.expenses, { id: newId, nature: '', amount: '', attachments: [] }]
    }));
  };

  // Remove expense row
  const removeExpenseRow = (id: string) => {
    if (formData.expenses.length > 1) {
      setFormData(prev => ({
        ...prev,
        expenses: prev.expenses.filter(expense => expense.id !== id)
      }));
    }
  };

  // Handle expense attachments
  const handleExpenseAttachment = (expenseId: string, files: FileList | null) => {
    if (!files) return;
    
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.map(expense =>
        expense.id === expenseId 
          ? { ...expense, attachments: Array.from(files) }
          : expense
      )
    }));
  };

  // Enhanced attachment handling
  const addAttachmentGroup = (category: keyof typeof attachments) => {
    const newId = Date.now().toString();
    setAttachments(prev => ({
      ...prev,
      [category]: [...prev[category], { id: newId, files: [] }]
    }));
  };

  const removeAttachmentGroup = (category: keyof typeof attachments, id: string) => {
    if (attachments[category].length > 1) {
      setAttachments(prev => ({
        ...prev,
        [category]: prev[category].filter(group => group.id !== id)
      }));
    }
  };

  const handleFileUpload = (category: keyof typeof attachments, groupId: string, files: FileList | null) => {
    if (!files) return;
    
    setAttachments(prev => ({
      ...prev,
      [category]: prev[category].map(group =>
        group.id === groupId 
          ? { ...group, files: Array.from(files) }
          : group
      )
    }));
  };

  // Signature drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      setDrawnSignature(dataURL);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setDrawnSignature('');
      }
    }
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signatureMode]);

  // Handle signature file upload
  const handleSignatureFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, signature: 'Veuillez sélectionner un fichier image (JPG, PNG, GIF, BMP, WEBP)' }));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, signature: 'La taille du fichier ne doit pas dépasser 5MB' }));
      return;
    }
    
    setFormData(prev => ({ ...prev, signatureFile: file }));
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFormData(prev => ({ ...prev, signature: e.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
    
    // Clear any signature errors
    if (errors.signature) {
      setErrors(prev => ({ ...prev, signature: '' }));
    }
    
    // Clear signature validation error
    setValidationErrors(prev => prev.filter(error => error.inputRef !== 'signature'));
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Le nom est requis';
    if (!formData.place.trim()) newErrors.place = 'Le lieu est requis';
    if (!formData.date) newErrors.date = 'La date est requise';
    if (!formData.role.trim()) newErrors.role = 'Le rôle/fonction est requis';
    if (!formData.subject.trim()) newErrors.subject = 'L\'objet de la demande est requis';
    if (!formData.motivation.trim()) newErrors.motivation = 'La motivation est requise';
    if (!formData.paymentMethod.trim()) newErrors.paymentMethod = 'Le mode de paiement est requis';
    if (!formData.requestDate) newErrors.requestDate = 'La date de demande est requise';
    
    // Validate signature (uploaded only)
    if (!formData.signatureFile) {
      newErrors.signature = 'La signature est requise (fichier image)';
    }
    
    // Validate expenses
    const hasValidExpenses = formData.expenses.some(expense => 
      expense.nature.trim() && expense.amount.trim()
    );
    if (!hasValidExpenses) newErrors.expenses = 'Au moins une dépense est requise';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePDF = async () => {
    // Validate form before generating PDF
    const errors = validateFormNew();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorPopup(true);
      return null;
    }

    try {
      const pdfBlob = await generateExpenseReportPDF(formData, totalAmount, kilometricReimbursement);
      return pdfBlob;
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      setValidationErrors([{ 
        field: 'Génération PDF', 
        message: 'Erreur lors de la génération du PDF. Veuillez réessayer.' 
      }]);
      setShowErrorPopup(true);
      return null;
    }
  };

  // Fonction pour vérifier la connectivité réseau
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      const response = await fetch('https://api.scarbonk.fr/form-handler.php', {
        method: 'HEAD',
        mode: 'cors'
      });
      return response.ok || response.status === 405; // 405 = Method Not Allowed est OK pour HEAD
    } catch (error) {
      return false;
    }
  };

  const handleSignatureChange = (newSignature: string | null, newSignatureFile: File | null) => {
    setFormData(prev => ({ 
      ...prev, 
      signature: newSignature || '',
      signatureFile: newSignatureFile
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form first
    const errors = validateFormNew();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorPopup(true);
      return;
    }
    
    setIsSubmitting(true);
    setEmailSendSuccess(false);
    setSubmitStatus('idle');
    
    // Vérifier la connectivité réseau avant de continuer
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      setValidationErrors([
        { field: 'Connexion réseau', message: 'Problème de connexion réseau détecté. Veuillez vérifier votre connexion internet et réessayer.' },
        { field: 'Support', message: 'Si le problème persiste, contactez l\'administrateur.' }
      ]);
      setShowErrorPopup(true);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const formDataToSend = new FormData();
      
      // Generate PDF summary
      const pdfBlob = await generatePDF();
      if (!pdfBlob) {
        setIsSubmitting(false);
        return;
      }
      formDataToSend.append('summary_pdf', pdfBlob, 'fiche_remboursement.pdf');
      
      // Automatically download PDF for user
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = pdfUrl;
      
      // Format filename: fiche_remboursement_[date]_[prenom-nom]_[motif].pdf
      const formatDate = formData.requestDate.replace(/-/g, '');
      const formatName = `${formData.firstName}-${formData.lastName}`.toLowerCase().replace(/\s+/g, '-');
      const formatMotif = formData.subject.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      downloadLink.download = `fiche_remboursement_${formatDate}_${formatName}_${formatMotif}.pdf`;
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(pdfUrl);
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'expenses') {
          // Include file names in the expenses data for email
          const expensesWithFileNames = value.map(expense => ({
            ...expense,
            attachmentNames: expense.attachments.map(file => file.name)
          }));
          formDataToSend.append(key, JSON.stringify(expensesWithFileNames));
        } else if (key === 'signatureFile' && value instanceof File) {
          // Don't send signature as attachment - it's embedded in PDF
          // formDataToSend.append('signatureFile', value);
        } else if (key !== 'signatureFile') {
          formDataToSend.append(key, value.toString());
        }
      });
      
      // Add signature file if available
      if (formData.signatureFile) {
        formDataToSend.append('signatureFile', formData.signatureFile);
      }
      
      // Add all attachment files with category prefixes
      Object.entries(attachments).forEach(([category, groups]) => {
        groups.forEach((group, groupIndex) => {
          group.files.forEach((file, fileIndex) => {
            formDataToSend.append(`${category}_${groupIndex}_${fileIndex}`, file);
          });
        });
      });
      
      // Add expense attachments
      formData.expenses.forEach((expense, expenseIndex) => {
        expense.attachments.forEach((file, fileIndex) => {
          formDataToSend.append(`expense_${expenseIndex}_${fileIndex}`, file);
        });
      });
      
      // Add file names summary for email
      const fileNamesSummary = {
        expenseFiles: formData.expenses.map((expense, index) => ({
          expenseIndex: index,
          nature: expense.nature,
          amount: expense.amount,
          files: expense.attachments.map(file => file.name)
        })).filter(expense => expense.files.length > 0),
        
        attachmentFiles: Object.entries(attachments).map(([category, groups]) => ({
          category,
          files: groups.flatMap(group => group.files.map(file => file.name))
        })).filter(cat => cat.files.length > 0)
      };
      
      formDataToSend.append('fileNamesSummary', JSON.stringify(fileNamesSummary));
      
      // Create formatted email content with file names
      const emailContent = `
DEMANDE DE REMBOURSEMENT DE FRAIS
SAM Athlétisme Mérignacais

INFORMATIONS PERSONNELLES:
- Nom: ${formData.lastName}
- Prénom: ${formData.firstName}
- Rôle/Fonction: ${formData.role}
- Lieu: ${formData.place}
- Date: ${new Date(formData.date).toLocaleDateString('fr-FR')}
- Objet de la demande: ${formData.subject}
- Mode de paiement: ${formData.paymentMethod}
- Date de la demande: ${new Date(formData.requestDate).toLocaleDateString('fr-FR')}

MOTIVATION:
${formData.motivation}

DÉTAIL DES DÉPENSES:
${formData.expenses.filter(expense => expense.nature.trim() && expense.amount.trim()).map(expense => {
  const filesList = expense.attachments.length > 0 
    ? ` - Fichiers: ${expense.attachments.map(file => file.name).join(', ')}`
    : ' - Aucun fichier joint';
  return `${expense.nature}: ${parseFloat(expense.amount).toFixed(2)} €${filesList}`;
}).join('\n')}

TOTAL DÉPENSES: ${totalAmount.toFixed(2)} €

${parseFloat(formData.kilometers) > 0 ? `
REMBOURSEMENT KILOMÉTRIQUE:
- Nombre de kilomètres: ${formData.kilometers} km
- Taux: 0,321 €/km
- Véhicule de location: ${formData.rentalVehicle ? 'Oui' : 'Non'}
- Montant kilométrique: ${kilometricReimbursement.toFixed(2)} €
` : ''}
MONTANT TOTAL DE LA DEMANDE: ${(totalAmount + kilometricReimbursement).toFixed(2)} €

PIÈCES JUSTIFICATIVES SUPPLÉMENTAIRES:
${Object.entries(attachments).map(([category, groups]) => {
  const categoryNames = {
    transport: 'Documents de Transport',
    banking: 'Informations Bancaires', 
    other: 'Documents Supplémentaires'
  };
  const allFiles = groups.flatMap(group => group.files.map(file => file.name));
  return allFiles.length > 0 
    ? `${categoryNames[category as keyof typeof categoryNames]}:\n${allFiles.map(file => `- ${file}`).join('\n')}`
    : '';
}).filter(section => section).join('\n\n')}

---
Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
      `.trim();
      
      formDataToSend.append('emailContent', emailContent);
      
      // Add calculated fields
      formDataToSend.append('totalAmount', totalAmount.toString());
      formDataToSend.append('kilometricReimbursement', kilometricReimbursement.toString());
      
      // Add email configuration
      // Tentative d'envoi avec retry et timeout
      let response;
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes timeout
          
          response = await fetch('https://api.scarbonk.fr/form-handler.php', {
            method: 'POST',
            body: formDataToSend,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            break; // Succès, sortir de la boucle
          } else {
            throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          lastError = error;
          if (attempt === maxRetries) {
            throw error; // Dernière tentative échouée
          }
          // Attendre avant de réessayer (backoff exponentiel)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      
      if (response && response.ok) {
        // Vérifier le contenu de la réponse
        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          // Si ce n'est pas du JSON, vérifier si c'est un message de succès
          if (responseText.includes('success') || responseText.includes('envoyé')) {
            responseData = { success: true, message: responseText };
          } else {
            throw new Error('Réponse serveur invalide');
          }
        }
        
        if (responseData.success !== false) {
          setEmailSendSuccess(true);
          setSubmitStatus('success');
          console.log('✅ Formulaire envoyé avec succès');
          console.log('📄 PDF généré et téléchargé automatiquement');
          console.log('💰 Montant total:', (totalAmount + kilometricReimbursement).toFixed(2), '€');
        } else {
          throw new Error(responseData.message || 'Erreur lors de l\'envoi du formulaire');
        }
      } else {
        throw new Error(`Erreur serveur: ${response?.status} ${response?.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      setEmailSendSuccess(false);
      setSubmitStatus('error');
      
      // Messages d'erreur plus spécifiques
      let errorMessages: ValidationError[] = [];
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessages.push({ field: 'Timeout', message: 'La requête a pris trop de temps. Vérifiez votre connexion.' });
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
          errorMessages.push({ field: 'Connexion', message: 'Problème de connexion réseau. Vérifiez votre connexion internet.' });
        } else if (error.message.includes('NetworkError')) {
          errorMessages.push({ field: 'Réseau', message: 'Erreur réseau. Le serveur est peut-être temporairement indisponible.' });
        } else {
          errorMessages.push({ field: 'Envoi du formulaire', message: error.message });
        }
      } else {
        errorMessages.push({ field: 'Envoi du formulaire', message: 'Erreur inconnue lors de l\'envoi' });
      }
      
      errorMessages.push({ field: 'Solutions possibles', message: '• Vérifiez votre connexion internet' });
      errorMessages.push({ field: '', message: '• Réessayez dans quelques minutes' });
      errorMessages.push({ field: '', message: '• Si le problème persiste, contactez l\'administrateur' });
      errorMessages.push({ field: 'IMPORTANT', message: '⚠️ Le PDF ne sera pas téléchargé tant que l\'envoi n\'a pas réussi' });
      
      setValidationErrors(errorMessages);
      setShowErrorPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction séparée pour télécharger le PDF (seulement après succès de l'envoi)
  const downloadPDF = async () => {
    if (!emailSendSuccess) {
      setValidationErrors([
        { field: 'Téléchargement PDF', message: 'Le PDF ne peut être téléchargé que si l\'envoi par email a réussi.' },
        { field: 'Action requise', message: 'Veuillez d\'abord soumettre le formulaire avec succès.' }
      ]);
      setShowErrorPopup(true);
      return;
    }

    try {
      const totalAmount = formData.expenses.reduce((sum, expense) => {
        return sum + (parseFloat(expense.amount) || 0);
      }, 0);

      const kilometricReimbursement = parseFloat(formData.kilometers) * 0.321;
      const pdfBlob = await generateExpenseReportPDF(formData, totalAmount, kilometricReimbursement);
      
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fiche_remboursement_${new Date().toISOString().split('T')[0]}_${formData.firstName}-${formData.lastName}_${formData.subject.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      setValidationErrors([
        { field: 'Génération PDF', message: 'Erreur lors de la génération du PDF' },
        { field: 'Action', message: 'Veuillez réessayer ou contacter l\'administrateur' }
      ]);
      setShowErrorPopup(true);
    }
  };

  const renderAttachmentSection = (
    category: keyof typeof attachments,
    title: string,
    description: string,
    examples: string[]
  ) => (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-700 mb-3">{description}</p>
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium mb-2">Documents acceptés :</p>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            {examples.map((example, index) => (
              <li key={index}>{example}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="space-y-2 sm:space-y-3">
        {attachments[category].map((group, index) => (
          <div key={group.id} className="flex gap-2 sm:gap-3 items-start bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-300">
            <div className="flex-1">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileUpload(category, group.id, e.target.files)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
              />
              {group.files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {group.files.map((file, fileIndex) => (
                    <p key={fileIndex} className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {file.name}
                    </p>
                  ))}
                </div>
              )}
            </div>
            {attachments[category].length > 1 && (
              <button
                type="button"
                onClick={() => removeAttachmentGroup(category, group.id)}
                className="mt-2 sm:mt-3 p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        
        <button
          type="button"
          onClick={() => addAttachmentGroup(category)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-300"
        >
          <Plus className="w-4 h-4" />
          Ajouter plus de documents {title.toLowerCase()}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 py-4 sm:py-8 px-2 sm:px-4">
      {showErrorPopup && (
        <ErrorPopup 
          errors={validationErrors} 
          onClose={() => {
            setShowErrorPopup(false);
            if (validationErrors.length > 0 && validationErrors[0].inputRef) {
              scrollToError(validationErrors[0].inputRef);
            }
          }} 
        />
      )}

      <div className="w-full max-w-[80rem] mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-blue-200">
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-red-500 px-4 sm:px-8 py-6 sm:py-10 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-15">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 -translate-y-20 animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 translate-y-16 animate-pulse"></div>
              <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-red-300 rounded-full -translate-x-10 -translate-y-10 animate-pulse"></div>
              <div className="absolute top-1/4 right-1/4 w-12 h-12 bg-blue-300 rounded-full animate-pulse"></div>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
                <div className="bg-white p-3 sm:p-5 rounded-2xl shadow-2xl border-2 border-white/50 transform hover:scale-105 transition-transform duration-300">
                  <img 
                    src="/Logo SAM Athlétisme 2016-17.png" 
                    alt="SAM Athlétisme Mérignacais" 
                    className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-xl shadow-inner"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-xl sm:text-4xl font-bold text-white flex flex-col sm:flex-row items-center gap-1 sm:gap-4 drop-shadow-lg">
                    <span className="text-center sm:text-left">
                      <span className="block sm:inline">Formulaire de Remboursement</span>
                      <span className="block sm:inline sm:ml-2">de Frais</span>
                    </span>
                  </h1>
                  <p className="text-blue-100 mt-2 sm:mt-3 text-base sm:text-xl font-medium text-center sm:text-left">SAM Athlétisme Mérignacais</p>
                  <p className="text-blue-200 text-xs sm:text-base mt-1 sm:mt-2 bg-white/10 rounded-lg px-3 sm:px-4 py-1 sm:py-2 inline-block text-center sm:text-left">
                    Veuillez remplir tous les champs obligatoires marqués d'un astérisque (*)
                  </p>
                </div>
              </div>
              
              {/* SAM Website Button */}
              <div className="hidden sm:block">
                <a
                  href="https://www.sam-athletisme.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-300 border border-white/30 hover:border-white/50 backdrop-blur-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm font-medium">Site SAM</span>
                </a>
              </div>
            </div>
            
            {/* Mobile SAM Website Button */}
            <div className="sm:hidden mt-4 flex justify-center">
              <a
                href="https://www.sam-athletisme.fr/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-300 border border-white/30 hover:border-white/50 backdrop-blur-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Visiter le site SAM</span>
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-10 space-y-6 sm:space-y-10 bg-white">
            {/* Personal Information */}
            <section className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-2 sm:pb-3 flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-3 sm:p-4 -m-3 sm:-m-4 mb-4 sm:mb-6">
                <FileText className="w-8 h-8 text-blue-600" />
                Informations Personnelles
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Lieu *
                  </label>
                  <input
                    id="place"
                    type="text"
                    value={formData.place}
                    onChange={(e) => handleInputChange('place', e.target.value)}
                    className={`w-full px-3 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-base sm:text-lg shadow-sm hover:shadow-md ${
                      errors.place ? 'border-red-500' : 'border-gray-400'
                    } hover:border-blue-400 transform hover:scale-[1.02]`}
                    placeholder="Saisissez le lieu"
                  />
                  {errors.place && <p className="mt-2 text-sm text-red-700 font-medium">{errors.place}</p>}
                </div>
                
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Date *
                    <span className="md:hidden text-xs font-normal text-gray-600 ml-2">(cliquer sur le champ pour entrer la date)</span>
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md appearance-none ${
                      errors.date ? 'border-red-500' : 'border-gray-400'
                    } hover:border-blue-400 transform hover:scale-[1.02]`}
                    style={{ 
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield'
                    }}
                  />
                  {errors.date && <p className="mt-2 text-sm text-red-700 font-medium">{errors.date}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Prénom *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-3 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-base sm:text-lg shadow-sm hover:shadow-md ${
                      errors.firstName ? 'border-red-500' : 'border-gray-400'
                    } hover:border-blue-400 transform hover:scale-[1.02]`}
                    placeholder="Saisissez votre prénom"
                  />
                  {errors.firstName && <p className="mt-2 text-sm text-red-700 font-medium">{errors.firstName}</p>}
                </div>
                
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Nom *
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full px-3 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-base sm:text-lg shadow-sm hover:shadow-md ${
                      errors.lastName ? 'border-red-500' : 'border-gray-400'
                    } hover:border-blue-400 transform hover:scale-[1.02]`}
                    placeholder="Saisissez votre nom"
                  />
                  {errors.lastName && <p className="mt-2 text-sm text-red-700 font-medium">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Rôle/Fonction *
                </label>
                <input
                  id="role"
                  type="text"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className={`w-full px-3 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-base sm:text-lg shadow-sm hover:shadow-md ${
                    errors.role ? 'border-red-500' : 'border-gray-400'
                  } hover:border-blue-400 transform hover:scale-[1.02]`}
                  placeholder="Saisissez votre rôle ou fonction"
                />
                {errors.role && <p className="mt-2 text-sm text-red-700 font-medium">{errors.role}</p>}
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Objet de la Demande *
                </label>
                <input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className={`w-full px-3 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-base sm:text-lg shadow-sm hover:shadow-md ${
                    errors.subject ? 'border-red-500' : 'border-gray-400'
                  } hover:border-blue-400 transform hover:scale-[1.02]`}
                  placeholder="Saisissez l'objet de votre demande"
                />
                {errors.subject && <p className="mt-2 text-sm text-red-700 font-medium">{errors.subject}</p>}
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Motivation *
                </label>
                <textarea
                  id="motivation"
                  value={formData.motivation}
                  onChange={(e) => handleInputChange('motivation', e.target.value)}
                  className={`w-full px-3 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-base sm:text-lg shadow-sm hover:shadow-md ${
                    errors.motivation ? 'border-red-500' : 'border-gray-400'
                  } hover:border-blue-400 transform hover:scale-[1.02]`}
                  rows={4}
                  placeholder="Expliquez la motivation de cette demande de remboursement"
                />
                {errors.motivation && <p className="mt-2 text-sm text-red-700 font-medium">{errors.motivation}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Mode de Paiement *
                  </label>
                  <input
                    type="text"
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className={`w-full px-3 sm:px-5 py-3 sm:py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-base sm:text-lg shadow-sm hover:shadow-md ${
                      errors.paymentMethod ? 'border-red-500' : 'border-gray-400'
                    } hover:border-blue-400 transform hover:scale-[1.02]`}
                    placeholder="Virement bancaire, chèque, etc."
                  />
                  {errors.paymentMethod && <p className="mt-2 text-sm text-red-700 font-medium">{errors.paymentMethod}</p>}
                </div>
                
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Date de la Demande *
                    <span className="md:hidden text-xs font-normal text-gray-600 ml-2">(cliquer sur le champ pour entrer la date)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.requestDate}
                    onChange={(e) => handleInputChange('requestDate', e.target.value)}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md appearance-none ${
                      errors.requestDate ? 'border-red-500' : 'border-gray-400'
                    } hover:border-blue-400 transform hover:scale-[1.02]`}
                    style={{ 
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield'
                    }}
                  />
                  {errors.requestDate && <p className="mt-2 text-sm text-red-700 font-medium">{errors.requestDate}</p>}
                </div>
              </div>
            </section>

            {/* Expenses Section */}
            <section className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-2 sm:pb-3 flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-3 sm:p-4 -m-3 sm:-m-4 mb-4 sm:mb-6">
                <CreditCard className="w-6 h-6 text-blue-600" />
                Dépenses
              </h2>
              
              {/* Warning about required documents */}
              <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-sm border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-800 mb-2">À JOINDRE OBLIGATOIREMENT</h3>
                    <ul className="text-red-700 space-y-1 list-disc list-inside">
                      <li><strong>Factures</strong> (les tickets de caisse ne sont pas admis)</li>
                      <li><strong>Si utilisation du véhicule personnel :</strong> la carte grise</li>
                      <li><strong>RIB</strong> (Relevé d'Identité Bancaire)</li>
                    </ul>
                    <p className="mt-3 text-red-800 font-medium">⚠️ Les dossiers incomplets ne seront pas traités</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3 sm:p-6 border-2 border-gray-300">
                <div className="space-y-4" data-field="expenses">
                  {formData.expenses.map((expense, index) => (
                    <div key={expense.id} className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border-2 border-gray-300 space-y-3 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start">
                        <div className="w-full sm:flex-1">
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Nature de la Dépense
                          </label>
                          <input
                            id={`expense-${expense.id}`}
                            type="text"
                            value={expense.nature}
                            onChange={(e) => handleExpenseChange(expense.id, 'nature', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
                            placeholder="ex: Transport, Repas, Hébergement"
                          />
                        </div>
                        <div className="w-full sm:w-32">
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Montant (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={expense.amount}
                            onChange={(e) => handleExpenseChange(expense.id, 'amount', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      
                      {/* Justificatifs pour cette dépense */}
                      <div className="border-t-2 border-gray-300 pt-3 sm:pt-4">
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Justificatifs pour cette dépense *
                        </label>
                        <div className="flex gap-3 items-start">
                          <div className="flex-1">
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => handleExpenseAttachment(expense.id, e.target.files)}
                              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
                            />
                            <p className="text-xs text-gray-600 mt-1">
                              Formats acceptés : PDF, JPG, PNG, DOC, DOCX
                            </p>
                          </div>
                        </div>
                        
                        {expense.attachments.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <p className="text-sm font-medium text-gray-900">Fichiers joints :</p>
                            {expense.attachments.map((file, fileIndex) => (
                              <p key={fileIndex} className="text-sm text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                {file.name}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Delete button - separate row on mobile */}
                      {formData.expenses.length > 1 && (
                        <div className="flex justify-end mt-2 sm:mt-4">
                          <button
                            type="button"
                            onClick={() => removeExpenseRow(expense.id)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                  <div className="w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={addExpenseRow}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-300"
                    >
                      <Plus className="w-5 h-5" />
                      Ajouter une Dépense
                    </button>
                  </div>
                  
                  <div className="w-full sm:w-auto text-center sm:text-right bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-sm border-2 border-blue-500">
                    <p className="text-sm text-gray-700">Montant Total</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalAmount.toFixed(2)} €</p>
                  </div>
                </div>
                
                {errors.expenses && <p className="mt-2 text-sm text-red-700">{errors.expenses}</p>}
              </div>
            </section>

            {/* Kilometric Reimbursement */}
            <section className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-2 sm:pb-3 flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-3 sm:p-4 -m-3 sm:-m-4 mb-4 sm:mb-6">
                <Car className="w-6 h-6 text-blue-600" />
                Remboursement Kilométrique
              </h2>
              
              <div className="bg-gray-50 rounded-xl p-3 sm:p-6 border-2 border-gray-300">
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Nombre de Kilomètres
                    </label>
                    <input
                      id="kilometers"
                      type="number"
                      value={formData.kilometers}
                      onChange={(e) => handleInputChange('kilometers', e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Montant du Remboursement (0,321 €/km)
                    </label>
                    <div className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg bg-white text-red-600 font-medium shadow-sm">
                      {kilometricReimbursement.toFixed(2)} €
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-6 flex justify-end">
                  <div className="text-center sm:text-right bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-sm border-2 border-blue-500">
                    <p className="text-sm text-gray-700">Total Remboursement Kilométrique</p>
                    <p className="text-2xl font-bold text-blue-600">{kilometricReimbursement.toFixed(2)} €</p>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.rentalVehicle}
                      onChange={(e) => handleInputChange('rentalVehicle', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 bg-white border-gray-400"
                    />
                    <span className="text-sm text-gray-900">Véhicule de location utilisé</span>
                  </label>
                </div>
              </div>
              
              {/* Grand Total */}
              <div className="bg-gradient-to-r from-blue-600 to-red-600 rounded-xl p-4 sm:p-6 text-white shadow-lg border border-blue-500">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4">
                  <div className="w-full lg:w-auto">
                    <h3 className="text-xl font-semibold mb-2">Montant Total de la Demande</h3>
                    <div className="space-y-1 text-blue-200">
                      <p>• Dépenses diverses: {totalAmount.toFixed(2)} €</p>
                      <p>• Remboursement kilométrique: {kilometricReimbursement.toFixed(2)} €</p>
                    </div>
                  </div>
                  <div className="w-full lg:w-auto text-center lg:text-right">
                    <p className="text-sm text-blue-300">TOTAL GÉNÉRAL</p>
                    <p className="text-3xl lg:text-4xl font-bold">{(totalAmount + kilometricReimbursement).toFixed(2)} €</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Enhanced Attachments Section */}
            <section className="space-y-6 sm:space-y-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-2 sm:pb-3 flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-3 sm:p-4 -m-3 sm:-m-4 mb-4 sm:mb-6">
                <Upload className="w-6 h-6 text-blue-600" />
                Pièces Justificatives
              </h2>
              
              <div className="space-y-6 sm:space-y-8">
                {renderAttachmentSection(
                  'transport',
                  'Documents de Transport',
                  'Téléchargez les documents liés à l\'utilisation de véhicules et au transport.',
                  [
                    'Certificat d\'immatriculation du véhicule',
                    'Contrats de location de voiture',
                    'Reçus de carburant',
                    'Tickets de parking et péages',
                    'Cartes de transport en commun'
                  ]
                )}

                {renderAttachmentSection(
                  'banking',
                  'Informations Bancaires',
                  'Téléchargez vos coordonnées bancaires pour le traitement du remboursement.',
                  [
                    'Relevé d\'identité bancaire (RIB/IBAN)',
                    'Relevés bancaires',
                    'Formulaires d\'autorisation de paiement',
                    'Formulaires de virement automatique'
                  ]
                )}

                {renderAttachmentSection(
                  'other',
                  'Documents Supplémentaires',
                  'Téléchargez tout autre document justificatif pertinent pour votre demande de remboursement.',
                  [
                    'Formulaires d\'autorisation de voyage',
                    'Confirmations d\'inscription à des conférences',
                    'Invitations à des réunions',
                    'Correspondance professionnelle',
                    'Toute autre documentation pertinente'
                  ]
                )}
              </div>
            </section>

            {/* Digital Signature */}
            <section className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-2 sm:pb-3 flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-3 sm:p-4 -m-3 sm:-m-4 mb-4 sm:mb-6">
                <Image className="w-6 h-6" />
                Signature Numérique *
              </h2>
              
              <SignatureSection
                onSignatureChange={handleSignatureChange}
                currentSignature={formData.signature}
                currentSignatureFile={formData.signatureFile}
              />
            </section>

            {/* Submit Button */}
            <div className="border-t-2 border-blue-500 pt-4 sm:pt-8">
              {submitStatus === 'success' && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Formulaire soumis avec succès !</span>
                  </div>
                  <p className="text-green-600 mt-1">Votre demande de remboursement de frais a été envoyée pour traitement.</p>
                </div>
              )}
              
              {submitStatus === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Échec de la soumission</span>
                  </div>
                  <p className="text-red-600 mt-1">Une erreur s'est produite lors de la soumission de votre formulaire. Veuillez réessayer.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-medium text-white transition-all shadow-lg ${
                  isSubmitting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-blue-700 to-red-600 hover:from-blue-700 hover:via-blue-800 hover:to-red-700 focus:ring-4 focus:ring-blue-500 transform hover:scale-[1.02] border-2 border-blue-500'
                }`}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Soumettre la Demande de Remboursement de Frais'}
              </button>
            </div>
          </form>
          
          {/* Developer Signature */}
          <div className="bg-gray-50 border-t border-gray-200 px-4 sm:px-10 py-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Propulsé et développé par{' '}
                <a
                  href="https://www.hugoscarbonchi.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium underline decoration-blue-300 hover:decoration-blue-500 transition-colors"
                >
                  Hugo Scarbonchi
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Analytics />
    </div>
  );
}

export default App;