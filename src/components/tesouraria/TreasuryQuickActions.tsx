import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Zap, Search, FileText } from 'lucide-react';

export function TreasuryQuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild className="gap-2 bg-primary hover:bg-primary/90">
        <Link to="/tesouraria/transferencias">
          <Zap className="h-4 w-4" />
          Nova Transferência
        </Link>
      </Button>
      <Button asChild variant="outline" className="gap-2 border-success text-success hover:bg-success/10">
        <Link to="/tesouraria/conciliacao">
          <Search className="h-4 w-4" />
          Iniciar Conciliação
        </Link>
      </Button>
      <Button asChild variant="outline" className="gap-2 border-info text-info hover:bg-info/10">
        <Link to="/tesouraria/boletos">
          <FileText className="h-4 w-4" />
          Emitir Boleto
        </Link>
      </Button>
    </div>
  );
}
