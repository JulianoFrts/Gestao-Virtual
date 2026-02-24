import React, { useState, useEffect, useCallback } from "react";
import { db as localApi } from "@/integrations/database";
import { useToast } from "@/hooks/use-toast";
import { mapDatabaseError, logError } from "@/lib/errorHandler";
import { canManageUser, UserScope } from "@/utils/permissionHelpers";
import { useAuth } from "@/contexts/AuthContext";
import { storageService } from "@/services/storageService";
import {
  isUsersLoadingSignal,
  hasUsersFetchedSignal,
} from "@/signals/syncSignals";

export interface SystemUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  registrationNumber: string | null;
  cpf?: string | null;
  companyId: string | null;
  projectId: string | null;
  siteId: string | null;
  isBlocked: boolean;
  status?: string;
  createdAt: string;
  isSystemAdmin?: boolean;
  userRole?: {
    role: string;
  } | null;
  image?: string | null;
  phone?: string | null;
  // Address Fields
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;

  // Personal & Affiliation Fields
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate?: string | null;
  laborType?: string | null;
  iapName?: string | null;
  functionId?: string | null;
  jobFunction?: { id: string; name: string } | null;
  permissions?: string[] | null;
}

export interface UserFilters {
  companyId?: string;
  projectId?: string;
  siteId?: string;
  search?: string;
  onlyCorporate?: boolean;
  excludeCorporate?: boolean;
  global?: boolean;
}

export interface UserUpdateDTO {
  fullName?: string;
  email?: string;
  password?: string;
  role?: string;
  cpf?: string | null;
  registrationNumber?: string | null;
  companyId?: string | null;
  projectId?: string | null;
  siteId?: string | null;
  isSystemAdmin?: boolean;
  permissions?: string[];
  isBlocked?: boolean;
  status?: string;
  image?: string | null;
  phone?: string | null;
  // Address
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  // Personal
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate?: string | null;
  laborType?: string | null;
  iapName?: string | null;
  functionId?: string | null;
  // Access
}

export function useUsers(filters?: UserFilters) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { profile: currentProfile } = useAuth();

  const profileId = currentProfile?.id;
  const companyIdFilter = filters?.companyId;
  const projectIdFilter = filters?.projectId;
  const siteIdFilter = filters?.siteId;
  const searchFilter = filters?.search;
  const onlyCorporateFilter = filters?.onlyCorporate;
  const excludeCorporateFilter = filters?.excludeCorporate;
  const globalFilter = filters?.global;
  const hasInitialFetched = React.useRef(false);
  const previousFiltersRef = React.useRef<string>("");

  const loadUsers = useCallback(
    async (force = false) => {
      if (!profileId) return;

      // Cria uma string única para comparar filtros
      const currentFilters = JSON.stringify({
        search: searchFilter,
        companyId: companyIdFilter,
        projectId: projectIdFilter,
        siteId: siteIdFilter,
        onlyCorporate: onlyCorporateFilter,
        excludeCorporate: excludeCorporateFilter,
        global: globalFilter,
      });

      // Sempre refaz a busca se os filtros mudaram
      const filtersChanged = previousFiltersRef.current !== currentFilters;

      if (hasInitialFetched.current && !force && !filtersChanged) return;

      previousFiltersRef.current = currentFilters;
      setIsLoading(true);
      if (!hasInitialFetched.current) isUsersLoadingSignal.value = true;
      hasInitialFetched.current = true;
      try {
        // Fetch profiles from Local API with a higher limit for management view
        let query = localApi
          .from("users")
          .select(
            "id, name, email, role, phone, image, registrationNumber, cpf, createdAt, companyId, projectId, siteId, status, isSystemAdmin, hierarchyLevel, userRole(role), iap_name, address, functionId, jobFunction(id, name)",
          );

        // IMPORTANT: Search must be sent to API for global search in backend
        if (searchFilter && searchFilter.trim().length > 0) {
          query = query.eq("search", searchFilter.trim());
        }
        if (!globalFilter) {
          if (companyIdFilter) query = query.eq("companyId", companyIdFilter);
          if (projectIdFilter) query = query.eq("projectId", projectIdFilter);
          if (siteIdFilter) query = query.eq("siteId", siteIdFilter);
        }
        if (onlyCorporateFilter) query = query.eq("onlyCorporate", true);
        if (excludeCorporateFilter) query = query.eq("excludeCorporate", true);

        if (!navigator.onLine) {
          const cached = await storageService.getItem<SystemUser[]>("system_users");
          if (cached) {
            setUsers(cached);
            setIsLoading(false);
            isUsersLoadingSignal.value = false;
            hasUsersFetchedSignal.value = true;
            return;
          }
        }

        const { data, error } = await query;

        if (error) throw error;

        const mapped = (data || []).map((p) => {
          const auth = p.authCredential || {};
          const affil = p.affiliation || {};
          const rawEmail = (p.email as string) || (auth.email as string) || "";
          
          const name =
            (p.name as string) ||
            (p.fullName as string) ||
            rawEmail.split("@")[0] ||
            "Usuário";
          const addr = p.address ? (p.address as any) : {};

          return {
            id: p.id,
            fullName: name,
            email: rawEmail,
            registrationNumber: p.registrationNumber,
            createdAt: p.createdAt,
            role: ((auth.role as string) || (p.role as string) || "WORKER").toUpperCase(),
            phone: p.phone,
            companyId: affil.companyId || p.companyId,
            projectId: affil.projectId || p.projectId,
            siteId: affil.siteId || p.siteId,
            isBlocked:
              (auth.status || p.status || p.isBlocked) === "SUSPENDED" ||
              (auth.status || p.status || p.isBlocked) === "INACTIVE" ||
              p.isBlocked === true,
            status: auth.status || p.status,
            isSystemAdmin: p.isSystemAdmin || false,
            hierarchyLevel: p.hierarchyLevel,
            userRole: p.userRole,
            image: p.image,
            zipCode: addr?.cep,
            street: addr?.logradouro || addr?.street,
            number: addr?.number,
            neighborhood: addr?.bairro || addr?.neighborhood,
            city: addr?.localidade || addr?.city,
            state: addr?.uf || addr?.state || addr?.stateCode,
            gender: p.gender as any,
            birthDate: p.birthDate,
            laborType: p.laborType,
            iapName: p.iapName,
            functionId: p.functionId,
            jobFunction: p.jobFunction,
          };
        });

        setUsers(mapped as SystemUser[]);
        await storageService.setItem("system_users", mapped);
      } catch (error: unknown) {
        console.warn("[useUsers] Network error, checking local cache...");
        const cached = await storageService.getItem<SystemUser[]>("system_users");
        if (cached) {
          setUsers(cached);
        } else {
          logError("Users Load", error);
          const userMessage = mapDatabaseError(error);
          toast({
            title: "Erro ao carregar usuários",
            description: userMessage,
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
        isUsersLoadingSignal.value = false;
        hasUsersFetchedSignal.value = true;
      }
    },
    [
      profileId,
      toast,
      companyIdFilter,
      projectIdFilter,
      siteIdFilter,
      searchFilter,
      onlyCorporateFilter,
      excludeCorporateFilter,
      globalFilter,
    ],
  );

  useEffect(() => {
    if (profileId) {
      loadUsers();
    }
  }, [profileId, loadUsers]);

  const createUser = async (
    email: string,
    password: string,
    name: string,
    role: string,
    companyId?: string,
    projectId?: string,
    siteId?: string,
    registrationNumber?: string,
    image?: string,
    // Novos campos pessoais
    cpf?: string,
    // Address
    zipCode?: string,
    street?: string,
    number?: string,
    neighborhood?: string,
    city?: string,
    state?: string,
    // Personal
    gender?: "MALE" | "FEMALE" | "OTHER" | "",
    birthDate?: string,
    phone?: string,
    // Affiliation
    laborType?: string,
    iapName?: string,
    functionId?: string,
  ) => {
    try {
      if (password.length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres.");
      }

      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail)) {
        throw new Error("O formato do e-mail parece inválido.");
      }

      // Usar endpoint de cadastro do backend local
      const { data, error } = await localApi.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            name,
            role: role.toUpperCase(),
            companyId: companyId || null,
            projectId: projectId || null,
            siteId: siteId || null,
            registrationNumber: registrationNumber || null,
            image: image || null,
            cpf: cpf || null,
            phone: phone || null,
          },
        },
      });

      if (error) throw error;

      if (data?.user) {
        // Update specific DB fields that might not be in auth metadata sync
        const { error: updateError } = await localApi
          .from("users")
          .update({
            gender: gender || null,
            birth_date: birthDate || null,
            labor_type: laborType || null,
            iap_name: iapName || null,
            functionId: functionId || null,
          })
          .eq("id", data.user.id);

        // Insert Address
        if (zipCode || street || state) {
          const { error: addrError } = await localApi
            .from("user_addresses")
            .insert({
              user_id: data.user.id,
              cep: zipCode || "",
              logradouro: street || "",
              number: number || "",
              bairro: neighborhood || "",
              localidade: city || "",
              uf: state || "", // assuming state arg is UF code
              estado: "", // Optional or derive?
            });
          if (addrError) console.error("Error creating address", addrError);
        }

        if (updateError) {
          console.error("Error updating profile details", updateError);
          // Don't fail the whole creation, just log
        }

        toast({
          title: "Usuário criado",
          description: "A nova conta foi cadastrada com sucesso.",
        });
        loadUsers();
        return { success: true, userId: data.user.id };
      }
      return { success: false, error: "Erro desconhecido na criação" };
    } catch (error: unknown) {
      logError("User Create", error);
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      return { success: false, error: message };
    }
  };

  const updateUser = async (
    userId: string,
    updates: UserUpdateDTO,
    targetUserOverride?: SystemUser | null,
  ) => {
    const isSelfUpdate = currentProfile?.id === userId;
    const targetUserFromList = users.find((u) => u.id === userId);
    const targetUser =
      targetUserOverride ||
      targetUserFromList ||
      (isSelfUpdate ? currentProfile : null);

    if (!currentProfile || !targetUser) {
      return { success: false, error: "Usuário não encontrado." };
    }

    if (
      !isSelfUpdate &&
      !canManageUser(currentProfile as UserScope, targetUser as UserScope)
    ) {
      return {
        success: false,
        error: "Você não tem permissão para editar este usuário.",
      };
    }

    try {
      const profileUpdates: Record<string, unknown> = { id: userId };
      if (updates.fullName !== undefined)
        profileUpdates.name = updates.fullName;
      if (updates.email !== undefined) profileUpdates.email = updates.email;
      if (updates.role !== undefined)
        profileUpdates.role = updates.role.toUpperCase();
      if (updates.permissions !== undefined)
        profileUpdates.permissions = updates.permissions;
      if (updates.cpf !== undefined) profileUpdates.cpf = updates.cpf;
      if (updates.companyId !== undefined)
        profileUpdates.companyId = updates.companyId;
      if (updates.projectId !== undefined)
        profileUpdates.projectId = updates.projectId;
      if (updates.siteId !== undefined) profileUpdates.siteId = updates.siteId;
      if (updates.registrationNumber !== undefined)
        profileUpdates.registrationNumber = updates.registrationNumber;
      if (updates.isBlocked !== undefined) {
        profileUpdates.status = updates.isBlocked ? "SUSPENDED" : "ACTIVE";
      }
      if (updates.status !== undefined) profileUpdates.status = updates.status;
      if (updates.image !== undefined) profileUpdates.image = updates.image;
      if (updates.phone !== undefined) profileUpdates.phone = updates.phone;

      if (updates.gender !== undefined) profileUpdates.gender = updates.gender;
      if (updates.birthDate !== undefined)
        profileUpdates.birthDate = updates.birthDate;
      if (updates.laborType !== undefined)
        profileUpdates.laborType = updates.laborType;
      if (updates.iapName !== undefined)
        profileUpdates.iapName = updates.iapName;
      if (updates.functionId !== undefined)
        profileUpdates.functionId = updates.functionId;

      // Novos campos de endereço (Mapear para camelCase conforme esperado pelo updateUserSchema)
      if (updates.zipCode !== undefined)
        profileUpdates.zipCode = updates.zipCode;
      if (updates.street !== undefined) profileUpdates.street = updates.street;
      if (updates.number !== undefined) profileUpdates.number = updates.number;
      if (updates.neighborhood !== undefined)
        profileUpdates.neighborhood = updates.neighborhood;
      if (updates.city !== undefined) profileUpdates.city = updates.city;
      if (updates.city !== undefined) profileUpdates.city = updates.city;
      if (updates.state !== undefined) profileUpdates.state = updates.state;
      if (updates.isSystemAdmin !== undefined)
        profileUpdates.isSystemAdmin = updates.isSystemAdmin;

      const response = await localApi
        .from("users")
        .update(profileUpdates)
        .eq("id", userId);

      const { data, error } = response as any;
      if (error) throw error;

      const addressSaved = true; // Mantido para compatibilidade com o retorno abaixo

      if (data?._partial || !addressSaved) {
        const failed = data?._report?.failed || [];
        const fieldNamesMap: Record<string, string> = {
          cpf: "CPF",
          email: "E-mail",
          phone: "Telefone",
          birthDate: "Data de Nascimento",
          gender: "Gênero",
          laborType: "Tipo de Mão de Obra",
          iapName: "IAP",
        };

        const failedList = failed.map(
          (f: any) => fieldNamesMap[f.field] || f.field,
        );
        if (!addressSaved) failedList.push("Endereço");

        toast({
          title: "Atenção: Salvamento Parcial",
          description: `Os seguintes campos não puderam ser salvos: ${failedList.join(", ")}. O restante foi atualizado.`,
          variant: "destructive", // Usando destructive para chamar atenção, ou 'warning' se disponível
        });
      } else {
        toast({
          title: "Usuário atualizado",
          description: "Todos os dados foram salvos com sucesso.",
        });
      }

      // Atualização Granular: Atualizar o estado local sem recarregar tudo
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            // Mesclar atualizações com o usuário atual
            const updatedUser = { ...u };
            if (updates.fullName !== undefined)
              updatedUser.fullName = updates.fullName;
            if (updates.email !== undefined) updatedUser.email = updates.email;
            if (updates.role !== undefined)
              updatedUser.role = updates.role.toUpperCase();
            if (updates.companyId !== undefined)
              updatedUser.companyId = updates.companyId;
            if (updates.projectId !== undefined)
              updatedUser.projectId = updates.projectId;
            if (updates.siteId !== undefined)
              updatedUser.siteId = updates.siteId;
            if (updates.registrationNumber !== undefined)
              updatedUser.registrationNumber = updates.registrationNumber;
            if (updates.isBlocked !== undefined)
              updatedUser.isBlocked = updates.isBlocked;
            if (updates.status !== undefined)
              updatedUser.status = updates.status;
            if (updates.image !== undefined) updatedUser.image = updates.image;
            if (updates.phone !== undefined) updatedUser.phone = updates.phone;
            if (updates.gender !== undefined)
              updatedUser.gender = updates.gender;
            if (updates.birthDate !== undefined)
              updatedUser.birthDate = updates.birthDate;
            if (updates.laborType !== undefined)
              updatedUser.laborType = updates.laborType;
            if (updates.iapName !== undefined)
              updatedUser.iapName = updates.iapName;
            if (updates.functionId !== undefined)
              updatedUser.functionId = updates.functionId;
            if (updates.zipCode !== undefined)
              updatedUser.zipCode = updates.zipCode;
            if (updates.street !== undefined)
              updatedUser.street = updates.street;
            if (updates.number !== undefined)
              updatedUser.number = updates.number;
            if (updates.neighborhood !== undefined)
              updatedUser.neighborhood = updates.neighborhood;
            if (updates.city !== undefined) updatedUser.city = updates.city;
            if (updates.state !== undefined) updatedUser.state = updates.state;

            return updatedUser;
          }
          return u;
        }),
      );

      return { success: true, partial: data?._partial || !addressSaved };
    } catch (error: unknown) {
      logError("Update User", error);
      const err = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: mapDatabaseError(err) };
    }
  };

  const deleteUser = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (
      !currentProfile ||
      !targetUser ||
      !canManageUser(currentProfile, targetUser)
    ) {
      return {
        success: false,
        error: "Você não tem permissão para excluir este usuário.",
      };
    }
    try {
      // Em modo local, o delete do QueryBuilder já remove corretamente
      const { error } = await localApi.from("users").delete().eq("id", userId);
      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast({
        title: "Usuário excluído",
        description: "A conta foi removida permanentemente.",
      });
      return { success: true };
    } catch (error: unknown) {
      logError("User Delete", error);
      return { success: false, error: mapDatabaseError(error) };
    }
  };

  const adminChangePassword = async (userId: string, newPassword: string) => {
    try {
      const { error } = await localApi
        .from("users")
        .update({
          id: userId,
          password: newPassword,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "A senha do usuário foi atualizada com sucesso.",
      });
      return { success: true };
    } catch (error: unknown) {
      logError("Admin Change Password", error);
      const message =
        error instanceof Error ? error.message : "Erro ao alterar senha";
      return { success: false, error: message };
    }
  };

  const adminToggleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      const { error } = await localApi
        .from("users")
        .update({
          id: userId,
          status: isBlocked ? "SUSPENDED" : "ACTIVE",
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: isBlocked ? "Usuário bloqueado" : "Usuário desbloqueado",
        description: isBlocked
          ? "O usuário não poderá mais acessar o sistema."
          : "O acesso do usuário foi restaurado.",
      });

      // Atualização Granular: Atualizar o status no estado local
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, isBlocked, status: isBlocked ? "SUSPENDED" : "ACTIVE" }
            : u,
        ),
      );

      return { success: true };
    } catch (error: unknown) {
      logError("Admin Toggle Block", error);
      const message =
        error instanceof Error ? error.message : "Erro ao mudar status";
      return { success: false, error: message };
    }
  };

  const resetUserPassword = async (email: string) => {
    try {
      const { error } = await localApi.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      logError("Password Reset", error);
      return { success: false, error: mapDatabaseError(error) };
    }
  };

  return {
    users,
    isLoading,
    updateUser,
    createUser,
    deleteUser,
    adminChangePassword,
    adminToggleBlock,
    resetUserPassword,
    refresh: loadUsers,
  };
}
