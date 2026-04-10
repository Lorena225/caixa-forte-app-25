import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Building2, Plus, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { VitrioLogo } from './VitrioLogo';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo = memo(function BrandLogo({ className }: BrandLogoProps) {
  const navigate = useNavigate();
  const { currentCompany, companies, setCurrentCompany, refreshCompanies, user } = useAuth();
  const { toast } = useToast();
  const [imageError, setImageError] = useState(false);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', cnpj: '' });

  const getInitials = (name: string): string => {
    if (!name) return 'CF';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const companyName = currentCompany?.name || 'Vitrio';
  // @ts-ignore
  const companyLogo = (currentCompany as any)?.logo_url;
  const initials = getInitials(companyName);

  const handleCompanyChange = (companyId: string) => {
    const company = companies?.find((c) => c.id === companyId);
    if (company && setCurrentCompany) {
      setCurrentCompany(company);
    }
  };

  const handleCreateCompany = async () => {
    if (!formData.name.trim() || !user) return;
    setSaving(true);
    try {
      const { data: company, error: companyError } = await supabase
        .rpc('create_company_with_owner', {
          p_name: formData.name.trim(),
          p_cnpj: formData.cnpj.trim() || null,
        });

      if (companyError) throw companyError;

      await refreshCompanies();
      setCurrentCompany({ id: company.id, name: company.name, role: 'admin' });

      toast({ title: 'Empresa criada!', description: `"${company.name}" está ativa agora.` });
      setShowNewCompany(false);
      setFormData({ name: '', cnpj: '' });
    } catch (err: any) {
      toast({ title: 'Erro ao criar empresa', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg',
              'transition-all duration-200',
              'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20',
              'min-h-[44px]',
              className
            )}
            aria-label="Selecionar empresa"
            aria-haspopup="menu"
          >
            {companyLogo && !imageError ? (
              <img
                src={companyLogo}
                alt={`Logo ${companyName}`}
                className="h-8 w-auto max-w-[120px] object-contain"
                onError={() => setImageError(true)}
              />
            ) : companyName === 'Vitrio' || !currentCompany ? (
              <VitrioLogo size="sm" variant="full" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white text-sm font-bold">{initials}</span>
              </div>
            )}

            {currentCompany && companyName !== 'Vitrio' && (
              <span className="hidden lg:block text-sm font-medium text-gray-700 max-w-[150px] truncate">
                {companyName}
              </span>
            )}

            <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-64 bg-white border border-gray-200 shadow-lg rounded-lg z-[100]"
        >
          <DropdownMenuLabel className="text-gray-700 text-xs uppercase tracking-wider">
            Empresa Ativa
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-200" />

          {currentCompany && (
            <div className="px-3 py-2 bg-blue-50 rounded-md mx-2 mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary truncate">
                  {currentCompany.name}
                </span>
              </div>
            </div>
          )}

          {companies && companies.length > 1 && (
            <>
              <DropdownMenuLabel className="text-gray-500 text-xs">
                Trocar para:
              </DropdownMenuLabel>
              {companies
                .filter((c) => c.id !== currentCompany?.id)
                .map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => handleCompanyChange(company.id)}
                    className="gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 min-h-[40px]"
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{company.name}</span>
                  </DropdownMenuItem>
                ))}
            </>
          )}

          <DropdownMenuSeparator className="bg-gray-200" />
          <DropdownMenuItem
            onClick={() => navigate('/admin/company')}
            className="gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 min-h-[40px]"
          >
            <Building2 className="h-4 w-4" />
            <span>Configurar Empresa</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowNewCompany(true)}
            className="gap-2 cursor-pointer text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 focus:bg-emerald-50 min-h-[40px]"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Empresa</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showNewCompany} onOpenChange={setShowNewCompany}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Nova Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-company-name">Razão Social *</Label>
              <Input
                id="new-company-name"
                placeholder="Nome da empresa"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-company-cnpj">CNPJ</Label>
              <Input
                id="new-company-cnpj"
                placeholder="00.000.000/0001-00"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCompany(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCompany} disabled={!formData.name.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default BrandLogo;
