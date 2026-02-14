import React, { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, UserCircle, X } from 'lucide-react';

export interface Responsible {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  role?: string;
}

export interface ResponsibleSelectorProps {
  /** Lista de todos os usuários disponíveis para seleção */
  users: Responsible[];
  /** IDs dos usuários selecionados */
  selectedIds: string[];
  /** Callback ao mudar a seleção */
  onSelectionChange: (ids: string[]) => void;
  /** Título/Placeholder do componente */
  placeholder?: string;
  /** Desabilita o componente */
  disabled?: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * ResponsibleSelector Component
 * Multi-select combobox for selecting site managers with avatar display.
 * Dark themed ("Retângulo Preto") per user request.
 */
export const ResponsibleSelector: React.FC<ResponsibleSelectorProps> = ({
  users,
  selectedIds,
  onSelectionChange,
  placeholder = 'Selecionar responsáveis...',
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filter users by search term
  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter(u => u.fullName.toLowerCase().includes(search.toLowerCase()));
  }, [users, search]);

  // Get selected user objects
  const selectedUsers = useMemo(() => {
    return users.filter(u => selectedIds.includes(u.id));
  }, [users, selectedIds]);

  const handleSelect = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  const handleRemove = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedIds.filter(id => id !== userId));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between h-auto min-h-11 py-2',
            'bg-black/40 border-white/10 hover:bg-black/60 hover:border-primary/30',
            'text-left font-normal',
            className
          )}
        >
          {selectedUsers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map(user => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="bg-primary/20 text-primary-foreground hover:bg-primary/30 pr-1 gap-1"
                >
                  <Avatar className="w-5 h-5 border border-white/10">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                    <AvatarFallback className="text-[8px] bg-primary/40">{getInitials(user.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs max-w-[100px] truncate">{user.fullName.split(' ')[0]}</span>
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive"
                    onClick={(e) => handleRemove(user.id, e)}
                  />
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 glass-card border-white/10" align="start">
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Buscar por nome..."
            value={search}
            onValueChange={setSearch}
            className="border-none focus:ring-0"
          />
          <CommandList>
            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            <CommandGroup>
              {filteredUsers.map(user => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => handleSelect(user.id)}
                    className="cursor-pointer hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="w-7 h-7 border border-white/10">
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                        <AvatarFallback className="text-[9px] bg-muted">{getInitials(user.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.fullName}</p>
                        {user.role && (
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{user.role}</p>
                        )}
                      </div>
                    </div>
                    <Check
                      className={cn('w-4 h-4 ml-2', isSelected ? 'opacity-100 text-primary' : 'opacity-0')}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
