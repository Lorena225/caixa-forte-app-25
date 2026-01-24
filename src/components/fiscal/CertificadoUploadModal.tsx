import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Upload, Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { showDevelopmentToast } from "@/utils/devFeedback";

interface CertificadoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CertificadoUploadModal({ open, onOpenChange }: CertificadoUploadModalProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
        toast.error("Formato inválido. Use arquivos .pfx ou .p12");
        return;
      }
      setArquivo(file);
    }
  };

  const handleSubmit = async () => {
    if (!arquivo) {
      toast.error("Selecione um arquivo de certificado");
      return;
    }
    if (!senha) {
      toast.error("Informe a senha do certificado");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual upload and validation
      // In production, this would:
      // 1. Upload to secure storage
      // 2. Validate certificate with senha
      // 3. Extract certificate info (validade, CNPJ, etc)
      // 4. Store encrypted in database
      
      // Simulating processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      showDevelopmentToast('Upload de certificado A1');
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error("Erro ao enviar certificado: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setArquivo(null);
    setSenha('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enviar Certificado Digital
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Seu certificado será armazenado de forma criptografada e segura.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Arquivo do Certificado A1 *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {arquivo ? (
                <div className="space-y-2">
                  <Shield className="h-8 w-8 mx-auto text-primary" />
                  <p className="font-medium">{arquivo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(arquivo.size / 1024).toFixed(1)} KB
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setArquivo(null)}>
                    Remover
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">Selecione o certificado</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Formatos aceitos: .pfx, .p12
                  </p>
                  <Input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleFileChange}
                    className="max-w-[200px] mx-auto"
                  />
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Senha do Certificado *</Label>
            <div className="relative">
              <Input
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a senha"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowSenha(!showSenha)}
              >
                {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A senha será usada apenas para validar o certificado
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Certificado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
