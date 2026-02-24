import React, { useState, useMemo } from 'react'
import { useTeams, Team } from '@/hooks/useTeams'
import { useEmployees, Employee } from '@/hooks/useEmployees'
import { useSites } from '@/hooks/useSites'
import { useProjects } from '@/hooks/useProjects'
import { useJobFunctions } from '@/hooks/useJobFunctions'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  Search,
  HardHat,
  Truck,
  Briefcase,
  Loader2,
  Filter,
  UserPlus,
  ArrowRightLeft,
  ChevronRight,
  GripVertical,
  ShieldCheck,
  Building2,
  MapPin,
  Pencil,
  Trash2,
  Settings,
  Crown,
  UserX,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ErrorBoundary } from '@react-three/fiber/dist/declarations/src/core/utils'

// --- Componentes ---

interface DraggableEmployeeProps {
  employee: Employee
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

function EmployeeCard({
  employee,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: DraggableEmployeeProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'group relative flex cursor-grab items-center gap-3 rounded-xl border p-3 transition-all duration-300 mb-2',
        'glass-card bg-white/5 border-white/5 hover:bg-white/10 hover:border-primary/30 active:cursor-grabbing active:scale-[0.98]',
        isDragging && 'opacity-30 grayscale-[0.5] border-dashed border-white/20'
      )}
    >
      <div className="absolute left-1 opacity-0 transition-all duration-300 group-hover:left-2 group-hover:opacity-40">
        <GripVertical className="h-4 w-4" />
      </div>
      <Avatar className="ml-4 h-10 w-10 shrink-0 border-2 border-white/10 shadow-glow-sm transition-transform duration-500 group-hover:scale-110">
        <AvatarFallback className="bg-primary/20 text-primary text-xs font-black tracking-tighter">
          {employee.fullName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-white group-hover:text-primary truncate text-[13px] font-black transition-colors">
            {employee.fullName}
          </p>
          {employee.canLeadTeam && (
            <Crown className="h-3.5 w-3.5 shrink-0 fill-amber-500/20 text-amber-500 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-4 border-white/5 bg-white/5 px-1.5 text-[8px] font-black tracking-widest text-muted-foreground/80">
            {employee.functionName || 'COLABORADOR'}
          </Badge>
        </div>
      </div>
      {/* Badges de Nível - Minimalista Premium */}
      <div className="flex shrink-0 items-center gap-1.5 pr-1">
        {employee.level > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-black text-blue-400/50 uppercase leading-none mb-0.5">Lvl</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10 text-[10px] font-black text-blue-400">
              {employee.level}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

interface TeamColumnProps {
  team: Team
  members: Employee[]
  supervisorEmployee?: Employee
  draggedId: string | null
  dragOverId: string | null
  onEdit: (team: Team) => void
  onDelete: (id: string) => void
  onClearMembers: (teamId: string) => void
  onDragStart: (e: React.DragEvent, id: string, sourceTeamId?: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, targetId: string) => void
}

function TeamColumn({
  team,
  members,
  supervisorEmployee,
  draggedId,
  dragOverId,
  onEdit,
  onDelete,
  onClearMembers,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: TeamColumnProps) {
  // LOG PARA DIAGNÓSTICO
  console.log(`[TeamColumn] Rendering team: ${team.name} (${team.id}), members: ${members.length}`);

  const isOver = dragOverId === team.id || dragOverId === `leader-${team.id}`
  const isOverLeader = dragOverId === `leader-${team.id}`

  const isHealthy = members.length >= 5 && !!team.supervisorId

  return (
    <div
      onDragOver={(e) => onDragOver(e, team.id)}
      onDrop={(e) => onDrop(e, team.id)}
      className={cn(
        'flex w-80 flex-col rounded-3xl border transition-all duration-500',
        'glass-panel bg-black/40 backdrop-blur-2xl border-white/5 shadow-2xl',
        isOver && !isOverLeader
          ? 'bg-amber-500/5 border-amber-500 ring-2 ring-amber-500/20 shadow-glow-sm'
          : 'hover:border-white/10'
      )}
    >
      {/* Column Header */}
      <div className="group/header relative border-b border-white/5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <Badge
            key={`badge-team-${team.id}`}
            className={cn(
              'bg-primary/10 text-primary border-primary/20',
              !isHealthy &&
              'border-orange-500/20 bg-orange-500/10 text-orange-500'
            )}
          >
            Equipe
          </Badge>
          <div className="flex translate-x-1 items-center gap-1.5 transition-transform group-hover/header:translate-x-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover/header:opacity-100 hover:bg-white/10"
              onClick={() => onEdit(team)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-destructive/20 hover:text-destructive h-7 w-7 opacity-0 transition-opacity group-hover/header:opacity-100"
              onClick={() => onDelete(team.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            {members.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 transition-opacity group-hover/header:opacity-100 hover:bg-orange-500/20 hover:text-orange-500"
                onClick={() => onClearMembers(team.id)}
                title="Remover todos os membros"
              >
                <UserX className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 transition-opacity hover:bg-emerald-500/20 hover:text-emerald-500 z-10"
              onClick={() => onEdit(team)}
              title="Adicionar membros (Editar equipe)"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <div className="ml-1 flex items-center gap-1.5">
              <Users className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-muted-foreground text-xs font-bold">
                {members.length}
              </span>
            </div>
          </div>
        </div>
        <h3 className="truncate text-lg font-bold">{team.name}</h3>

        {/* Supervisor Slot as Card - Droppable */}
        <div className="mt-4">
          <p className="text-muted-foreground/50 mb-2 ml-1 text-[10px] font-black tracking-widest uppercase">
            Líder da Equipe
          </p>
          <div
            onDragOver={(e) => onDragOver(e, `leader-${team.id}`)}
            onDrop={(e) => onDrop(e, `leader-${team.id}`)}
            className={cn(
              'rounded-2xl transition-all duration-500 p-1',
              isOverLeader
                ? 'bg-emerald-500/10 ring-2 ring-emerald-500 ring-offset-4 ring-offset-black/50 scale-[1.02]'
                : 'bg-white/5'
            )}
          >
            {supervisorEmployee ? (
              <div className="rounded-xl border-l-[6px] border-emerald-500 shadow-glow-sm overflow-hidden">
                <EmployeeCard
                  employee={supervisorEmployee}
                  isDragging={draggedId === supervisorEmployee.id}
                  onDragStart={(e) => onDragStart(e, supervisorEmployee.id)}
                  onDragEnd={onDragEnd}
                />
              </div>
            ) : (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-dashed px-3 py-3 text-xs font-bold transition-all',
                  isOverLeader
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                    : 'border-orange-500/30 bg-orange-500/5 text-orange-500/60'
                )}
              >
                <Crown className="h-4 w-4" />
                {isOverLeader
                  ? 'Solte para definir como líder'
                  : 'Arraste um líder aqui'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-hidden flex flex-col p-3 pt-0">
        <ScrollArea className="flex-1 h-full pr-2">
          {members.length > 0 ? (
            <div className="space-y-0 pb-4">
              {members.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  isDragging={draggedId === emp.id}
                  onDragStart={(e) => onDragStart(e, emp.id, team.id)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => onDragOver(e, emp.id)}
                  onDrop={(e) => onDrop(e, emp.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground/40 rounded-xl border border-dashed border-white/5 py-8 text-center text-xs">
              Arraste membros para cá
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

// --- Main Page ---

export default function TeamComposition() {
  const {
    teams,
    moveMember,
    createTeam,
    updateTeam,
    deleteTeam,
    isLoading: loadingTeams
  } = useTeams()
  const { projects, isLoading: loadingProjects } = useProjects()
  const { sites, isLoading: loadingSites } = useSites()
  const { functions, isLoading: loadingFunctions } = useJobFunctions()
  const { profile } = useAuth()
  const { toast } = useToast()

  console.log('[TeamComposition] Render - Teams count:', teams.length);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedFunctionSearchId, setSelectedFunctionSearchId] = useState<string>('all')

  const { employees, isLoading: loadingEmployees } = useEmployees({
    projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
    siteId: selectedSiteId === 'all' ? undefined : selectedSiteId
  })

  const [searchTerm, setSearchTerm] = useState('')

  // New Native DND State
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [sourceTeamId, setSourceTeamId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Team Creation State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>('all')
  const [newTeamSupervisorId, setNewTeamSupervisorId] = useState<string>('none')
  const [isCreating, setIsCreating] = useState(false)

  // Team Editing State
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editTeamName, setEditTeamName] = useState('')
  const [editTeamSupervisorId, setEditTeamSupervisorId] = useState<string>('none')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleReorderMembers = async (teamId: string, oldIndex: number, newIndex: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const newMembers = [...team.members];
    const [removed] = newMembers.splice(oldIndex, 1);
    newMembers.splice(newIndex, 0, removed);

    await updateTeam(teamId, {
      name: team.name,
      members: newMembers,
      supervisorId: team.supervisorId, // Keep as is
      siteId: team.siteId ?? undefined,
      companyId: team.companyId ?? undefined,
      projectId: team.projectId ?? undefined,
      laborType: team.laborType ?? undefined
    });
  }

  // Pure Domain Selector: Talent Pool
  const talentPool = useMemo(() => {
    const assignedIds = new Set([
      ...teams.flatMap(t => t.members),
      ...(teams.map(t => t.supervisorId).filter(Boolean) as string[])
    ])

    return employees
      .filter(emp => 
        !assignedIds.has(emp.id) &&
        (selectedSiteId === 'all' || emp.siteId === selectedSiteId) &&
        (searchTerm === '' || emp.fullName.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedFunctionSearchId === 'all' || emp.functionId === selectedFunctionSearchId)
      )
      .sort((a, b) => (b.level || 0) - (a.level || 0));
  }, [employees, teams, selectedSiteId, searchTerm, selectedFunctionSearchId]);

  // Pure Domain Selector: Filtered Teams
  const siteTeams = useMemo(() => {
    return teams
      .filter(t => {
        if (selectedProjectId === 'all' && selectedSiteId === 'all') return true;
        if (selectedSiteId !== 'all') return t.siteId === selectedSiteId;
        if (selectedProjectId !== 'all') {
          const site = sites.find(s => s.id === t.siteId);
          return site?.projectId === selectedProjectId;
        }
        return true;
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [teams, selectedSiteId, selectedProjectId, sites]);

  // --- Native DND Handlers ---

  const handleDragStart = (e: React.DragEvent, id: string, originTeamId?: string) => {
    setDraggedId(id)
    setSourceTeamId(originTeamId || null)

    // Custom drag image could be set here if needed
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setSourceTeamId(null)
    setDragOverId(null)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverId(id)
  }

  /**
   * Semantic Dropping Logic (DDD Intent)
   */
  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const employeeId = draggedId;
    if (!employeeId) return;

    const employeeData = employees.find(emp => emp.id === employeeId);
    setDragOverId(null);

    // Intent 1: Move to Talent Pool
    if (targetId === 'talent-pool') {
      const result = await moveMember(employeeId, sourceTeamId, null);
      if (result.success && employeeData) {
        toast({ title: 'Removido da Equipe', description: `${employeeData.fullName} voltou para disponíveis.` });
      }
      return;
    }

    // Intent 2: Assign as Team Leader
    if (targetId.startsWith('leader-')) {
      const teamId = targetId.replace('leader-', '');
      const team = teams.find(t => t.id === teamId);
      if (!team || !employeeData) return;

      const result = await updateTeam(teamId, {
        name: team.name,
        supervisorId: employeeId,
      });

      if (result.success) {
        toast({ title: 'Líder Atualizado', description: `${employeeData.fullName} agora lidera ${team.name}` });
      }
      return;
    }

    // Intent 3: Move to Team Membership
    const targetTeam = teams.find(t => t.id === targetId || t.members.includes(targetId));
    if (targetTeam) {
      if (sourceTeamId === targetTeam.id) return; // Ignore internal reorder for now

      const result = await moveMember(employeeId, sourceTeamId, targetTeam.id);
      if (result.success && employeeData) {
        toast({ title: 'Membro Alocado', description: `${employeeData.fullName} movido para ${targetTeam.name}` });
      } else if (!result.success) {
        toast({ title: 'Erro na Escala', description: result.error, variant: 'destructive' });
      }
    }
  }

  const handleClearTeamMembers = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !confirm(`Remover todos os membros de "${team.name}"?`)) return;

    for (const memberId of team.members) {
      await moveMember(memberId, teamId, null);
    }
    toast({ title: 'Equipe Limpa' });
  }

  const handleSetLeader = async (teamId: string, employeeId: string) => {
    // Deprecated for direct updateTeam call in handleDrop Intent 2
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }

    // Auto-vincular canteiro do líder selecionado se não houver um selecionado
    let teamSiteId = selectedSiteId !== 'all' ? selectedSiteId : undefined
    if (!teamSiteId && newTeamSupervisorId !== 'none') {
      const leader = employees.find(e => e.id === newTeamSupervisorId)
      if (leader?.siteId) {
        teamSiteId = leader.siteId
        console.log('[TeamComposition] Auto-resolved siteId from leader:', teamSiteId)
      }
    }

    // Resolve companyId: tenta do profile ou do projeto selecionado
    let teamCompanyId = profile?.companyId
    if (!teamCompanyId && selectedProjectId !== 'all') {
      const proj = projects.find(p => p.id === selectedProjectId)
      if (proj?.companyId) {
        teamCompanyId = proj.companyId
        console.log('[TeamComposition] Auto-resolved companyId from project:', teamCompanyId)
      }
    }

    if (!teamSiteId) {
      toast({ 
          title: 'Canteiro Obrigatório', 
          description: 'Selecione um canteiro ou um líder que já pertença a um canteiro.', 
          variant: 'destructive' 
      })
      return
    }

    if (!teamCompanyId) {
       toast({ 
           title: 'Erro de Contexto', 
           description: 'Não foi possível identificar a sua empresa. Tente recarregar a página.', 
           variant: 'destructive' 
       })
       return
    }

    setIsCreating(true)
    try {
      const result = await createTeam({
        name: newTeamName,
        supervisorId: newTeamSupervisorId === 'none' ? undefined : newTeamSupervisorId,
        siteId: teamSiteId,
        companyId: teamCompanyId,
        projectId: selectedProjectId !== 'all' ? selectedProjectId : undefined,
      })

      if (result.success) {
        toast({ title: 'Equipe criada com sucesso!' })
        setNewTeamName('')
        setSelectedFunctionId('all')
        setNewTeamSupervisorId('none')
        setIsCreateDialogOpen(false)
      } else {
          toast({ 
              title: 'Erro ao criar equipe', 
              description: result.error, 
              variant: 'destructive' 
          })
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateTeam = async () => {
    if (!editingTeam || !editTeamName.trim()) return

    setIsUpdating(true)
    try {
      const result = await updateTeam(editingTeam.id, {
        name: editTeamName,
        supervisorId: editTeamSupervisorId === 'none' ? null : editTeamSupervisorId,
        siteId: editingTeam.siteId ?? undefined,
        companyId: editingTeam.companyId ?? undefined,
        projectId: editingTeam.projectId ?? undefined
      })

      if (result.success) {
        toast({ title: 'Equipe atualizada!' })
        setEditingTeam(null)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTeam = async (id: string) => {
    if (confirm('Tem certeza? Os membros voltarão para a lista de disponíveis.')) {
      await deleteTeam(id)
      toast({ title: 'Equipe excluída' })
    }
  }

  if (loadingTeams || loadingEmployees || loadingProjects || loadingSites) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-primary h-10 w-10 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-8 overflow-hidden px-2 pt-2">
      {/* Header com Filtros */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
              <ArrowRightLeft className="text-primary h-6 w-6" />
            </div>
            <h1 className="font-display gradient-text text-4xl leading-tight font-black tracking-tight">
              Team Composition
            </h1>
          </div>
          <div className="text-muted-foreground/60 flex items-center gap-3 ml-12">
            <span className="text-xs font-medium bg-white/5 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
              Gestão Estratégica de Capital Humano
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Obra */}
          <div className="flex items-center gap-2">
            <HardHat className="text-primary h-4 w-4" />
            <Select
              value={selectedProjectId}
              onValueChange={val => {
                setSelectedProjectId(val)
                setSelectedSiteId('all')
              }}
            >
              <SelectTrigger className="industrial-input h-10 w-48">
                <SelectValue placeholder="Todas as Obras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Obras</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Canteiro */}
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-orange-500" />
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="industrial-input h-10 w-48">
                <SelectValue placeholder="Todos os Canteiros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Canteiros</SelectItem>
                {sites
                  .filter(s => selectedProjectId === 'all' || s.projectId === selectedProjectId)
                  .map(s => (
                    <SelectItem key={`site-opt-${s.id}`} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Função */}
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-sky-500" />
            <Select value={selectedFunctionSearchId} onValueChange={setSelectedFunctionSearchId}>
              <SelectTrigger className="industrial-input h-10 w-48">
                <SelectValue placeholder="Todas as Funções" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Funções</SelectItem>
                {functions.map(f => (
                  <SelectItem key={`func-search-opt-${f.id}`} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mx-1 h-6 w-px bg-white/10" />

          <div className="relative w-56">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar colaborador..."
              className="industrial-input pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Sidebar: Talent Pool */}
        <div
          onDragOver={(e) => handleDragOver(e, 'talent-pool')}
          onDrop={(e) => handleDrop(e, 'talent-pool')}
          className={cn(
            "premium-blur relative flex w-85 flex-col overflow-hidden rounded-3xl border transition-all duration-300 bg-black/60 shadow-strong",
            dragOverId === 'talent-pool' ? "border-amber-500 ring-2 ring-amber-500/20" : "border-white/10"
          )}
        >
          <div className="relative border-b border-white/5 bg-linear-to-b from-white/5 to-transparent p-6 pb-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-3 text-lg font-black tracking-tight text-white">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <UserPlus className="h-4 w-4" />
                </div>
                Disponíveis
              </h3>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-black">
                {talentPool.length}
              </Badge>
            </div>
            <p className="text-muted-foreground/60 px-1 text-[11px] leading-relaxed">
              Colaboradores aguardando alocação estratégica em frentes de serviço.
            </p>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="min-h-full pb-20">
              {talentPool.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center opacity-30">
                  <Users className="mb-2 h-10 w-10" />
                  <p className="text-xs">Nenhum disponível</p>
                </div>
              ) : (
                talentPool.map(emp => (
                  <EmployeeCard
                    key={emp.id}
                    employee={emp}
                    isDragging={draggedId === emp.id}
                    onDragStart={(e) => handleDragStart(e, emp.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Area: Teams Scroller */}
        <div className="custom-scrollbar flex-1 overflow-x-auto pb-4">
          <div className="flex h-full items-start gap-6">

            {siteTeams.map((team, idx) => (

              <TeamColumn

                key={team.id || `team-idx-${idx}`}
                team={team}
                draggedId={draggedId}
                dragOverId={dragOverId}
                members={employees
                  .filter(e => team.members.includes(e.id))
                  .sort((a, b) => {
                    if (b.level !== a.level) return b.level - a.level
                    return b.professionalLevel - a.professionalLevel
                  })}
                supervisorEmployee={employees.find(e => e.id === team.supervisorId)}
                onEdit={t => {
                  setEditingTeam(t)
                  setEditTeamName(t.name)
                  setEditTeamSupervisorId(t.supervisorId || 'none')
                }}
                onDelete={handleDeleteTeam}
                onClearMembers={handleClearTeamMembers}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />

            ))}

            {/* Criar Equipe */}
            <Dialog key="dialog-create-team" open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="hover:border-primary/50 hover:bg-primary/5 group mt-0 h-32 w-80 rounded-2xl border-dashed border-white/10"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="group-hover:bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition-colors">
                      <Users className="text-muted-foreground group-hover:text-primary h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold opacity-40 transition-all group-hover:opacity-100">
                      Criar Nova Equipe
                    </span>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card text-foreground border-white/10">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl font-bold">Nova Equipe</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold tracking-widest uppercase opacity-60">Nome da Equipe</Label>
                    <Input
                      placeholder="Ex: Equipe de Alvenaria L1"
                      className="industrial-input h-12"
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold tracking-widest uppercase opacity-60">Filtrar por Cargo</Label>
                    <Select
                      value={selectedFunctionId}
                      onValueChange={val => {
                        setSelectedFunctionId(val)
                        setNewTeamSupervisorId('none')
                      }}
                    >
                      <SelectTrigger className="industrial-input h-12">
                        <SelectValue placeholder="Todos os cargos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os cargos</SelectItem>
                        <SelectItem value="leaders">Líderes Qualificados</SelectItem>
                        {functions.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold tracking-widest uppercase opacity-60">Líder / Supervisor</Label>
                    <Select value={newTeamSupervisorId} onValueChange={setNewTeamSupervisorId}>
                      <SelectTrigger className="industrial-input h-12">
                        <SelectValue placeholder="Selecione um líder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem Supervisor (Definir depois)</SelectItem>
                        {employees
                          .filter(e => e.isActive && (selectedFunctionId === 'all' || (selectedFunctionId === 'leaders' ? e.canLeadTeam : e.functionId === selectedFunctionId)))
                          .map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>
                              <div className="flex items-center gap-2">
                                {emp.fullName}
                                {emp.canLeadTeam && <Crown className="h-3 w-3 fill-amber-500/20 text-amber-500" />}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="gradient-primary h-12 w-full font-bold"
                    onClick={handleCreateTeam}
                    disabled={isCreating}
                  >
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                    Confirmar Criação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Editar Equipe Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={open => !open && setEditingTeam(null)}>
        <DialogContent className="glass-card text-foreground border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">Editar Equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-widest uppercase opacity-60">Nome da Equipe</Label>
              <Input
                className="industrial-input h-12"
                value={editTeamName}
                onChange={e => setEditTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-widest uppercase opacity-60">Líder / Supervisor</Label>
              <Select value={editTeamSupervisorId} onValueChange={setEditTeamSupervisorId}>
                <SelectTrigger className="industrial-input h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem Supervisor</SelectItem>
                  {employees
                    .filter(e => e.isActive)
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          {emp.fullName}
                          {emp.canLeadTeam && <Crown className="h-3 w-3 fill-amber-500/20 text-amber-500" />}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="gradient-primary h-12 w-full font-bold"
              onClick={handleUpdateTeam}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
