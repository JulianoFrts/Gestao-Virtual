import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUsers, SystemUser } from "@/hooks/useUsers";
import { UserCard } from "@/components/users/UserCard";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Loader2, RefreshCw, Filter, Building2, HardHat, Truck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/integrations/database";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [onlyCorporate, setOnlyCorporate] = useState(false);

  const { profile } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  const { 
    users, isLoading, isMoreLoading, hasMore, loadMore, refresh, updateUser, deleteUser 
  } = useUsers({ 
    search: searchTerm, 
    companyId: companyFilter !== "all" ? companyFilter : undefined,
    projectId: projectFilter !== "all" ? projectFilter : undefined,
    siteId: siteFilter !== "all" ? siteFilter : undefined,
    onlyCorporate: onlyCorporate || undefined
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<SystemUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [cRes, pRes, sRes] = await Promise.all([
        db.from("companies").select("id, name"),
        db.from("projects").select("id, name, companyId"),
        db.from("sites").select("id, name, projectId")
      ]);
      if (cRes.data) setCompanies(cRes.data);
      if (pRes.data) setProjects(pRes.data);
      if (sRes.data) setSites(sRes.data);
    };
    fetchData();
  }, []);

  // Filtered lists for sequential selection
  const filteredProjectsItems = React.useMemo(() => {
    if (companyFilter === "all") return [];
    return projects.filter(p => p.companyId === companyFilter);
  }, [projects, companyFilter]);

  const filteredSitesItems = React.useMemo(() => {
    if (projectFilter === "all") return [];
    return sites.filter(s => s.projectId === projectFilter);
  }, [sites, projectFilter]);

  // Reset dependent filters when parent changes
  useEffect(() => {
    setProjectFilter("all");
    setSiteFilter("all");
  }, [companyFilter]);

  useEffect(() => {
    setSiteFilter("all");
  }, [projectFilter]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastUserRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isMoreLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) loadMore();
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isMoreLoading, hasMore, loadMore]);

  return (
    <div className="container mx-auto py-8 space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter bg-linear-to-r from-white to-white/40 bg-clip-text text-transparent uppercase">
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold opacity-50">
            Soberania de acesso e controle de hierarquia
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="border-white/10" onClick={() => refresh()} disabled={isLoading}>
            <RefreshCw className={isLoading ? "animate-spin" : ""} />
          </Button>
          {can("users.manage") && (
            <Button onClick={() => { setUserToEdit(null); setIsFormOpen(true); }} className="gradient-primary font-black shadow-glow">
              <UserPlus className="w-4 h-4 mr-2" /> NOVO USUÁRIO
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar por nome, email ou matrícula..."
            className="pl-10 h-12 bg-black/40 border-white/10 focus:border-primary/50 transition-all rounded-2xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setOnlyCorporate(!onlyCorporate)}
            className={cn(
              "h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider border border-white/5 transition-all",
              onlyCorporate ? "bg-emerald-500 text-white shadow-glow-sm border-emerald-400/50" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-2" />
            Gestão App
          </Button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[180px] h-10 bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-wider rounded-xl">
              <div className="flex items-center gap-2"><Building2 className="w-3 h-3 text-primary" /><SelectValue placeholder="Empresa" /></div>
            </SelectTrigger>
            <SelectContent className="bg-black/95 border-white/10">
              <SelectItem value="all">Todas Empresas</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {companyFilter !== "all" && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px] h-10 bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-wider rounded-xl">
                  <div className="flex items-center gap-2"><HardHat className="w-3 h-3 text-primary" /><SelectValue placeholder="Obra" /></div>
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10">
                  <SelectItem value="all">Todas Obras</SelectItem>
                  {filteredProjectsItems.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {projectFilter !== "all" && companyFilter !== "all" && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-[180px] h-10 bg-black/40 border-white/10 text-[10px] font-black uppercase tracking-wider rounded-xl">
                  <div className="flex items-center gap-2"><Truck className="w-3 h-3 text-primary" /><SelectValue placeholder="Canteiro" /></div>
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10">
                  <SelectItem value="all">Todos Canteiros</SelectItem>
                  {filteredSitesItems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-3xl bg-white/5" />)
        ) : (
          <>
            {users.map((user, index) => (
              <div key={user.id} ref={index === users.length - 1 ? lastUserRef : null}>
                <UserCard
                  user={user}
                  isSelected={selectedIds.has(user.id)}
                  onToggleSelect={(id) => {
                    const next = new Set(selectedIds);
                    next.has(id) ? next.delete(id) : next.add(id);
                    setSelectedIds(next);
                  }}
                  onEdit={(u) => { setUserToEdit(u); setIsFormOpen(true); }}
                  onChangePassword={() => {}}
                  onToggleBlock={() => {}}
                  onDelete={async (u) => { if (confirm(`Excluir ${u.fullName}?`)) await deleteUser(u.id); }}
                  canUpdate={can("users.manage")}
                  canDelete={can("users.manage")}
                  updatingUserId={null}
                  companies={companies}
                  projects={projects}
                  sites={sites}
                />
              </div>
            ))}
            {isMoreLoading && <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
            {!hasMore && users.length > 0 && <p className="text-center text-[9px] uppercase font-black text-muted-foreground opacity-30 pt-8 tracking-[0.2em]">Fim da base de dados</p>}
          </>
        )}
      </div>

      <UserFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        user={userToEdit} 
        onSubmit={async (data) => {
          setIsSubmitting(true);
          try {
            if (userToEdit) await updateUser(userToEdit.id, data);
            else await db.auth.signUp({ email: data.email, password: data.password, options: { data } });
            setIsFormOpen(false);
            refresh();
          } finally { setIsSubmitting(false); }
        }} 
        isSubmitting={isSubmitting} 
        companies={companies} 
      />
    </div>
  );
}
