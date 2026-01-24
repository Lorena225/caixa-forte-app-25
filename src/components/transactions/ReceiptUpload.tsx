import { useState, useCallback } from 'react';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReceiptUploadProps {
  onUpload?: (file: File) => void;
  onRemove?: () => void;
  className?: string;
}

export function ReceiptUpload({ onUpload, onRemove, className }: ReceiptUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido', {
        description: 'Envie uma imagem (JPG, PNG, WebP) ou PDF',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande', {
        description: 'O tamanho máximo é 5MB',
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsProcessing(false);
    onUpload?.(file);
    
    toast.success('Recibo anexado', {
      description: 'Nossa IA está analisando o documento',
      icon: '🧾',
    });
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setFileName(null);
    onRemove?.();
  }, [onRemove]);

  if (fileName) {
    return (
      <div className={cn('space-y-2', className)}>
        <Label>Comprovante/Recibo</Label>
        <div className="relative rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-3">
            {preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                <FileImage className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {isProcessing ? 'Processando...' : 'Anexado com sucesso'}
              </p>
            </div>
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Button 
                type="button"
                variant="ghost" 
                size="icon"
                onClick={handleRemove}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label>Comprovante/Recibo</Label>
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors',
          isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <Upload className={cn(
          'h-8 w-8 mb-2 transition-colors',
          isDragging ? 'text-primary' : 'text-muted-foreground'
        )} />
        <p className="text-sm text-muted-foreground text-center">
          <span className="font-medium text-foreground">Clique para enviar</span>
          {' '}ou arraste aqui
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG, WebP ou PDF (máx. 5MB)
        </p>
        <input
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleInputChange}
        />
      </label>
    </div>
  );
}
