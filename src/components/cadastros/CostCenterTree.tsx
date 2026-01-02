import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FolderTree, File, Plus, MoreHorizontal, Pencil, Trash2, Move, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CostCenter, getLevelLabel, CostCenterHierarchySettings } from '@/hooks/useCostCenterHierarchy';

interface CostCenterTreeProps {
  data: CostCenter[];
  settings?: CostCenterHierarchySettings | null;
  onAddChild?: (parent: CostCenter) => void;
  onEdit?: (item: CostCenter) => void;
  onMove?: (item: CostCenter) => void;
  onToggleActive?: (item: CostCenter) => void;
  onDelete?: (item: CostCenter) => void;
  onSelect?: (item: CostCenter) => void;
  selectedId?: string;
  showInactive?: boolean;
}

export function CostCenterTree({
  data,
  settings,
  onAddChild,
  onEdit,
  onMove,
  onToggleActive,
  onDelete,
  onSelect,
  selectedId,
  showInactive = false,
}: CostCenterTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    function collect(items: CostCenter[]) {
      items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          allIds.add(item.id);
          collect(item.children);
        }
      });
    }
    collect(data);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filtrar por busca
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    function filterTree(items: CostCenter[]): CostCenter[] {
      return items.reduce<CostCenter[]>((acc, item) => {
        const matchesSearch = 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.code.toLowerCase().includes(searchTerm.toLowerCase());
        
        const filteredChildren = item.children ? filterTree(item.children) : [];
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children,
          });
        }
        
        return acc;
      }, []);
    }
    
    return filterTree(data);
  }, [data, searchTerm]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por código ou nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expandir
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Recolher
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum centro de custo encontrado
          </div>
        ) : (
          <div className="p-2">
            {filteredData.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                settings={settings}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpand}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onMove={onMove}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
                onSelect={onSelect}
                selectedId={selectedId}
                showInactive={showInactive}
                depth={0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: CostCenter;
  settings?: CostCenterHierarchySettings | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onAddChild?: (parent: CostCenter) => void;
  onEdit?: (item: CostCenter) => void;
  onMove?: (item: CostCenter) => void;
  onToggleActive?: (item: CostCenter) => void;
  onDelete?: (item: CostCenter) => void;
  onSelect?: (item: CostCenter) => void;
  selectedId?: string;
  showInactive: boolean;
  depth: number;
}

function TreeNode({
  node,
  settings,
  expandedIds,
  onToggleExpand,
  onAddChild,
  onEdit,
  onMove,
  onToggleActive,
  onDelete,
  onSelect,
  selectedId,
  showInactive,
  depth,
}: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;

  // Não mostrar inativos se showInactive = false
  if (!showInactive && !node.is_active) {
    return null;
  }

  const levelLabel = getLevelLabel(node.level, settings);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/50 group cursor-pointer transition-colors',
          isSelected && 'bg-primary/10 hover:bg-primary/15',
          !node.is_active && 'opacity-50'
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect?.(node)}
      >
        {/* Expand/Collapse */}
        <button
          className="p-0.5 hover:bg-muted rounded"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(node.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* Icon */}
        {node.is_leaf ? (
          <File className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FolderTree className="h-4 w-4 text-primary" />
        )}

        {/* Code */}
        <span className="font-mono text-sm text-muted-foreground w-20 truncate">
          {node.code}
        </span>

        {/* Name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Badges */}
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {levelLabel}
          </Badge>
          {node.is_leaf && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              Folha
            </Badge>
          )}
          {!node.is_active && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              Inativo
            </Badge>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {node.level < 5 && onAddChild && (
              <DropdownMenuItem onClick={() => onAddChild(node)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Filho
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            {onMove && (
              <DropdownMenuItem onClick={() => onMove(node)}>
                <Move className="h-4 w-4 mr-2" />
                Mover
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onToggleActive && (
              <DropdownMenuItem onClick={() => onToggleActive(node)}>
                {node.is_active ? (
                  <>
                    <PowerOff className="h-4 w-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onDelete && node.is_leaf && (
              <DropdownMenuItem
                onClick={() => onDelete(node)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              settings={settings}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onMove={onMove}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
              onSelect={onSelect}
              selectedId={selectedId}
              showInactive={showInactive}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
