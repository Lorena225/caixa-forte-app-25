import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Play, Pause, Clock, X, ChevronUp, ChevronDown, 
  Timer, FolderKanban, CheckCircle2, Plus, HelpCircle, AlertTriangle
} from "lucide-react";
import { 
  useActiveTimesheet, useStartTimesheet, useStopTimesheet, 
  useCreateTimesheet, useProjects, useMyTasks 
} from "@/hooks/useProjects";
import { format, differenceInSeconds } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export function TimesheetWidget() {
  const { data: activeTimesheet, isLoading } = useActiveTimesheet();
  const { data: projects } = useProjects();
  const { data: myTasks } = useMyTasks();
  const startTimesheet = useStartTimesheet();
  const stopTimesheet = useStopTimesheet();
  const createTimesheet = useCreateTimesheet();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [description, setDescription] = useState("");
  
  // Start dialog form
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [startDescription, setStartDescription] = useState("");

  // Manual entry form
  const [manualEntry, setManualEntry] = useState({
    project_id: "",
    task_id: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: "09:00",
    end_time: "17:00",
    description: "",
  });

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (!activeTimesheet?.start_time) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const seconds = differenceInSeconds(new Date(), new Date(activeTimesheet.start_time));
      setElapsedSeconds(seconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimesheet?.start_time]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!selectedProject) return;
    
    await startTimesheet.mutateAsync({
      project_id: selectedProject,
      task_id: selectedTask || undefined,
      description: startDescription || undefined,
    });
    
    setShowStartDialog(false);
    setSelectedProject("");
    setSelectedTask("");
    setStartDescription("");
    setIsExpanded(true);
  };

  const handleStop = async () => {
    if (!activeTimesheet) return;
    
    await stopTimesheet.mutateAsync({
      id: activeTimesheet.id,
      description: description || activeTimesheet.description || undefined,
    });
    
    setDescription("");
    setIsExpanded(false);
  };

  const handleManualEntry = async () => {
    if (!manualEntry.project_id) return;
    
    const startDateTime = new Date(`${manualEntry.date}T${manualEntry.start_time}`);
    const endDateTime = new Date(`${manualEntry.date}T${manualEntry.end_time}`);
    
    await createTimesheet.mutateAsync({
      project_id: manualEntry.project_id,
      task_id: manualEntry.task_id || undefined,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      description: manualEntry.description || undefined,
    });
    
    setShowManualDialog(false);
    setManualEntry({
      project_id: "",
      task_id: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: "09:00",
      end_time: "17:00",
      description: "",
    });
  };

  // Get filtered tasks for selected project
  const projectTasks = myTasks?.filter(t => 
    t.project && (t.project as { id: string }).id === selectedProject
  ) || [];

  const manualProjectTasks = myTasks?.filter(t => 
    t.project && (t.project as { id: string }).id === manualEntry.project_id
  ) || [];

  if (isLoading) return null;

  return (
    <>
      {/* Fixed Widget */}
      <motion.div
        className="fixed bottom-20 right-6 z-40"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <AnimatePresence mode="wait">
          {activeTimesheet ? (
            <motion.div
              key="active"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Card className="shadow-lg border-2 border-primary/20 overflow-hidden">
                {/* Timer Bar */}
                <div 
                  className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 flex items-center gap-3 cursor-pointer"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <Timer className="h-4 w-4 animate-pulse" />
                  <span className="font-mono font-bold text-lg">
                    {formatDuration(elapsedSeconds)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {activeTimesheet.project?.name || 'Projeto'}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-primary-foreground hover:bg-white/20">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {activeTimesheet.project?.project_number}
                          </span>
                          <span className="text-muted-foreground">-</span>
                          <span>{activeTimesheet.project?.name}</span>
                        </div>

                        {activeTimesheet.task && (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            <span>{activeTimesheet.task.title}</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="desc" className="text-xs">Descrição (opcional)</Label>
                          <Input
                            id="desc"
                            placeholder="O que você fez?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>

                        <Button 
                          variant="destructive" 
                          className="w-full gap-2"
                          onClick={handleStop}
                          disabled={stopTimesheet.isPending}
                        >
                          <Pause className="h-4 w-4" />
                          Parar Timer
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="inactive"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    size="lg" 
                    className="rounded-full shadow-lg gap-2 h-12 px-5"
                  >
                    <Clock className="h-5 w-5" />
                    <span>Apontar Horas</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2">
                  <div className="space-y-1">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-2"
                      onClick={() => setShowStartDialog(true)}
                    >
                      <Play className="h-4 w-4 text-green-600" />
                      Iniciar Timer
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-2"
                      onClick={() => setShowManualDialog(true)}
                    >
                      <Plus className="h-4 w-4 text-blue-600" />
                      Lançar Manual
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dialog: Start Timer */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Iniciar Timer
            </DialogTitle>
            <DialogDescription>
              O tempo apontado aqui impacta diretamente o custo do projeto. Seja preciso.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              Suas horas serão usadas para calcular a rentabilidade do projeto (Custo = Horas × Seu Valor Hora).
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.filter(p => p.status === 'em_andamento').map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tarefa (opcional)</Label>
              <Select 
                value={selectedTask} 
                onValueChange={setSelectedTask}
                disabled={!selectedProject || projectTasks.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={projectTasks.length > 0 ? "Selecione a tarefa" : "Nenhuma tarefa atribuída"} />
                </SelectTrigger>
                <SelectContent>
                  {projectTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="O que você vai fazer?"
                value={startDescription}
                onChange={(e) => setStartDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleStart}
              disabled={!selectedProject || startTimesheet.isPending}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Manual Entry */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Lançar Horas Manualmente
            </DialogTitle>
            <DialogDescription>
              Use para registrar horas retroativas quando esqueceu de iniciar o timer.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-blue-200 bg-blue-50">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              Sem timesheet, não há cálculo de custo real do projeto. Registre todas as horas trabalhadas.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select 
                value={manualEntry.project_id} 
                onValueChange={(v) => setManualEntry(prev => ({ ...prev, project_id: v, task_id: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tarefa (opcional)</Label>
              <Select 
                value={manualEntry.task_id} 
                onValueChange={(v) => setManualEntry(prev => ({ ...prev, task_id: v }))}
                disabled={!manualEntry.project_id || manualProjectTasks.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a tarefa" />
                </SelectTrigger>
                <SelectContent>
                  {manualProjectTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={manualEntry.date}
                onChange={(e) => setManualEntry(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={manualEntry.start_time}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={manualEntry.end_time}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Descreva o que foi feito"
                value={manualEntry.description}
                onChange={(e) => setManualEntry(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleManualEntry}
              disabled={!manualEntry.project_id || createTimesheet.isPending}
            >
              Registrar Horas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
