import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, FileText, Car, CreditCard, Upload, CheckCircle, AlertCircle, Image } from 'lucide-react';
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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
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
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrors(prev => ({ ...prev, signature: 'Veuillez sélectionner un fichier image (JPG, PNG, GIF, BMP, WEBP) ou PDF' }));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, signature: 'La taille du fichier ne doit pas dépasser 5MB' }));
      return;
    }
    
    // Clear any existing drawn signature
    clearSignature();
    
    setFormData(prev => ({ ...prev, signatureFile: file }));
    
    // Create preview URL for images only
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setFormData(prev => ({ ...prev, signature: e.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      // For PDF, just set a placeholder
      setFormData(prev => ({ ...prev, signature: 'pdf-uploaded' }));
    }
    
    // Clear any signature errors
    if (errors.signature) {
      setErrors(prev => ({ ...prev, signature: '' }));
    }
  };

  // Signature pad functionality
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Clear any uploaded signature file when starting to draw
    if (formData.signatureFile) {
      setFormData(prev => ({ ...prev, signatureFile: null }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setFormData(prev => ({ ...prev, signature: canvas.toDataURL() }));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFormData(prev => ({ ...prev, signature: '', signatureFile: null }));
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

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
    
    // Validate signature (either drawn or uploaded)
    if (!formData.signature && !formData.signatureFile) {
      newErrors.signature = 'La signature est requise (dessinée ou téléchargée)';
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
          formDataToSend.append(key, JSON.stringify(value));
        } else if (key === 'signatureFile' && value instanceof File) {
          formDataToSend.append('signatureFile', value);
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
      
      // Add calculated fields
      formDataToSend.append('totalAmount', totalAmount.toString());
      formDataToSend.append('kilometricReimbursement', kilometricReimbursement.toString());
      
      // Add email configuration
      // Envoyer vers le serveur PHP
      const response = await fetch('https://scarbonk.fr/sam/backend/form-handler.php', {
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
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <div className="bg-gradient-to-r from-blue-50 to-red-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 font-medium mb-1">Documents acceptés :</p>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            {examples.map((example, index) => (
              <li key={index}>{example}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="space-y-3">
        {attachments[category].map((group, index) => (
          <div key={group.id} className="flex gap-3 items-start">
            <div className="flex-1">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleFileUpload(category, group.id, e.target.files)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                className="mt-3 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        
        <button
          type="button"
          onClick={() => addAttachmentGroup(category)}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
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
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-red-600 px-8 py-8 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="bg-white p-3 rounded-xl shadow-lg">
                  <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">SAM</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <FileText className="w-8 h-8" />
                    Formulaire de Remboursement de Frais
                  </h1>
                  <p className="text-blue-100 mt-2 text-lg">SAM Athlétisme Mérignacais</p>
                  <p className="text-blue-200 text-sm">Veuillez remplir tous les champs obligatoires marqués d'un astérisque (*)</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Personal Information */}
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-2">
                Informations Personnelles
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lieu *
                  </label>
                  <input
                    type="text"
                    value={formData.place}
                    onChange={(e) => handleInputChange('place', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.place ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Saisissez le lieu"
                  />
                  {errors.place && <p className="mt-1 text-sm text-red-600">{errors.place}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Saisissez votre prénom"
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Saisissez votre nom"
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rôle/Fonction *
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.role ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Saisissez votre rôle ou fonction"
                />
                {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objet de la Demande *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.subject ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Saisissez l'objet de votre demande"
                />
                {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivation *
                </label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => handleInputChange('motivation', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.motivation ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={4}
                  placeholder="Expliquez la motivation de cette demande de remboursement"
                />
                {errors.motivation && <p className="mt-1 text-sm text-red-600">{errors.motivation}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode de Paiement *
                  </label>
                  <input
                    type="text"
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Virement bancaire, chèque, etc."
                  />
                  {errors.paymentMethod && <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de la Demande *
                  </label>
                  <input
                    type="date"
                    value={formData.requestDate}
                    onChange={(e) => handleInputChange('requestDate', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.requestDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.requestDate && <p className="mt-1 text-sm text-red-600">{errors.requestDate}</p>}
                </div>
              </div>
            </section>

            {/* Expenses Section */}
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-blue-600" />
                Dépenses
              </h2>
              
              {/* Warning about required documents */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-6 rounded-lg shadow-sm">
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
              
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-blue-100">
                <div className="space-y-4">
                  {formData.expenses.map((expense, index) => (
                    <div key={expense.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
                      <div className="flex gap-4 items-start">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nature de la Dépense
                          </label>
                          <input
                            type="text"
                            value={expense.nature}
                            onChange={(e) => handleExpenseChange(expense.id, 'nature', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="ex: Transport, Repas, Hébergement"
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Montant (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={expense.amount}
                            onChange={(e) => handleExpenseChange(expense.id, 'amount', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="0,00"
                          />
                        </div>
                        {formData.expenses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExpenseRow(expense.id)}
                            className="mt-8 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      
                      {/* Justificatifs pour cette dépense */}
                      <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Justificatifs pour cette dépense *
                        </label>
                        <div className="flex gap-3 items-start">
                          <div className="flex-1">
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => handleExpenseAttachment(expense.id, e.target.files)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Formats acceptés : PDF, JPG, PNG, DOC, DOCX
                            </p>
                          </div>
                        </div>
                        
                        {expense.attachments.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <p className="text-sm font-medium text-gray-700">Fichiers joints :</p>
                            {expense.attachments.map((file, fileIndex) => (
                              <p key={fileIndex} className="text-sm text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                {file.name}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={addExpenseRow}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter une Dépense
                  </button>
                  
                  <div className="text-right bg-white px-6 py-4 rounded-lg shadow-sm border border-blue-200">
                    <p className="text-sm text-gray-600">Montant Total</p>
                    <p className="text-2xl font-bold text-blue-700">{totalAmount.toFixed(2)} €</p>
                  </div>
                </div>
                
                {errors.expenses && <p className="mt-2 text-sm text-red-600">{errors.expenses}</p>}
              </div>
            </section>

            {/* Kilometric Reimbursement */}
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 flex items-center gap-2">
                <Car className="w-6 h-6 text-blue-600" />
                Remboursement Kilométrique
              </h2>
              
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-blue-100">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de Kilomètres
                    </label>
                    <input
                      type="number"
                      value={formData.kilometers}
                      onChange={(e) => handleInputChange('kilometers', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Montant du Remboursement (0,321 €/km)
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-red-700 font-medium shadow-sm">
                      {kilometricReimbursement.toFixed(2)} €
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <div className="text-right bg-white px-6 py-4 rounded-lg shadow-sm border border-blue-200">
                    <p className="text-sm text-gray-600">Total Remboursement Kilométrique</p>
                    <p className="text-2xl font-bold text-blue-700">{kilometricReimbursement.toFixed(2)} €</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.rentalVehicle}
                      onChange={(e) => handleInputChange('rentalVehicle', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Véhicule de location utilisé</span>
                  </label>
                </div>
              </div>
              
              {/* Grand Total */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Montant Total de la Demande</h3>
                    <div className="space-y-1 text-blue-100">
                      <p>• Dépenses diverses: {totalAmount.toFixed(2)} €</p>
                      <p>• Remboursement kilométrique: {kilometricReimbursement.toFixed(2)} €</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-200">TOTAL GÉNÉRAL</p>
                    <p className="text-4xl font-bold">{(totalAmount + kilometricReimbursement).toFixed(2)} €</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Enhanced Attachments Section */}
            <section className="space-y-8">
              <h2 className="text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 flex items-center gap-2">
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
              <h2 className="text-2xl font-semibold text-blue-700 border-b-2 border-blue-200 pb-2">
                Signature Numérique *
              </h2>
              
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-blue-100">
                <p className="text-sm text-gray-600 mb-4">
                  Veuillez signer dans la zone ci-dessous en utilisant votre souris ou votre écran tactile, ou télécharger une image de votre signature
                </p>
                
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden mb-4 shadow-sm">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full h-48 bg-white cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
                
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                    >
                      Effacer la Signature
                    </button>
                    
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleSignatureFileUpload(e.target.files)}
                        className="hidden"
                        id="signature-upload"
                      />
                      <label
                        htmlFor="signature-upload"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 rounded-lg transition-colors cursor-pointer shadow-sm"
                      >
                        <Image className="w-4 h-4" />
                        Télécharger une Signature
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {formData.signature && !formData.signatureFile && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Signature dessinée
                      </p>
                    )}
                    
                    {formData.signatureFile && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Signature téléchargée: {formData.signatureFile.name}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Image preview for uploaded signature */}
                {formData.signature && formData.signatureFile && formData.signatureFile.type.startsWith('image/') && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Aperçu de votre signature :</p>
                    <div className="border border-gray-300 rounded-lg p-4 bg-white max-w-md shadow-sm">
                      <img
                        src={formData.signature}
                        alt="Signature preview"
                        className="max-h-32 mx-auto"
                      />
                    </div>
                  </div>
                )}
                
                <div className="mt-4 bg-gradient-to-r from-blue-50 to-red-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note :</strong> Vous pouvez soit dessiner votre signature dans la zone ci-dessus, soit télécharger une image de votre signature. 
                    Formats acceptés pour le téléchargement : JPG, PNG, GIF, BMP, WEBP, PDF (max 5MB).
                  </p>
                </div>
                
                {errors.signature && <p className="mt-2 text-sm text-red-600">{errors.signature}</p>}
              </div>
            </section>

            {/* Submit Button */}
            <div className="border-t-2 border-blue-200 pt-8">
              {submitStatus === 'success' && (
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Formulaire soumis avec succès !</span>
                  </div>
                  <p className="text-green-700 mt-1">Votre demande de remboursement de frais a été envoyée pour traitement.</p>
                </div>
              )}
              
              {submitStatus === 'error' && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Échec de la soumission</span>
                  </div>
                  <p className="text-red-700 mt-1">Une erreur s'est produite lors de la soumission de votre formulaire. Veuillez réessayer.</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-xl font-medium text-white transition-all shadow-lg ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 via-blue-700 to-red-600 hover:from-blue-700 hover:via-blue-800 hover:to-red-700 focus:ring-4 focus:ring-blue-300 transform hover:scale-[1.02]'
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