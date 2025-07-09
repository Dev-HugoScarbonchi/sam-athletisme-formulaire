import React, { useRef, useState, useEffect } from 'react';
import { Upload, Pen, X, Check } from 'lucide-react';

interface SignatureSectionProps {
  onSignatureChange: (signature: string | null, signatureFile: File | null) => void;
  currentSignature: string | null;
  currentSignatureFile: File | null;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({
  onSignatureChange,
  currentSignature,
  currentSignatureFile
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'none' | 'draw' | 'upload'>('none');
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  // Initialize signature mode based on current values
  useEffect(() => {
    if (currentSignatureFile) {
      setSignatureMode('upload');
    } else if (currentSignature) {
      setSignatureMode('draw');
      setHasDrawnSignature(true);
    } else {
      setSignatureMode('none');
      setHasDrawnSignature(false);
    }
  }, [currentSignature, currentSignatureFile]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureMode !== 'draw') return;
    
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureMode !== 'draw') return;

    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (hasDrawnSignature) {
      const canvas = canvasRef.current;
      if (canvas) {
        const signatureDataUrl = canvas.toDataURL('image/png');
        onSignatureChange(signatureDataUrl, null);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
    onSignatureChange(null, null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPEG, GIF, WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Taille maximale : 5MB');
      return;
    }

    // Clear canvas if there was a drawn signature
    if (hasDrawnSignature) {
      clearSignature();
    }

    onSignatureChange(null, file);
  };

  const switchToDrawMode = () => {
    setSignatureMode('draw');
    onSignatureChange(null, null);
    
    // Initialize canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const switchToUploadMode = () => {
    setSignatureMode('upload');
    if (hasDrawnSignature) {
      clearSignature();
    }
  };

  const cancelSignature = () => {
    setSignatureMode('none');
    clearSignature();
  };

  const validateSignature = () => {
    if (signatureMode === 'draw' && hasDrawnSignature) {
      const canvas = canvasRef.current;
      if (canvas) {
        const signatureDataUrl = canvas.toDataURL('image/png');
        onSignatureChange(signatureDataUrl, null);
      }
    }
    // For upload mode, the signature is already set in handleFileUpload
  };

  // Initialize canvas when switching to draw mode
  useEffect(() => {
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [signatureMode]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Pen className="w-5 h-5 mr-2 text-blue-600" />
        Signature du demandeur
      </h3>

      {signatureMode === 'none' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Choisissez votre méthode de signature :
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={switchToDrawMode}
              className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Pen className="w-5 h-5 mr-2" />
              Dessiner ma signature
            </button>
            <button
              type="button"
              onClick={switchToUploadMode}
              className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <Upload className="w-5 h-5 mr-2" />
              Importer un fichier
            </button>
          </div>
        </div>
      )}

      {signatureMode === 'draw' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Dessinez votre signature dans la zone ci-dessous :
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearSignature}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={cancelSignature}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full h-32 border border-gray-200 rounded cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {hasDrawnSignature && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={validateSignature}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4 mr-2" />
                Valider la signature
              </button>
            </div>
          )}
        </div>
      )}

      {signatureMode === 'upload' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Importez un fichier image de votre signature :
            </p>
            <button
              type="button"
              onClick={cancelSignature}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="signature-upload"
            />
            <label
              htmlFor="signature-upload"
              className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-lg p-4 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                Cliquez pour sélectionner un fichier
              </span>
              <span className="text-xs text-gray-400 mt-1">
                PNG, JPEG, GIF, WebP (max 5MB)
              </span>
            </label>
          </div>

          {currentSignatureFile && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm text-green-800">
                  Fichier sélectionné : {currentSignatureFile.name}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {(currentSignature || currentSignatureFile) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">
              Signature enregistrée - Elle sera incluse dans le PDF généré
            </span>
          </div>
        </div>
      )}
    </div>
  );
};