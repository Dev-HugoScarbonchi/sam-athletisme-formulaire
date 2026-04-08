import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, FileText, Car, CreditCard, Upload, CheckCircle, AlertCircle, Image, Shield, ExternalLink, MapPin, Calendar, User, Briefcase, FileCheck, Send, AlertTriangle } from 'lucide-react';
import { generateExpenseReportPDF } from './utils/pdfGenerator';
import { Analytics } from "@vercel/analytics/react";
import { SignatureSection } from './components/SignatureSection';

// ─── Type Definitions ───────────────────────────────────────────────

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
  transportExpenses: ExpenseRow[];
  accommodationExpenses: ExpenseRow[];
  otherExpenses: ExpenseRow[];
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

// ─── Error Popup Component ──────────────────────────────────────────

const ErrorPopup: React.FC<{ errors: ValidationError[]; onClose: () => void }> = ({ errors, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="bg-gradient-to-r from-red-500 to-red-600 p-5">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Erreurs de validation</h3>
        </div>
      </div>
      <div className="p-5">
        <p className="text-gray-600 mb-4 text-sm">Veuillez corriger les erreurs suivantes :</p>
        <div className="space-y-2 mb-5 overflow-y-auto max-h-60">
          {errors.map((error, index) => (
            <div key={index} className="flex items-start gap-3 bg-red-50 rounded-lg p-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                {error.field && <p className="font-medium text-gray-900 text-sm">{error.field}</p>}
                <p className="text-sm text-gray-600">{error.message}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full bg-red-600 text-white py-2.5 px-4 rounded-xl hover:bg-red-700 transition-all font-medium">
          Fermer et corriger
        </button>
      </div>
    </div>
  </div>
);

// ─── Section Header Component ───────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-100 mb-6">
    <div className="bg-blue-600 text-white rounded-xl p-2.5 shadow-md shadow-blue-600/20">
      {icon}
    </div>
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─── Input Field Component ──────────────────────────────────────────

const InputField: React.FC<{
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
}> = ({ id, label, type = 'text', value, onChange, placeholder, error, required, multiline, rows = 4 }) => {
  const baseClasses = `w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 bg-white text-gray-900 text-base placeholder:text-gray-400 focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-400 ${error ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {multiline ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${baseClasses} resize-none`} placeholder={placeholder} rows={rows} />
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={baseClasses} placeholder={placeholder} />
      )}
      {error && <p className="mt-1.5 text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
};

// ─── Expense Category Component ─────────────────────────────────────

const ExpenseCategory: React.FC<{
  title: string;
  subtitle?: string;
  expenses: ExpenseRow[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof ExpenseRow, value: string) => void;
  onAttachment: (id: string, files: FileList | null) => void;
  total: number;
  accentColor?: string;
  children?: React.ReactNode;
}> = ({ title, subtitle, expenses, onAdd, onRemove, onChange, onAttachment, total, accentColor = 'blue', children }) => (
  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
    <div className={`bg-gradient-to-r ${accentColor === 'green' ? 'from-emerald-50 to-teal-50 border-b border-emerald-100' : accentColor === 'amber' ? 'from-amber-50 to-orange-50 border-b border-amber-100' : 'from-blue-50 to-sky-50 border-b border-blue-100'} px-5 py-4`}>
      <h3 className={`text-lg font-bold ${accentColor === 'green' ? 'text-emerald-900' : accentColor === 'amber' ? 'text-amber-900' : 'text-blue-900'}`}>{title}</h3>
      {subtitle && (
        <p className={`text-sm mt-1 font-medium ${accentColor === 'green' ? 'text-emerald-700' : accentColor === 'amber' ? 'text-amber-700' : 'text-blue-700'}`}>{subtitle}</p>
      )}
    </div>
    <div className="p-5 space-y-4">
      {children}
      {expenses.map((expense) => (
        <div key={expense.id} className="group bg-gray-50 hover:bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nature de la Dépense</label>
              <input
                type="text"
                value={expense.nature}
                onChange={(e) => onChange(expense.id, 'nature', e.target.value)}
                className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-gray-300 placeholder:text-gray-400"
                placeholder="Description de la dépense"
              />
            </div>
            <div className="w-full sm:w-28">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Montant (€)</label>
              <input
                type="number"
                step="0.01"
                value={expense.amount}
                onChange={(e) => onChange(expense.id, 'amount', e.target.value)}
                className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-gray-300 placeholder:text-gray-400 text-right font-medium"
                placeholder="0,00"
              />
            </div>
            {expenses.length > 1 && (
              <button type="button" onClick={() => onRemove(expense.id)} className="sm:mt-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
        <button type="button" onClick={onAdd} className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed transition-all font-medium text-sm ${accentColor === 'green' ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400' : accentColor === 'amber' ? 'border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400' : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400'}`}>
          <Plus className="w-4 h-4" />
          Ajouter une Dépense
        </button>
        <div className={`bg-white px-5 py-3 rounded-xl border-2 text-center sm:text-right ${accentColor === 'green' ? 'border-emerald-200' : accentColor === 'amber' ? 'border-amber-200' : 'border-blue-200'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Montant Total</p>
          <p className={`text-xl font-bold ${accentColor === 'green' ? 'text-emerald-600' : accentColor === 'amber' ? 'text-amber-600' : 'text-blue-600'}`}>{total.toFixed(2)} €</p>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main App Component ─────────────────────────────────────────────

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
    transportExpenses: [{ id: 't1', nature: '', amount: '', attachments: [] }],
    accommodationExpenses: [{ id: 'a1', nature: '', amount: '', attachments: [] }],
    otherExpenses: [{ id: 'o1', nature: '', amount: '', attachments: [] }],
    expenses: [],
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
  const [justificatifs, setJustificatifs] = useState<AttachmentGroup[]>([{ id: '1', files: [] }]);

  // ─── Computed Values ────────────────────────────────────────────

  const transportTotal = formData.transportExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const accommodationTotal = formData.accommodationExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const otherTotal = formData.otherExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalExpenses = transportTotal + accommodationTotal + otherTotal;
  const kilometricReimbursement = (parseFloat(formData.kilometers) || 0) * 0.321;
  const grandTotal = totalExpenses + kilometricReimbursement;

  const getAllExpenses = (): ExpenseRow[] => [
    ...formData.transportExpenses.filter(e => e.nature.trim() && e.amount.trim()),
    ...formData.accommodationExpenses.filter(e => e.nature.trim() && e.amount.trim()),
    ...formData.otherExpenses.filter(e => e.nature.trim() && e.amount.trim())
  ];

  // ─── Form Handlers ──────────────────────────────────────────────

  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    setValidationErrors(prev => prev.filter(error => error.inputRef !== field));
  };

  const handleCategoryExpenseChange = (category: 'transportExpenses' | 'accommodationExpenses' | 'otherExpenses', id: string, field: keyof ExpenseRow, value: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: (prev[category] as ExpenseRow[]).map(expense => expense.id === id ? { ...expense, [field]: value } : expense)
    }));
  };

  const addCategoryExpense = (category: 'transportExpenses' | 'accommodationExpenses' | 'otherExpenses') => {
    const prefix = category === 'transportExpenses' ? 't' : category === 'accommodationExpenses' ? 'a' : 'o';
    setFormData(prev => ({
      ...prev,
      [category]: [...(prev[category] as ExpenseRow[]), { id: `${prefix}${Date.now()}`, nature: '', amount: '', attachments: [] }]
    }));
  };

  const removeCategoryExpense = (category: 'transportExpenses' | 'accommodationExpenses' | 'otherExpenses', id: string) => {
    setFormData(prev => {
      const arr = prev[category] as ExpenseRow[];
      return { ...prev, [category]: arr.length > 1 ? arr.filter(e => e.id !== id) : arr };
    });
  };

  const handleCategoryAttachment = (category: 'transportExpenses' | 'accommodationExpenses' | 'otherExpenses', expenseId: string, files: FileList | null) => {
    if (!files) return;
    setFormData(prev => ({
      ...prev,
      [category]: (prev[category] as ExpenseRow[]).map(expense =>
        expense.id === expenseId ? { ...expense, attachments: Array.from(files) } : expense
      )
    }));
  };

  const addJustificatif = () => setJustificatifs(prev => [...prev, { id: Date.now().toString(), files: [] }]);
  const removeJustificatif = (id: string) => { if (justificatifs.length > 1) setJustificatifs(prev => prev.filter(j => j.id !== id)); };
  const handleJustificatifUpload = (groupId: string, files: FileList | null) => {
    if (!files) return;
    setJustificatifs(prev => prev.map(j => j.id === groupId ? { ...j, files: Array.from(files) } : j));
  };

  const handleSignatureChange = (newSignature: string | null, newSignatureFile: File | null) => {
    setFormData(prev => ({ ...prev, signature: newSignature || '', signatureFile: newSignatureFile }));
  };

  // ─── Validation ─────────────────────────────────────────────────

  const validateFormNew = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!formData.place.trim()) errors.push({ field: 'Lieu', message: 'Le lieu est obligatoire', inputRef: 'place' });
    if (!formData.date) errors.push({ field: 'Date', message: 'La date est obligatoire', inputRef: 'date' });
    if (!formData.firstName.trim()) errors.push({ field: 'Prénom', message: 'Le prénom est obligatoire', inputRef: 'firstName' });
    if (!formData.lastName.trim()) errors.push({ field: 'Nom', message: 'Le nom est obligatoire', inputRef: 'lastName' });
    if (!formData.role.trim()) errors.push({ field: 'Rôle/Fonction', message: 'Le rôle est obligatoire', inputRef: 'role' });
    if (!formData.subject.trim()) errors.push({ field: 'Objet de la demande', message: "L'objet est obligatoire", inputRef: 'subject' });
    if (!formData.motivation.trim()) errors.push({ field: 'Motivation', message: 'La motivation est obligatoire', inputRef: 'motivation' });

    const allExpenses = getAllExpenses();
    if (allExpenses.length === 0 && (!formData.kilometers || parseFloat(formData.kilometers) <= 0)) {
      errors.push({ field: 'Dépenses', message: 'Au moins une dépense ou un remboursement kilométrique est requis', inputRef: 'expenses' });
    }

    if (formData.kilometers && formData.kilometers.trim()) {
      const km = parseFloat(formData.kilometers);
      if (isNaN(km) || km <= 0) errors.push({ field: 'Kilométrage', message: 'Le nombre de kilomètres doit être un nombre positif', inputRef: 'kilometers' });
    }

    if (!formData.signature && !formData.signatureFile) {
      errors.push({ field: 'Signature', message: 'Une signature est obligatoire (dessinée ou uploadée)', inputRef: 'signature' });
    }

    return errors;
  };

  const scrollToError = (inputRef: string) => {
    const element = document.getElementById(inputRef) || document.querySelector(`[data-field="${inputRef}"]`);
    if (element) { element.scrollIntoView({ behavior: 'smooth', block: 'center' }); (element as HTMLElement).focus?.(); }
  };

  // ─── Network & PDF ──────────────────────────────────────────────

  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      const response = await fetch('https://api.scarbonk.fr/form-handler.php', { method: 'HEAD', mode: 'cors' });
      return response.ok || response.status === 405;
    } catch { return false; }
  };

  const generatePDF = async () => {
    const validationErrors = validateFormNew();
    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors);
      setShowErrorPopup(true);
      return null;
    }
    try {
      const mergedFormData = { ...formData, expenses: getAllExpenses() };
      return await generateExpenseReportPDF(mergedFormData, totalExpenses, kilometricReimbursement);
    } catch (error) {
      console.error('Erreur PDF:', error);
      setValidationErrors([{ field: 'Génération PDF', message: 'Erreur lors de la génération du PDF.' }]);
      setShowErrorPopup(true);
      return null;
    }
  };

  // ─── Form Submission ────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateFormNew();
    if (validationErrors.length > 0) { setValidationErrors(validationErrors); setShowErrorPopup(true); return; }

    setIsSubmitting(true);
    setEmailSendSuccess(false);
    setSubmitStatus('idle');

    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      setValidationErrors([
        { field: 'Connexion réseau', message: 'Problème de connexion réseau détecté.' },
        { field: 'Support', message: "Si le problème persiste, contactez l'administrateur." }
      ]);
      setShowErrorPopup(true);
      setIsSubmitting(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      const pdfBlob = await generatePDF();
      if (!pdfBlob) { setIsSubmitting(false); return; }
      formDataToSend.append('summary_pdf', pdfBlob, 'fiche_remboursement.pdf');

      // Auto-download
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const dl = document.createElement('a');
      dl.href = pdfUrl;
      const fDate = formData.requestDate.replace(/-/g, '');
      const fName = `${formData.firstName}-${formData.lastName}`.toLowerCase().replace(/\s+/g, '-');
      const fMotif = formData.subject.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      dl.download = `fiche_remboursement_${fDate}_${fName}_${fMotif}.pdf`;
      document.body.appendChild(dl); dl.click(); document.body.removeChild(dl);
      URL.revokeObjectURL(pdfUrl);

      const allExpenses = getAllExpenses();
      formDataToSend.append('place', formData.place);
      formDataToSend.append('date', formData.date);
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('role', formData.role);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('motivation', formData.motivation);
      formDataToSend.append('paymentMethod', formData.paymentMethod);
      formDataToSend.append('requestDate', formData.requestDate);
      formDataToSend.append('kilometers', formData.kilometers);
      formDataToSend.append('rentalVehicle', formData.rentalVehicle.toString());
      formDataToSend.append('signature', formData.signature);
      formDataToSend.append('expenses', JSON.stringify(allExpenses.map(ex => ({ ...ex, attachmentNames: ex.attachments.map(f => f.name) }))));
      if (formData.signatureFile) formDataToSend.append('signatureFile', formData.signatureFile);

      justificatifs.forEach((g, gi) => g.files.forEach((f, fi) => formDataToSend.append(`other_${gi}_${fi}`, f)));
      allExpenses.forEach((ex, ei) => ex.attachments.forEach((f, fi) => formDataToSend.append(`expense_${ei}_${fi}`, f)));

      formDataToSend.append('fileNamesSummary', JSON.stringify({
        expenseFiles: allExpenses.map((e, i) => ({ expenseIndex: i, nature: e.nature, amount: e.amount, files: e.attachments.map(f => f.name) })).filter(e => e.files.length > 0),
        attachmentFiles: [{ category: 'other', files: justificatifs.flatMap(g => g.files.map(f => f.name)) }].filter(c => c.files.length > 0)
      }));

      formDataToSend.append('emailContent', `DEMANDE DE REMBOURSEMENT - ${formData.firstName} ${formData.lastName} - ${formData.subject}`);
      formDataToSend.append('totalAmount', totalExpenses.toString());
      formDataToSend.append('kilometricReimbursement', kilometricReimbursement.toString());

      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 30000);
          response = await fetch('https://api.scarbonk.fr/form-handler.php', { method: 'POST', body: formDataToSend, signal: controller.signal });
          clearTimeout(tid);
          if (response.ok) break;
          else throw new Error(`Erreur serveur: ${response.status}`);
        } catch (err) {
          if (attempt === 3) throw err;
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }

      if (response && response.ok) {
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text.includes('success') ? { success: true } : null; if (!data) throw new Error('Réponse serveur invalide'); }
        if (data.success !== false) { setEmailSendSuccess(true); setSubmitStatus('success'); }
        else throw new Error(data.message || "Erreur lors de l'envoi");
      } else throw new Error(`Erreur serveur: ${response?.status}`);

    } catch (error) {
      console.error('Erreur envoi:', error);
      setEmailSendSuccess(false);
      setSubmitStatus('error');
      const msgs: ValidationError[] = [];
      if (error instanceof Error) {
        if (error.name === 'AbortError') msgs.push({ field: 'Timeout', message: 'La requête a pris trop de temps.' });
        else if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) msgs.push({ field: 'Connexion', message: 'Problème de connexion réseau.' });
        else msgs.push({ field: 'Envoi', message: error.message });
      } else msgs.push({ field: 'Envoi', message: "Erreur inconnue" });
      msgs.push({ field: 'Solutions', message: 'Vérifiez votre connexion internet et réessayez.' });
      setValidationErrors(msgs);
      setShowErrorPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.5s ease-out; }
      `}</style>

      {showErrorPopup && <ErrorPopup errors={validationErrors} onClose={() => { setShowErrorPopup(false); if (validationErrors.length > 0 && validationErrors[0].inputRef) scrollToError(validationErrors[0].inputRef); }} />}

      <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200/50 animate-slideUp">

          {/* ─── Header ──────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 px-6 sm:px-10 py-8 sm:py-12 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-500/10 rounded-full" />
              <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-white/5 rounded-full" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
              <div className="bg-white p-3.5 rounded-2xl shadow-lg">
                <img src="/Logo SAM Athlétisme 2016-17.png" alt="SAM Athlétisme Mérignacais" className="h-16 w-16 sm:h-20 sm:w-20 object-contain" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Formulaire de Remboursement<br className="hidden sm:block" /> de Frais</h1>
                <p className="text-blue-200 mt-2 text-base font-medium">SAM Athlétisme Mérignacais</p>
              </div>
              <a href="https://www.sam-athletisme.fr/" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 hover:border-white/40 backdrop-blur-sm text-sm font-medium">
                <ExternalLink className="w-4 h-4" />Site SAM
              </a>
            </div>
            <div className="sm:hidden mt-5 flex justify-center relative z-10">
              <a href="https://www.sam-athletisme.fr/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 text-sm font-medium">
                <ExternalLink className="w-4 h-4" />Visiter le site SAM
              </a>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-600" />
          </div>

          {/* ─── Form ──────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-8 bg-white">

            {/* Informations Personnelles */}
            <section>
              <SectionHeader icon={<User className="w-5 h-5" />} title="Informations Personnelles" />
              <div className="grid md:grid-cols-2 gap-5">
                <InputField id="place" label="Lieu" value={formData.place} onChange={(v) => handleInputChange('place', v)} placeholder="Saisissez le lieu" error={errors.place} required />
                <InputField id="date" label="Date" type="date" value={formData.date} onChange={(v) => handleInputChange('date', v)} error={errors.date} required />
                <InputField id="firstName" label="Prénom" value={formData.firstName} onChange={(v) => handleInputChange('firstName', v)} placeholder="Votre prénom" error={errors.firstName} required />
                <InputField id="lastName" label="Nom" value={formData.lastName} onChange={(v) => handleInputChange('lastName', v)} placeholder="Votre nom" error={errors.lastName} required />
                <InputField id="role" label="Rôle / Fonction" value={formData.role} onChange={(v) => handleInputChange('role', v)} placeholder="ex: Entraîneur, Athlète, Bénévole" error={errors.role} required />
                <InputField id="paymentMethod" label="Mode de paiement souhaité" value={formData.paymentMethod} onChange={(v) => handleInputChange('paymentMethod', v)} placeholder="ex: Virement bancaire" error={errors.paymentMethod} />
              </div>
            </section>

            {/* Objet & Motivation */}
            <section>
              <SectionHeader icon={<FileText className="w-5 h-5" />} title="Objet de la Demande" />
              <div className="space-y-5">
                <InputField id="subject" label="Objet" value={formData.subject} onChange={(v) => handleInputChange('subject', v)} placeholder="ex: Déplacement compétition, Stage formation..." error={errors.subject} required />
                <InputField id="motivation" label="Motivation / Détails" value={formData.motivation} onChange={(v) => handleInputChange('motivation', v)} placeholder="Décrivez le contexte et la justification de votre demande..." error={errors.motivation} required multiline rows={4} />
                <InputField id="requestDate" label="Date de la demande" type="date" value={formData.requestDate} onChange={(v) => handleInputChange('requestDate', v)} error={errors.requestDate} />
              </div>
            </section>

            {/* ─── DÉPENSES ───────────────────────────────────── */}
            <section data-field="expenses">
              <SectionHeader icon={<CreditCard className="w-5 h-5" />} title="Dépenses" />
              <div className="space-y-6">

                {/* 1. Frais de transport */}
                <ExpenseCategory
                  title="Frais de transport"
                  expenses={formData.transportExpenses}
                  onAdd={() => addCategoryExpense('transportExpenses')}
                  onRemove={(id) => removeCategoryExpense('transportExpenses', id)}
                  onChange={(id, field, value) => handleCategoryExpenseChange('transportExpenses', id, field, value)}
                  onAttachment={(id, files) => handleCategoryAttachment('transportExpenses', id, files)}
                  total={transportTotal + kilometricReimbursement}
                  accentColor="blue"
                >
                  <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 mb-2">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Car className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Remboursement Kilométrique</h4>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">si utilisation du véhicule personnel</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre de Kilomètres</label>
                        <input id="kilometers" type="number" value={formData.kilometers} onChange={(e) => handleInputChange('kilometers', e.target.value)} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-gray-300" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Montant du Remboursement (0,321 €/km)</label>
                        <div className="w-full px-3.5 py-2.5 border-2 border-blue-200 rounded-lg bg-blue-50 text-blue-700 font-semibold">{kilometricReimbursement.toFixed(2)} €</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={formData.rentalVehicle} onChange={(e) => handleInputChange('rentalVehicle', e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300" />
                        <span className="text-sm text-gray-700">Véhicule de location utilisé</span>
                      </label>
                      {formData.rentalVehicle && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 mt-2 border border-amber-200">
                          Si utilisation d'un véhicule de location : le ticket carburant est à joindre obligatoirement
                        </p>
                      )}
                    </div>
                  </div>
                </ExpenseCategory>

                {/* 2. Frais d'hébergement + repas */}
                <ExpenseCategory
                  title="Frais d'hébergement + repas du soir"
                  subtitle="Plafonds : 50 € pour la nuitée, 20 € pour le repas"
                  expenses={formData.accommodationExpenses}
                  onAdd={() => addCategoryExpense('accommodationExpenses')}
                  onRemove={(id) => removeCategoryExpense('accommodationExpenses', id)}
                  onChange={(id, field, value) => handleCategoryExpenseChange('accommodationExpenses', id, field, value)}
                  onAttachment={(id, files) => handleCategoryAttachment('accommodationExpenses', id, files)}
                  total={accommodationTotal}
                  accentColor="green"
                />

                {/* 3. Autres frais */}
                <ExpenseCategory
                  title="Autres frais"
                  expenses={formData.otherExpenses}
                  onAdd={() => addCategoryExpense('otherExpenses')}
                  onRemove={(id) => removeCategoryExpense('otherExpenses', id)}
                  onChange={(id, field, value) => handleCategoryExpenseChange('otherExpenses', id, field, value)}
                  onAttachment={(id, files) => handleCategoryAttachment('otherExpenses', id, files)}
                  total={otherTotal}
                  accentColor="amber"
                />

                {/* Grand Total */}
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-500/10 rounded-full" />
                  </div>
                  <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Montant Total de la Demande</h3>
                      <div className="space-y-1 text-blue-200 text-sm">
                        <p>Dépenses diverses : {totalExpenses.toFixed(2)} €</p>
                        <p>Remboursement kilométrique : {kilometricReimbursement.toFixed(2)} €</p>
                      </div>
                    </div>
                    <div className="text-center sm:text-right bg-white/10 rounded-xl px-5 py-3 backdrop-blur-sm">
                      <p className="text-xs text-blue-200 uppercase tracking-wider font-medium">Total Général</p>
                      <p className="text-3xl sm:text-4xl font-bold">{grandTotal.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ─── Pièces Justificatives ──────────────────────── */}
            <section>
              <SectionHeader icon={<Upload className="w-5 h-5" />} title="Pièces Justificatives" />
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5">
                <div className="flex items-start gap-3">
                  <div className="bg-red-100 rounded-full p-2 mt-0.5 flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-red-800 mb-2">À JOINDRE OBLIGATOIREMENT</h3>
                    <ul className="text-sm text-red-700 space-y-1.5">
                      <li className="flex items-start gap-2"><span className="font-bold">•</span><span><strong>Factures</strong> (les tickets de caisse ne sont pas admis)</span></li>
                      <li className="flex items-start gap-2"><span className="font-bold">•</span><span><strong>Si utilisation du véhicule personnel :</strong> la carte grise</span></li>
                      <li className="flex items-start gap-2"><span className="font-bold">•</span><span><strong>Si utilisation d'un véhicule de location :</strong> le ticket carburant</span></li>
                      <li className="flex items-start gap-2"><span className="font-bold">•</span><span><strong>RIB</strong> (Relevé d'Identité Bancaire)</span></li>
                    </ul>
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-sm text-red-800 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Les dossiers incomplets ne seront pas traités
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {justificatifs.map((group) => (
                  <div key={group.id} className="flex gap-3 items-start bg-gray-50 hover:bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all group">
                    <div className="flex-1">
                      <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => handleJustificatifUpload(group.id, e.target.files)} className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white text-gray-900 hover:border-gray-300 text-sm" />
                      {group.files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {group.files.map((file, idx) => (
                            <p key={idx} className="text-sm text-emerald-600 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />{file.name}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    {justificatifs.length > 1 && (
                      <button type="button" onClick={() => removeJustificatif(group.id)} className="mt-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addJustificatif} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all border-2 border-dashed border-blue-300 hover:border-blue-400 font-medium text-sm">
                  <Plus className="w-4 h-4" />
                  Ajouter un justificatif
                </button>
              </div>
            </section>

            {/* ─── Signature ──────────────────────────────────── */}
            <section>
              <SectionHeader icon={<Image className="w-5 h-5" />} title="Signature Numérique" subtitle="Obligatoire" />
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <SignatureSection onSignatureChange={handleSignatureChange} currentSignature={formData.signature} currentSignatureFile={formData.signatureFile} />
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="text-right mb-3">
                    <h4 className="font-bold text-gray-900">Michel Rémy</h4>
                    <p className="text-sm text-gray-500">Président du SAM athlétisme</p>
                  </div>
                  <div className="border-2 border-gray-100 rounded-xl p-4 bg-gray-50/50 flex items-center justify-center min-h-[120px]">
                    <img src="/Signature_Michel.png" alt="Signature du Président Michel Rémy" className="max-h-28 w-auto object-contain opacity-80" />
                  </div>
                </div>
              </div>
            </section>

            {/* ─── Submit ─────────────────────────────────────── */}
            <div className="pt-6 border-t border-gray-200">
              {submitStatus === 'success' && (
                <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-fadeIn">
                  <div className="flex items-center gap-2.5 text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Formulaire soumis avec succès !</span>
                  </div>
                  <p className="text-emerald-600 mt-1 text-sm ml-7">Votre demande de remboursement a été envoyée pour traitement.</p>
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl animate-fadeIn">
                  <div className="flex items-center gap-2.5 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Échec de la soumission</span>
                  </div>
                  <p className="text-red-600 mt-1 text-sm ml-7">Une erreur s'est produite. Veuillez réessayer.</p>
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className={`w-full py-4 px-6 rounded-2xl font-semibold text-white text-lg transition-all duration-300 flex items-center justify-center gap-3 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]'}`}>
                {isSubmitting ? (
                  <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Envoi en cours...</>
                ) : (
                  <><Send className="w-5 h-5" />Soumettre la Demande de Remboursement de Frais</>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <p className="text-center text-sm text-gray-500">
              Propulsé et développé par{' '}
              <a href="https://www.hugoscarbonchi.fr/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium underline decoration-blue-300 hover:decoration-blue-500 transition-colors">Hugo Scarbonchi</a>
            </p>
          </div>
        </div>
      </div>
      <Analytics />
    </div>
  );
}

export default App;
