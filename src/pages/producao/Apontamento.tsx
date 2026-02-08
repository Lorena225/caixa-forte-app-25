import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, 
  Pause, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Factory,
  User,
  Package,
  Timer,
  Trash2
} from "lucide-react";
import { useProductionOrders } from "@/hooks/usePCP";
import { toast } from "sonner";

interface ActiveAppointment {
  orderId: string;
  operationId: string;
  startTime: Date;
  status: 'running' | 'paused';
}

export default function Apontamento() {
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [activeAppointment, setActiveAppointment] = useState<ActiveAppointment | null>(null);
  const [quantity, setQuantity] = useState("");
  const [scrapQuantity, setScrapQuantity] = useState("");
  const [notes, setNotes] = useState("");
  
  const { data: orders = [], isLoading } = useProductionOrders();
  
  // Filter only in-progress or released orders
  const activeOrders = orders.filter(o => ['released', 'in_progress'].includes(o.status));
  const selectedOrderData = orders.find(o => o.id === selectedOrder);

  const handleStart = () => {
    if (!selectedOrder) {
      toast.error("Selecione uma ordem de produção");
      return;
    }
    setActiveAppointment({
      orderId: selectedOrder,
      operationId: "op-1", // Would come from routing
      startTime: new Date(),
      status: 'running'
    });
    toast.success("Apontamento iniciado!");
  };

  const handlePause = () => {
    if (activeAppointment) {
      setActiveAppointment({ ...activeAppointment, status: 'paused' });
      toast.info("Apontamento pausado");
    }
  };

  const handleResume = () => {
    if (activeAppointment) {
      setActiveAppointment({ ...activeAppointment, status: 'running' });
      toast.success("Apontamento retomado");
    }
  };

  const handleStop = () => {
    if (!activeAppointment) return;
    
    const qty = parseFloat(quantity);
    const scrap = parseFloat(scrapQuantity) || 0;
    
    if (!qty || qty <= 0) {
      toast.error("Informe a quantidade produzida");
      return;
    }

    // Here would save the appointment to database
    toast.success(`Apontamento finalizado! ${qty} unidades produzidas.`);
    
    setActiveAppointment(null);
    setQuantity("");
    setScrapQuantity("");
    setNotes("");
    setSelectedOrder("");
  };

  const handleScrap = () => {
    const scrap = parseFloat(scrapQuantity);
    if (!scrap || scrap <= 0) {
      toast.error("Informe a quantidade de refugo");
      return;
    }
    toast.warning(`${scrap} unidades marcadas como refugo`);
  };

  const getElapsedTime = () => {
    if (!activeAppointment) return "00:00:00";
    const elapsed = Math.floor((new Date().getTime() - activeAppointment.startTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Apontamento de Produção"
          description="Registre o início, pausa e término das operações de produção"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Order Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Ordem de Produção
              </CardTitle>
              <CardDescription>
                Selecione a OP para iniciar o apontamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ordem de Produção</Label>
                <Select 
                  value={selectedOrder} 
                  onValueChange={setSelectedOrder}
                  disabled={!!activeAppointment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma OP" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeOrders.map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.products?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrderData && (
                <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Produto</span>
                    <span className="font-medium">{selectedOrderData.products?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quantidade Planejada</span>
                    <span className="font-medium">{(selectedOrderData as any).planned_quantity || selectedOrderData.quantity_planned}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quantidade Produzida</span>
                    <span className="font-medium">{(selectedOrderData as any).completed_quantity || selectedOrderData.quantity_completed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge>{selectedOrderData.status}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel - Appointment Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Controle de Tempo
              </CardTitle>
              <CardDescription>
                Gerencie o apontamento da operação atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timer Display */}
              <div className="text-center py-6 rounded-lg bg-muted/50">
                <div className="text-5xl font-mono font-bold tracking-wider">
                  {getElapsedTime()}
                </div>
                {activeAppointment && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Badge variant={activeAppointment.status === 'running' ? 'default' : 'secondary'}>
                      {activeAppointment.status === 'running' ? (
                        <><Clock className="h-3 w-3 mr-1" /> Em andamento</>
                      ) : (
                        <><Pause className="h-3 w-3 mr-1" /> Pausado</>
                      )}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center gap-3">
                {!activeAppointment ? (
                  <Button 
                    size="lg" 
                    className="gap-2 px-8"
                    onClick={handleStart}
                    disabled={!selectedOrder}
                  >
                    <Play className="h-5 w-5" />
                    Iniciar
                  </Button>
                ) : (
                  <>
                    {activeAppointment.status === 'running' ? (
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="gap-2"
                        onClick={handlePause}
                      >
                        <Pause className="h-5 w-5" />
                        Pausar
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="gap-2"
                        onClick={handleResume}
                      >
                        <Play className="h-5 w-5" />
                        Retomar
                      </Button>
                    )}
                    <Button 
                      size="lg" 
                      variant="destructive"
                      className="gap-2"
                      onClick={handleStop}
                    >
                      <Square className="h-5 w-5" />
                      Finalizar
                    </Button>
                  </>
                )}
              </div>

              {/* Quantity Input */}
              {activeAppointment && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantidade Produzida</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Refugo</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="0"
                          value={scrapQuantity}
                          onChange={(e) => setScrapQuantity(e.target.value)}
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={handleScrap}
                          disabled={!scrapQuantity}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Anotações sobre a produção..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Apontamentos Recentes</CardTitle>
            <CardDescription>Últimos registros de produção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum apontamento registrado hoje.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
