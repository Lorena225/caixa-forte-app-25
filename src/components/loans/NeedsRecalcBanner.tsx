import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface NeedsRecalcBannerProps {
  reason?: string;
  onRecalculate?: () => void;
  isRecalculating?: boolean;
}

export function NeedsRecalcBanner({ 
  reason, 
  onRecalculate, 
  isRecalculating 
}: NeedsRecalcBannerProps) {
  return (
    <Alert variant="destructive" className="border-amber-500 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-700">Recálculo Necessário</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-600">
          {reason || 'As parcelas precisam ser recalculadas antes de prosseguir.'}
        </span>
        {onRecalculate && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRecalculate}
            disabled={isRecalculating}
            className="ml-4 border-amber-500 text-amber-700 hover:bg-amber-500/20"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Recalculando...' : 'Recalcular Agora'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
