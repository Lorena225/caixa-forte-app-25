import { useOmnichannelTimeline, type TimelineItem } from "@/hooks/useOmnichannelTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/services/cpqService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  StickyNote,
  Calendar,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
} from "lucide-react";

interface OmnichannelTimelineProps {
  opportunityId: string;
  maxHeight?: string;
}

const typeConfig: Record<string, { icon: typeof Phone; color: string; label: string }> = {
  call: { icon: Phone, color: "text-blue-500", label: "Ligação" },
  email: { icon: Mail, color: "text-purple-500", label: "E-mail" },
  whatsapp: { icon: MessageSquare, color: "text-green-500", label: "WhatsApp" },
  meeting: { icon: Calendar, color: "text-orange-500", label: "Reunião" },
  note: { icon: StickyNote, color: "text-yellow-500", label: "Nota" },
  task: { icon: CheckCircle, color: "text-cyan-500", label: "Tarefa" },
  system: { icon: Settings, color: "text-gray-500", label: "Sistema" },
  quote: { icon: FileText, color: "text-primary", label: "Proposta" },
};

const quoteStatusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  draft: { variant: "outline", label: "Rascunho" },
  sent: { variant: "secondary", label: "Enviada" },
  accepted: { variant: "default", label: "Aceita" },
  rejected: { variant: "destructive", label: "Rejeitada" },
  expired: { variant: "outline", label: "Expirada" },
};

function TimelineItemCard({ item }: { item: TimelineItem }) {
  const config = typeConfig[item.type] || typeConfig.note;
  const Icon = config.icon;
  
  // Safely access metadata
  const metadata = item.metadata as Record<string, unknown> | undefined;
  const totalAmount = typeof metadata?.total_amount === "number" ? metadata.total_amount : 0;
  const status = typeof metadata?.status === "string" ? metadata.status : undefined;
  const validUntil = typeof metadata?.valid_until === "string" ? metadata.valid_until : undefined;
  const requiresApproval = metadata?.requires_approval === true;
  const isCompleted = metadata?.is_completed;
  const metadataContent = typeof metadata?.content === "string" ? metadata.content : undefined;

  return (
    <div className="flex gap-4 pb-6 last:pb-0">
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div className={`p-2 rounded-full bg-muted ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 w-px bg-border mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{item.subject}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(item.timestamp), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {config.label}
          </Badge>
        </div>

        {item.content && (
          <p className="mt-2 text-sm text-muted-foreground">{item.content}</p>
        )}

        {/* Quote-specific details */}
        {item.type === "quote" && metadata && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {formatCurrency(totalAmount)}
              </span>
              {status && (
                <Badge variant={quoteStatusConfig[status]?.variant || "outline"}>
                  {quoteStatusConfig[status]?.label || status}
                </Badge>
              )}
            </div>
            {validUntil && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Válida até {format(new Date(validUntil), "dd/MM/yyyy")}
              </p>
            )}
            {requiresApproval && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Aguardando aprovação de desconto
              </p>
            )}
          </div>
        )}

        {/* WhatsApp/Email message preview */}
        {(item.type === "whatsapp" || item.type === "email") && metadataContent && (
          <div className="mt-2 p-2 bg-muted/30 rounded border-l-2 border-muted text-sm">
            {metadataContent.substring(0, 200)}
            {metadataContent.length > 200 && "..."}
          </div>
        )}

        {/* Activity completed status */}
        {isCompleted !== undefined && (
          <div className="mt-2">
            {isCompleted ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Concluída
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function OmnichannelTimeline({ opportunityId, maxHeight = "600px" }: OmnichannelTimelineProps) {
  const { data: timeline = [], isLoading, error } = useOmnichannelTimeline(opportunityId);

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Erro ao carregar timeline
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Timeline Omnichannel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }}>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhuma atividade registrada</p>
              <p className="text-sm">Atividades, propostas e mensagens aparecerão aqui</p>
            </div>
          ) : (
            <div className="relative">
              {timeline.map((item) => (
                <TimelineItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
