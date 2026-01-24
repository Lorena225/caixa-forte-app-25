import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Link2, 
  ExternalLink, 
  RefreshCw, 
  Shield, 
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Bank configurations with visual identity
export const SUPPORTED_BANKS = [
  { 
    id: 'nubank', 
    name: 'Nubank', 
    code: '260', 
    color: '#820AD1', 
    textColor: 'white',
    logo: '💜',
    supports: ['data', 'pix', 'payment'],
  },
  { 
    id: 'itau', 
    name: 'Itaú Unibanco', 
    code: '341', 
    color: '#EC7000', 
    textColor: 'white',
    logo: '🟠',
    supports: ['data', 'pix', 'payment'],
  },
  { 
    id: 'bradesco', 
    name: 'Bradesco', 
    code: '237', 
    color: '#CC092F', 
    textColor: 'white',
    logo: '🔴',
    supports: ['data', 'pix', 'payment'],
  },
  { 
    id: 'inter', 
    name: 'Banco Inter', 
    code: '077', 
    color: '#FF7A00', 
    textColor: 'white',
    logo: '🟧',
    supports: ['data', 'pix', 'payment'],
  },
  { 
    id: 'bb', 
    name: 'Banco do Brasil', 
    code: '001', 
    color: '#FFCC00', 
    textColor: 'black',
    logo: '🏛️',
    supports: ['data', 'pix'],
  },
  { 
    id: 'caixa', 
    name: 'Caixa Econômica', 
    code: '104', 
    color: '#0066B3', 
    textColor: 'white',
    logo: '🔵',
    supports: ['data'],
  },
  { 
    id: 'santander', 
    name: 'Santander', 
    code: '033', 
    color: '#EC0000', 
    textColor: 'white',
    logo: '❤️',
    supports: ['data', 'pix', 'payment'],
  },
  { 
    id: 'c6', 
    name: 'C6 Bank', 
    code: '336', 
    color: '#242424', 
    textColor: 'white',
    logo: '⚫',
    supports: ['data', 'pix'],
  },
] as const;

export type SupportedBankId = typeof SUPPORTED_BANKS[number]['id'];

interface BankConnectionFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (bankId: SupportedBankId, credentials: { cpf: string; consent: boolean }) => Promise<void>;
}

type ConnectionStep = 'select' | 'auth' | 'connecting' | 'success';

export const BankConnectionFlow = memo(function BankConnectionFlow({
  open,
  onOpenChange,
  onConnect,
}: BankConnectionFlowProps) {
  const [step, setStep] = useState<ConnectionStep>('select');
  const [selectedBank, setSelectedBank] = useState<typeof SUPPORTED_BANKS[number] | null>(null);
  const [cpf, setCpf] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleBankSelect = (bank: typeof SUPPORTED_BANKS[number]) => {
    setSelectedBank(bank);
    setStep('auth');
  };

  const handleConnect = async () => {
    if (!selectedBank || !cpf) return;
    
    setIsConnecting(true);
    setStep('connecting');

    try {
      await onConnect(selectedBank.id as SupportedBankId, { cpf, consent: true });
      setStep('success');
      toast.success(`Conectado ao ${selectedBank.name} via Open Banking!`);
    } catch (error) {
      toast.error('Erro na conexão. Tente novamente.');
      setStep('auth');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStep('select');
      setSelectedBank(null);
      setCpf('');
    }, 300);
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            {step === 'select' && 'Conectar Banco via Open Banking'}
            {step === 'auth' && `Autorizar ${selectedBank?.name}`}
            {step === 'connecting' && 'Conectando...'}
            {step === 'success' && 'Conexão Estabelecida!'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-success" />
            Conexão criptografada via Open Banking Brasil
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Bank Selection */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid gap-2 max-h-[350px] overflow-y-auto py-4"
            >
              {SUPPORTED_BANKS.map((bank) => (
                <motion.button
                  key={bank.id}
                  onClick={() => handleBankSelect(bank)}
                  className="flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md group"
                  style={{ 
                    borderColor: `${bank.color}30`,
                  }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                      style={{ backgroundColor: bank.color }}
                    >
                      {bank.logo}
                    </div>
                    <div className="text-left">
                      <span className="font-semibold block">{bank.name}</span>
                      <span className="text-xs text-muted-foreground">Código: {bank.code}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {(bank.supports as readonly string[]).includes('data') && (
                        <Badge variant="outline" className="text-xs">Dados</Badge>
                      )}
                      {(bank.supports as readonly string[]).includes('pix') && (
                        <Badge variant="outline" className="text-xs">Pix</Badge>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Step 2: Authentication */}
          {step === 'auth' && selectedBank && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-4"
            >
              {/* Bank Header */}
              <div 
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{ backgroundColor: `${selectedBank.color}10` }}
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: selectedBank.color }}
                >
                  {selectedBank.logo}
                </div>
                <div>
                  <h4 className="font-semibold">{selectedBank.name}</h4>
                  <p className="text-sm text-muted-foreground">Sincronizar saldo e extrato</p>
                </div>
              </div>

              {/* CPF Input */}
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF/CNPJ do Titular</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  className="text-center text-lg tracking-wider"
                />
                <p className="text-xs text-muted-foreground">
                  Informe o documento vinculado à conta bancária
                </p>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <Lock className="h-5 w-5 text-success mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-success">Conexão Segura</p>
                  <p className="text-muted-foreground">
                    Suas credenciais são transmitidas diretamente ao banco via OAuth 2.0. 
                    Nenhuma senha é armazenada em nossos servidores.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Connecting Animation */}
          {step === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="h-12 w-12 text-primary" />
              </motion.div>
              <p className="mt-4 text-center text-muted-foreground">
                Estabelecendo conexão segura com {selectedBank?.name}...
              </p>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 200 }}
              >
                <CheckCircle2 className="h-16 w-16 text-success" />
              </motion.div>
              <h4 className="mt-4 font-semibold text-lg">Conexão Estabelecida!</h4>
              <p className="mt-2 text-center text-muted-foreground max-w-xs">
                Seus dados bancários serão sincronizados automaticamente a cada 4 horas.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="gap-2">
          {step === 'select' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
          {step === 'auth' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                Voltar
              </Button>
              <Button 
                onClick={handleConnect}
                disabled={!cpf || cpf.length < 14}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Autorizar no Banco
              </Button>
            </>
          )}
          {step === 'success' && (
            <Button onClick={handleClose} className="w-full">
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
