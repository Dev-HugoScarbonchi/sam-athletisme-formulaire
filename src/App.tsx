import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, FileText, Car, CreditCard, Upload, CheckCircle, AlertCircle, Image, Shield } from 'lucide-react';
import { generateExpenseReportPDF } from './utils/pdfGenerator';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle expense row changes
  const handleExpenseChange = (id: string, field: keyof ExpenseRow, value: string) => {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.map(expense =>
        expense.id === id ? { ...expense, [field]: value } : expense
      )
    }));
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
  };

  const clearSignature = () => {
    setFormData(prev => ({ ...prev, signature: '', signatureFile: null }));
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      const formDataToSend = new FormData();
      
      // Generate PDF summary
      const pdfBlob = await generateExpenseReportPDF(formData, totalAmount, kilometricReimbursement);
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
      // Envoyer vers le serveur PHP
      const response = await fetch('https://api.scarbonk.fr/form-handler.php', {
        method: 'POST',
        body: formDataToSend
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setSubmitStatus('success');
        console.log('✅ Formulaire envoyé avec succès');
        console.log('📄 PDF généré:', result.pdf_filename);
        console.log('💰 Montant total:', result.total_amount, '€');
      } else {
        console.error('❌ Erreur serveur:', result.message);
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAttachmentSection = (
    category: keyof typeof attachments,
    title: string,
    description: string,
    examples: string[]
  ) => (
    <div className="space-y-4">
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
      
      <div className="space-y-3">
        {attachments[category].map((group, index) => (
          <div key={group.id} className="flex gap-3 items-start bg-white p-4 rounded-lg border-2 border-gray-300">
            <div className="flex-1">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileUpload(category, group.id, e.target.files)}
                className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
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
                className="mt-3 p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        
        <button
          type="button"
          onClick={() => addAttachmentGroup(category)}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-300"
        >
          <Plus className="w-4 h-4" />
          Ajouter plus de documents {title.toLowerCase()}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 py-8 px-4">
      <div className="w-full max-w-[80rem] mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-blue-200">
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-red-500 px-8 py-10 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-15">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 -translate-y-20 animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 translate-y-16 animate-pulse"></div>
              <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-red-300 rounded-full -translate-x-10 -translate-y-10 animate-pulse"></div>
              <div className="absolute top-1/4 right-1/4 w-12 h-12 bg-blue-300 rounded-full animate-pulse"></div>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
                <div className="bg-white p-5 rounded-2xl shadow-2xl border-2 border-white/50 transform hover:scale-105 transition-transform duration-300">
                  <img 
                    src="/Logo SAM Athlétisme 2016-17.png" 
                    alt="SAM Athlétisme Mérignacais" 
                    className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-xl shadow-inner"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-4xl font-bold text-white flex flex-col sm:flex-row items-center gap-2 sm:gap-4 drop-shadow-lg">
                    <span className="text-center sm:text-left">
                      <span className="block sm:inline">Formulaire de Remboursement</span>
                      <span className="block sm:inline sm:ml-2">de Frais</span>
                    </span>
                  </h1>
                  <p className="text-blue-100 mt-3 text-lg sm:text-xl font-medium text-center sm:text-left">SAM Athlétisme Mérignacais</p>
                  <p className="text-blue-200 text-sm sm:text-base mt-2 bg-white/10 rounded-lg px-4 py-2 inline-block text-center sm:text-left">
                    Veuillez remplir tous les champs obligatoires marqués d'un astérisque (*)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-10 bg-white">
            {/* Personal Information */}
            <section className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-3 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-4 -m-4 mb-6">
                <FileText className="w-8 h-8 text-blue-600" />
                Informations Personnelles
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Lieu *
                  </label>
                  <input
                    type="text"
                    value={formData.place}
                    onChange={(e) => handleInputChange('place', e.target.value)}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md ${
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
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md ${
                      errors.date ? 'border-red-500' : 'border-gray-400'
                    } hover:border-blue-400 transform hover:scale-[1.02]`}
                  />
                  {errors.date && <p className="mt-2 text-sm text-red-700 font-medium">{errors.date}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md ${
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
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md ${
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
                  type="text"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md ${
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
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md ${
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
                  value={formData.motivation}
                  onChange={(e) => handleInputChange('motivation', e.target.value)}
                  className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md ${
                    errors.motivation ? 'border-red-500' : 'border-gray-400'
                  } hover:border-blue-400 transform hover:scale-[1.02]`}
                  rows={4}
                  placeholder="Expliquez la motivation de cette demande de remboursement"
                />
                {errors.motivation && <p className="mt-2 text-sm text-red-700 font-medium">{errors.motivation}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Mode de Paiement *
                  </label>
                  <input
                    type="text"
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md ${
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
                  </label>
                  <input
                    type="date"
                    value={formData.requestDate}
                    onChange={(e) => handleInputChange('requestDate', e.target.value)}
                    className={`w-full px-5 py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 bg-white text-gray-900 text-lg shadow-sm hover:shadow-md ${
                      errors.requestDate ? 'border-red-500' : 'border-gray-400'
                    } hover:border-blue-400 transform hover:scale-[1.02]`}
                  />
                  {errors.requestDate && <p className="mt-2 text-sm text-red-700 font-medium">{errors.requestDate}</p>}
                </div>
              </div>
            </section>

            {/* Expenses Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-3 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-4 -m-4 mb-6">
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
              
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-300">
                <div className="space-y-4">
                  {formData.expenses.map((expense, index) => (
                    <div key={expense.id} className="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-300 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-full sm:flex-1">
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Nature de la Dépense
                          </label>
                          <input
                            type="text"
                            value={expense.nature}
                            onChange={(e) => handleExpenseChange(expense.id, 'nature', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
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
                            className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      
                      {/* Justificatifs pour cette dépense */}
                      <div className="border-t-2 border-gray-300 pt-4">
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
                              className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
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
                        <div className="flex justify-end mt-4">
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
                
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
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
                  
                  <div className="w-full sm:w-auto text-center sm:text-right bg-white px-6 py-4 rounded-lg shadow-sm border-2 border-blue-500">
                    <p className="text-sm text-gray-700">Montant Total</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalAmount.toFixed(2)} €</p>
                  </div>
                </div>
                
                {errors.expenses && <p className="mt-2 text-sm text-red-700">{errors.expenses}</p>}
              </div>
            </section>

            {/* Kilometric Reimbursement */}
            <section className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-3 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-4 -m-4 mb-6">
                <Car className="w-6 h-6 text-blue-600" />
                Remboursement Kilométrique
              </h2>
              
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-300">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Nombre de Kilomètres
                    </label>
                    <input
                      type="number"
                      value={formData.kilometers}
                      onChange={(e) => handleInputChange('kilometers', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-blue-400"
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
                
                <div className="mt-6 flex justify-end">
                  <div className="text-right bg-white px-6 py-4 rounded-lg shadow-sm border-2 border-blue-500">
                    <p className="text-sm text-gray-700">Total Remboursement Kilométrique</p>
                    <p className="text-2xl font-bold text-blue-600">{kilometricReimbursement.toFixed(2)} €</p>
                  </div>
                </div>
                
                <div className="mt-6">
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
              <div className="bg-gradient-to-r from-blue-600 to-red-600 rounded-xl p-6 text-white shadow-lg border border-blue-500">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
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
            <section className="space-y-8">
              <h2 className="text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-3 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-4 -m-4 mb-6">
                <Upload className="w-6 h-6 text-blue-600" />
                Pièces Justificatives
              </h2>
              
              <div className="space-y-8">
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
            <section className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 border-b-4 border-blue-500 pb-3 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl p-4 -m-4 mb-6">
                <Image className="w-6 h-6" />
                Signature Numérique *
              </h2>
              
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-300">
                <p className="text-sm text-gray-700 mb-4">
                  Veuillez télécharger une image de votre signature
                </p>
                
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSignatureFileUpload(e.target.files)}
                      className="hidden"
                      id="signature-upload"
                    />
                    <label
                      htmlFor="signature-upload"
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 rounded-lg transition-colors cursor-pointer shadow-lg border-2 border-blue-500"
                    >
                      <Image className="w-5 h-5" />
                      Télécharger une Signature
                    </label>
                  </div>
                  
                  {formData.signatureFile && (
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Signature téléchargée: {formData.signatureFile.name}
                      </p>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors border-2 border-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Image preview for uploaded signature */}
                {formData.signature && formData.signatureFile && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-700 mb-3">Aperçu de votre signature :</p>
                    <div className="border-2 border-gray-300 rounded-lg p-4 bg-white max-w-md shadow-sm">
                      <img
                        src={formData.signature}
                        alt="Signature preview"
                        className="max-h-32 mx-auto"
                      />
                    </div>
                  </div>
                )}
                
                <div className="mt-4 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note :</strong> Téléchargez une image claire de votre signature. 
                    Formats acceptés : JPG, PNG, GIF, BMP, WEBP (max 5MB).
                  </p>
                </div>
                
                {errors.signature && <p className="mt-2 text-sm text-red-700">{errors.signature}</p>}
              </div>
            </section>

            {/* Submit Button */}
            <div className="border-t-2 border-blue-500 pt-8">
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
                className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all shadow-lg ${
                  isSubmitting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-blue-700 to-red-600 hover:from-blue-700 hover:via-blue-800 hover:to-red-700 focus:ring-4 focus:ring-blue-500 transform hover:scale-[1.02] border-2 border-blue-500'
                }`}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Soumettre la Demande de Remboursement de Frais'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;