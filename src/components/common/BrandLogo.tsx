import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { VitrioLogo } from './VitrioLogo';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo = memo(function BrandLogo({ className }: BrandLogoProps) {
  const navigate = useNavigate();
  const { currentCompany, companies, setCurrentCompany } = useAuth();
  const [imageError, setImageError] = useState(false);

  // Generate initials from company name
  const getInitials = (name: string): string => {
    if (!name) return 'CF';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const companyName = currentCompany?.name || 'Vitrio';
  // @ts-ignore - logo_url may be added via branding system
  const companyLogo = (currentCompany as any)?.logo_url;
  const initials = getInitials(companyName);

  const handleCompanyChange = (companyId: string) => {
    const company = companies?.find((c) => c.id === companyId);
    if (company && setCurrentCompany) {
      setCurrentCompany(company);
    }
  };

  return (
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
          {/* Logo ou Vitrio padrão */}
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

          {/* Nome da empresa (somente quando não é o Vitrio padrão) */}
          {currentCompany && companyName !== 'Vitrio' && (
            <span className="hidden lg:block text-sm font-medium text-gray-700 max-w-[150px] truncate">
              {companyName}
            </span>
          )}

          {/* Chevron */}
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

        {/* Current Company */}
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

        {/* Other Companies */}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default BrandLogo;
