import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProductionOrderDetails, usePCP } from "@/hooks/usePCP";
import { useShopFloorAppointment } from "@/hooks/useShopFloor";
import { ProductionTimer } from "@/components/producao/ProductionTimer";
import { 
  Play, 
  Pause, 
  Square, 
  AlertTriangle, 
  Factory,
  User,
  Clock,
  Package
} from "lucide-react";
import { toast } from "sonner";

const PAUSE_REASONS = [
  "Aguardando material",
  "Manutenção preventiva",
  "Manutenção corretiva",
  "Troca de turno",
  "Intervalo/Refeição",
  "Ajuste de máquina",
  "Falta de energia",
  "Outro"
];

export default function ChaoFabrica() {
  const { productionOrders } = usePCP();
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [quantityProduced, setQuantityProduced] = useState<number>(0);
  const [quantityRejected, setQuantityRejected] = useState<number>(0);
  const [pauseReason, setPauseReason] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const { data: orderDetails, isLoading: orderLoading } = useProductionOrderDetails(selectedOrderId || undefined);
  const { 
    activeAppointment, 
    startAppointment, 
    pauseAppointment, 
    resumeAppointment, 
    finishAppointment,
    isLoading 
  } = useShopFloorAppointment(selectedOrderId);

  // Filtrar apenas OPs liberadas ou em progresso
  const availableOrders = productionOrders.filter(
    op => ['released', 'in_progress'].includes(op.status)
  );

  const handleStart = async () => {
    if (!selectedOrderId) {
      toast.error("Selecione uma OP");
      return;
    }
    await startAppointment.mutateAsync({ orderId: selectedOrderId });
  };

  const handlePause = async () => {
    if (!activeAppointment?.id) return;
    if (!pauseReason) {
      toast.error("Selecione o motivo da pausa");
      return;
    }
    await pauseAppointment.mutateAsync({ 
      appointmentId: activeAppointment.id, 
      reason: pauseReason 
    });
    setPauseReason("");
  };

  const handleResume = async () => {
    if (!activeAppointment?.id) return;
    await resumeAppointment.mutateAsync({ appointmentId: activeAppointment.id });
  };

  const handleFinish = async () => {
    if (!activeAppointment?.id) return;
    if (quantityProduced <= 0) {
      toast.error("Informe a quantidade produzida");
      return;
    }
    await finishAppointment.mutateAsync({
      appointmentId: activeAppointment.id,
      quantityProduced,
      quantityRejected,
      rejectionReason: quantityRejected > 0 ? rejectionReason : undefined
    });
    setQuantityProduced(0);
    setQuantityRejected(0);
    setRejectionReason("");
  };

  const isInProgress = activeAppointment?.status === 'in_progress';
  const isPaused = activeAppointment?.status === 'paused';
  const hasActiveAppointment = !!activeAppointment;

  return (
    <AppLayout>
      <div className="space-y-6 p-2 sm:p-4">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8 text-primary" />
          <PageHeader
            title="Apontamento - Chão de Fábrica"
            description="Interface simplificada para operadores"
          />
        </div>

        {/* Seleção de OP */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ordem de Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId} disabled={hasActiveAppointment}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Selecione a OP..." />
              </SelectTrigger>
              <SelectContent>
                {availableOrders.map(op => (
                  <SelectItem key={op.id} value={op.id} className="text-lg py-3">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold">{op.order_number}</span>
                      <span className="text-muted-foreground text-sm">{op.products?.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {orderDetails && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Produto:</span>
                  <span className="font-medium text-lg">{orderDetails.products?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Quantidade Planejada:</span>
                  <span className="font-mono text-xl font-bold">{(orderDetails as any).quantity_planned || (orderDetails as any).planned_quantity} un</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Já Produzido:</span>
                  <span className="font-mono text-xl">{(orderDetails as any).quantity_completed || (orderDetails as any).produced_quantity || 0} un</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timer */}
        {selectedOrderId && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="py-8">
              <ProductionTimer 
                startTime={activeAppointment?.start_time}
                pauseStart={activeAppointment?.pause_start}
                totalPauseMinutes={activeAppointment?.total_pause_minutes || 0}
                isRunning={isInProgress}
                isPaused={isPaused}
              />
            </CardContent>
          </Card>
        )}

        {/* Botões de Ação - Layout para Tablet */}
        <div className="grid grid-cols-2 gap-4">
          {/* Iniciar / Retomar */}
          <Button
            size="lg"
            className="h-24 text-xl font-bold gap-3"
            variant={isInProgress ? "secondary" : "default"}
            disabled={!selectedOrderId || isInProgress || isLoading}
            onClick={isPaused ? handleResume : handleStart}
          >
            <Play className="h-8 w-8" />
            {isPaused ? "RETOMAR" : "INICIAR"}
          </Button>

          {/* Pausar */}
          <Button
            size="lg"
            className="h-24 text-xl font-bold gap-3"
            variant="outline"
            disabled={!isInProgress || isLoading}
            onClick={handlePause}
          >
            <Pause className="h-8 w-8" />
            PAUSAR
          </Button>

          {/* Finalizar */}
          <Button
            size="lg"
            className="h-24 text-xl font-bold gap-3 bg-success hover:bg-success/90 text-success-foreground"
            disabled={!hasActiveAppointment || isLoading}
            onClick={handleFinish}
          >
            <Square className="h-8 w-8" />
            FINALIZAR
          </Button>

          {/* Refugo (abre dialog para informar) */}
          <Button
            size="lg"
            className="h-24 text-xl font-bold gap-3"
            variant="destructive"
            disabled={!hasActiveAppointment || isLoading}
            onClick={() => {
              if (quantityRejected === 0) setQuantityRejected(1);
            }}
          >
            <AlertTriangle className="h-8 w-8" />
            REFUGO
          </Button>
        </div>

        {/* Motivo da Pausa */}
        {isInProgress && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Motivo da Pausa (obrigatório)</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={pauseReason} onValueChange={setPauseReason}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {PAUSE_REASONS.map(reason => (
                    <SelectItem key={reason} value={reason} className="text-base py-2">
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Quantidades */}
        {hasActiveAppointment && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quantidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Quantidade Produzida</Label>
                  <Input
                    type="number"
                    min={0}
                    value={quantityProduced}
                    onChange={e => setQuantityProduced(parseInt(e.target.value) || 0)}
                    className="h-14 text-2xl font-mono text-center"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base text-destructive">Quantidade Refugo</Label>
                  <Input
                    type="number"
                    min={0}
                    value={quantityRejected}
                    onChange={e => setQuantityRejected(parseInt(e.target.value) || 0)}
                    className="h-14 text-2xl font-mono text-center border-destructive/50"
                  />
                </div>
              </div>

              {quantityRejected > 0 && (
                <div className="space-y-2">
                  <Label className="text-base">Motivo do Refugo</Label>
                  <Input
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Descreva o motivo..."
                    className="h-12 text-base"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status do Apontamento Atual */}
        {activeAppointment && (
          <Card className="border-primary">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Apontamento Ativo</span>
                </div>
                <Badge 
                  variant={isInProgress ? "default" : isPaused ? "secondary" : "outline"}
                  className="text-sm"
                >
                  {isInProgress ? "Em Produção" : isPaused ? "Pausado" : activeAppointment.status}
                </Badge>
              </div>
              {isPaused && activeAppointment.pause_reason && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Motivo: {activeAppointment.pause_reason}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
