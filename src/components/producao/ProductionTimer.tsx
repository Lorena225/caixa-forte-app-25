import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface ProductionTimerProps {
  startTime?: string;
  pauseStart?: string;
  totalPauseMinutes?: number;
  isRunning: boolean;
  isPaused: boolean;
}

export function ProductionTimer({
  startTime,
  pauseStart,
  totalPauseMinutes = 0,
  isRunning,
  isPaused
}: ProductionTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const totalPauseMs = totalPauseMinutes * 60 * 1000;
      
      // Se está pausado, congelar no momento da pausa
      if (isPaused && pauseStart) {
        const pauseTime = new Date(pauseStart).getTime();
        return Math.floor((pauseTime - start - totalPauseMs) / 1000);
      }
      
      return Math.floor((now - start - totalPauseMs) / 1000);
    };

    setElapsedSeconds(calculateElapsed());

    // Se está rodando (não pausado), atualizar a cada segundo
    if (isRunning && !isPaused) {
      const interval = setInterval(() => {
        setElapsedSeconds(calculateElapsed());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, pauseStart, totalPauseMinutes, isRunning, isPaused]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (!startTime) return "text-muted-foreground";
    if (isPaused) return "text-amber-600";
    if (isRunning) return "text-green-600";
    return "text-muted-foreground";
  };

  const getStatusText = () => {
    if (!startTime) return "Aguardando início";
    if (isPaused) return "Pausado";
    if (isRunning) return "Em produção";
    return "Finalizado";
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-5 w-5" />
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      <div className={`font-mono text-6xl sm:text-7xl font-bold tracking-wider ${getStatusColor()}`}>
        {formatTime(elapsedSeconds)}
      </div>
      {totalPauseMinutes > 0 && (
        <div className="text-sm text-muted-foreground">
          Tempo de pausa: {Math.floor(totalPauseMinutes)}min
        </div>
      )}
    </div>
  );
}
