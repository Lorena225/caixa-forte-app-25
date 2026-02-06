import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color?: string;
}

interface TreasuryMenuSectionProps {
  title: string;
  items: MenuItem[];
}

export function TreasuryMenuSection({ title, items }: TreasuryMenuSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
        {title}
      </h3>
      <Card className="overflow-hidden">
        <CardContent className="p-0 divide-y divide-border">
          {items.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group"
            >
              <div className={cn(
                "p-2 rounded-lg bg-muted",
                item.color || "text-primary"
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
