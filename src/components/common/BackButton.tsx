import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
  showHome?: boolean;
}

export function BackButton({ to, label = 'Voltar', showHome = true }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
      {showHome && (
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Ir para Dashboard">
          <Home className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
