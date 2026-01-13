import { Check, ChevronsUpDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavigation } from '@/contexts/NavigationContext';
import { useNavigationProfiles } from '@/hooks/useNavigation';
import { useState } from 'react';

export function ProfileSelector() {
  const [open, setOpen] = useState(false);
  const { activeProfile, setActiveProfile } = useNavigation();
  const { data: profiles } = useNavigationProfiles();

  if (!profiles || profiles.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="truncate">{activeProfile?.name || 'Selecionar Perfil'}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Buscar perfil..." />
          <CommandList>
            <CommandEmpty>Nenhum perfil encontrado.</CommandEmpty>
            <CommandGroup>
              {profiles.map((profile) => (
                <CommandItem
                  key={profile.profile_key}
                  value={profile.name}
                  onSelect={() => {
                    setActiveProfile(profile.profile_key);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      activeProfile?.profile_key === profile.profile_key
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {profile.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
