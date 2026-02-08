import { useState } from "react";
import { ChevronRight, ChevronDown, Package, Wrench, Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BOMComponent {
  id: string;
  component_product_id: string;
  quantity: number;
  scrap_rate?: number;
  products?: {
    name: string;
    code?: string;
    product_type?: string;
    current_stock?: number;
  };
  children?: BOMComponent[];
}

interface BOMTreeViewProps {
  components: BOMComponent[];
  parentQuantity?: number;
  level?: number;
  onSelectComponent?: (component: BOMComponent) => void;
}

export function BOMTreeView({ 
  components, 
  parentQuantity = 1, 
  level = 0,
  onSelectComponent 
}: BOMTreeViewProps) {
  return (
    <div className={cn("space-y-1", level > 0 && "ml-4 border-l border-dashed pl-3")}>
      {components.map(component => (
        <BOMTreeNode
          key={component.id}
          component={component}
          parentQuantity={parentQuantity}
          level={level}
          onSelect={onSelectComponent}
        />
      ))}
    </div>
  );
}

interface BOMTreeNodeProps {
  component: BOMComponent;
  parentQuantity: number;
  level: number;
  onSelect?: (component: BOMComponent) => void;
}

function BOMTreeNode({ component, parentQuantity, level, onSelect }: BOMTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  
  const hasChildren = component.children && component.children.length > 0;
  const isManufactured = component.products?.product_type === 'manufactured';
  const totalQuantity = component.quantity * parentQuantity * (1 + (component.scrap_rate || 0) / 100);
  const stock = component.products?.current_stock || 0;
  const hasEnoughStock = stock >= totalQuantity;

  const Icon = isManufactured ? Package : Wrench;

  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
          !hasEnoughStock && "bg-destructive/5"
        )}
        onClick={() => {
          if (hasChildren) setIsExpanded(!isExpanded);
          onSelect?.(component);
        }}
      >
        {/* Expand/Collapse button */}
        <div className="w-5 flex justify-center">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4" />
          )}
        </div>

        {/* Icon */}
        <Icon className={cn(
          "h-4 w-4",
          isManufactured ? "text-primary" : "text-success"
        )} />

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {component.products?.name || 'Componente'}
            </span>
            {component.products?.code && (
              <span className="text-xs text-muted-foreground font-mono">
                [{component.products.code}]
              </span>
            )}
          </div>
        </div>

        {/* Quantity */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">
            {totalQuantity.toFixed(2)}
          </span>
          {component.scrap_rate && component.scrap_rate > 0 && (
            <Badge variant="outline" className="text-[10px]">
              +{component.scrap_rate}% perda
            </Badge>
          )}
        </div>

        {/* Stock indicator */}
        <div className="flex items-center gap-1">
          <Box className={cn(
            "h-4 w-4",
            hasEnoughStock ? "text-success" : "text-destructive"
          )} />
          <span className={cn(
            "text-xs font-mono",
            hasEnoughStock ? "text-success" : "text-destructive"
          )}>
            {stock}
          </span>
        </div>

        {/* Type badge */}
        <Badge 
          variant={isManufactured ? "default" : "secondary"}
          className="text-[10px] px-1.5"
        >
          {isManufactured ? "FAB" : "COMP"}
        </Badge>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <BOMTreeView
          components={component.children!}
          parentQuantity={totalQuantity}
          level={level + 1}
          onSelectComponent={onSelect}
        />
      )}
    </div>
  );
}
