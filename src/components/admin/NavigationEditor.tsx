import { useState, useCallback } from 'react';
import { useNavigationItems, useNavigationProfiles, useUserNavPreferences } from '@/hooks/useNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  GripVertical, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Edit2, 
  Save, 
  X,
  Check,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableItemProps {
  item: {
    key: string;
    label: string;
    icon: string;
    visible: boolean;
  };
  index: number;
  onToggleVisibility: (key: string) => void;
  onEditLabel: (key: string, label: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dragOverIndex: number | null;
}

function DraggableItem({
  item,
  index,
  onToggleVisibility,
  onEditLabel,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  dragOverIndex,
}: DraggableItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.label);

  const handleSaveLabel = () => {
    onEditLabel(item.key, editValue);
    setIsEditing(false);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md border bg-card transition-all cursor-move',
        isDragging && 'opacity-50',
        dragOverIndex === index && 'border-primary border-2',
        !item.visible && 'opacity-60 bg-muted'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-sm"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveLabel}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm truncate">{item.label}</span>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 shrink-0" 
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </>
      )}
      
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={() => onToggleVisibility(item.key)}
      >
        {item.visible ? (
          <Eye className="h-3 w-3 text-success" />
        ) : (
          <EyeOff className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}

interface NavigationEditorProps {
  profileKey?: string;
  onSave?: () => void;
}

export function NavigationEditor({ profileKey, onSave }: NavigationEditorProps) {
  const { data: items = [] } = useNavigationItems();
  const { data: profiles = [] } = useNavigationProfiles();
  const { toast } = useToast();
  
  const [selectedProfile, setSelectedProfile] = useState(profileKey || 'PROFILE_ADMIN');
  const [editedItems, setEditedItems] = useState<Map<string, { label: string; visible: boolean; order: number }>>(new Map());
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentProfile = profiles.find(p => p.profile_key === selectedProfile);
  
  // Get groups and their items
  const groups = items.filter(item => item.key.startsWith('group.'));
  
  const getItemsForGroup = useCallback((groupKey: string) => {
    return items
      .filter(item => item.parent_key === groupKey)
      .map((item, index) => {
        const edited = editedItems.get(item.key);
        return {
          key: item.key,
          label: edited?.label ?? item.label_default,
          icon: item.icon,
          visible: edited?.visible ?? !item.hidden_by_default,
          order: edited?.order ?? item.sort_order ?? index,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [items, editedItems]);

  const handleToggleVisibility = (key: string) => {
    const item = items.find(i => i.key === key);
    if (!item) return;
    
    const current = editedItems.get(key);
    setEditedItems(new Map(editedItems.set(key, {
      label: current?.label ?? item.label_default,
      visible: !(current?.visible ?? !item.hidden_by_default),
      order: current?.order ?? item.sort_order ?? 0,
    })));
    setHasChanges(true);
  };

  const handleEditLabel = (key: string, label: string) => {
    const item = items.find(i => i.key === key);
    if (!item) return;
    
    const current = editedItems.get(key);
    setEditedItems(new Map(editedItems.set(key, {
      label,
      visible: current?.visible ?? !item.hidden_by_default,
      order: current?.order ?? item.sort_order ?? 0,
    })));
    setHasChanges(true);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      // Reorder logic would update the order property
      setHasChanges(true);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would save to the database
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({ title: 'Configurações salvas com sucesso!' });
      setHasChanges(false);
      onSave?.();
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditedItems(new Map());
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Selector */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>Perfil de Navegação</Label>
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.profile_key} value={profile.profile_key}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="mr-2">Alterações pendentes</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <Separator />

      {/* Instructions */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Como editar:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Arraste os itens para reordenar (ícone <GripVertical className="h-3 w-3 inline" />)</li>
          <li>Clique no ícone de lápis para editar o texto do menu</li>
          <li>Clique no ícone de olho para mostrar/ocultar o item</li>
        </ul>
      </div>

      {/* Groups */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-4 pr-4">
          {groups.map((group) => {
            const groupItems = getItemsForGroup(group.key);
            const edited = editedItems.get(group.key);
            const groupLabel = edited?.label ?? group.label_default;
            const isExpanded = true; // Could be stateful

            return (
              <Card key={group.key}>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <CardTitle className="text-sm font-medium">{groupLabel}</CardTitle>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {groupItems.filter(i => i.visible).length}/{groupItems.length} visíveis
                    </Badge>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {groupItems.map((item, index) => (
                        <DraggableItem
                          key={item.key}
                          item={item}
                          index={index}
                          onToggleVisibility={handleToggleVisibility}
                          onEditLabel={handleEditLabel}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDragEnd={handleDragEnd}
                          isDragging={dragIndex === index}
                          dragOverIndex={dragOverIndex}
                        />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
