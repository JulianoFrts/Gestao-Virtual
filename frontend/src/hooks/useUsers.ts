import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/integrations/database";
import { useToast } from "@/hooks/use-toast";
import { mapDatabaseError, logError } from "@/lib/errorHandler";
import { useAuth } from "@/contexts/AuthContext";

export interface SystemUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  companyId: string | null;
  projectId: string | null;
  siteId: string | null;
  isBlocked: boolean;
  status?: string;
  createdAt: string;
  isSystemAdmin?: boolean;
  image?: string | null;
  phone?: string | null;
  hierarchyLevel?: number;
  jobFunction?: { id: string; name: string } | null;
  registrationNumber?: string | null;
  zipCode?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface UserFilters {
  companyId?: string;
  projectId?: string;
  siteId?: string;
  search?: string;
  onlyCorporate?: boolean;
}

export function useUsers(filters?: UserFilters) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const loadingRef = useRef(false);
  const { toast } = useToast();
  const { profile: currentProfile } = useAuth();

  const PAGE_SIZE = 50;

  const loadUsers = useCallback(
    async (isInitial = true) => {
      if (!currentProfile?.id || loadingRef.current) return;
      if (!isInitial && !hasMore) return;

      loadingRef.current = true;
      const targetPage = isInitial ? 1 : page + 1;
      
      if (isInitial) setIsLoading(true);
      else setIsMoreLoading(true);

      try {
        const from = (targetPage - 1) * PAGE_SIZE;
        const to = targetPage * PAGE_SIZE - 1;
        
        let query = db.from("users").select("*");
        
        if (filters?.search) query = query.eq("search", filters.search.trim());
        if (filters?.companyId) query = query.eq("companyId", filters.companyId);
        if (filters?.projectId) query = query.eq("projectId", filters.projectId);
        if (filters?.siteId) query = query.eq("siteId", filters.siteId);
        if (filters?.onlyCorporate) query = query.eq("onlyCorporate", "true");

        const { data, error } = await query.range(from, to);
        
        if (error) throw error;

        const mapped: SystemUser[] = (data || []).map((p: any) => {
          const auth = p.authCredential || {};
          const affil = p.affiliation || {};
          return {
            id: p.id,
            fullName: p.name || p.email?.split("@")[0] || "Usuário",
            email: p.email || auth.email || "",
            role: (auth.role || p.role || "OPERATIONAL").toUpperCase(),
            phone: p.phone,
            companyId: affil.companyId,
            projectId: affil.projectId,
            siteId: affil.siteId,
            isBlocked: ["SUSPENDED", "INACTIVE"].includes(auth.status),
            status: auth.status,
            isSystemAdmin: auth.isSystemAdmin || false,
            hierarchyLevel: affil.hierarchyLevel || 0,
            image: p.image,
            registrationNumber: affil.registrationNumber,
            jobFunction: affil.jobFunction,
            createdAt: p.createdAt
          };
        });

        if (isInitial) {
          setUsers(mapped);
          setPage(1);
          setHasMore(mapped.length === PAGE_SIZE);
        } else {
          setUsers(prev => {
            const existingIds = new Set(prev.map(u => u.id));
            const newOnes = mapped.filter(u => !existingIds.has(u.id));
            return [...prev, ...newOnes];
          });
          setPage(targetPage);
          setHasMore(mapped.length === PAGE_SIZE);
        }

      } catch (error: any) {
        logError("Users Load", error);
        toast({ title: "Erro ao carregar", description: mapDatabaseError(error), variant: "destructive" });
      } finally {
        setIsLoading(false);
        setIsMoreLoading(false);
        loadingRef.current = false;
      }
    },
    [currentProfile?.id, filters, toast, page, hasMore]
  );

  useEffect(() => {
    loadUsers(true);
  }, [filters?.search, filters?.companyId, filters?.projectId, filters?.siteId, filters?.onlyCorporate]);

  const updateUser = async (id: string, data: any) => {
    try {
      const { error } = await db.from("users").update(data).eq("id", id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await db.from("users").delete().eq("id", id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return { users, isLoading, isMoreLoading, hasMore, loadMore: () => loadUsers(false), refresh: () => loadUsers(true), updateUser, deleteUser };
}
