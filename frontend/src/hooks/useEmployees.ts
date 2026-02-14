import { useEffect } from 'react';
import { employees as employeesSignal, isLoadingEmployees, fetchEmployees, Employee, employeeFilters, updateEmployeeFilters } from '@/signals/employeeSignals';
import { currentUserSignal } from '@/signals/authSignals';
import { db } from '@/integrations/database';
import { storageService } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { mapDatabaseError, logError } from '@/lib/errorHandler';

export type { Employee };

export interface EmployeeFilters {
  companyId?: string;
  projectId?: string;
  siteId?: string;
  excludeCorporate?: boolean;
}

export function useEmployees(options?: EmployeeFilters) {
  const { toast } = useToast();

  useEffect(() => {
    // Sincronizar filtros locais com o sinal global se fornecidos
    if (options) {
      updateEmployeeFilters({
        companyId: options.companyId || '',
        projectId: options.projectId || '',
        siteId: options.siteId || '',
        excludeCorporate: options.excludeCorporate ?? true
      });
    }

    // Blindagem: Se não tiver usuário, não tenta buscar
    // Isso é consistente com useTeams e previne loops 401
    if (!currentUserSignal.value) {
        // console.log("[useEmployees] Skipped fetch: No user logged in.");
        return;
    }
    
    fetchEmployees();
  }, [options?.companyId, options?.projectId, options?.siteId, options?.excludeCorporate]);

  const createEmployee = async (data: {
    fullName: string;
    registrationNumber: string;
    functionId?: string;
    phone?: string;
    email?: string;
    cpf?: string;
    password?: string;
    siteId?: string;
    companyId?: string;
    projectId?: string;
    level?: number;
    laborType?: string;
    gender?: string;
    birthDate?: string;
    cep?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  }) => {
    const localId = generateId();
    const newEmployee: Employee = {
      id: localId,
      fullName: data.fullName,
      registrationNumber: data.registrationNumber,
      functionId: data.functionId || null,
      phone: data.phone || null,
      email: data.email || null,
      cpf: data.cpf || null,
      role: 'WORKER',
      photoUrl: null,
      isActive: true,
      siteId: data.siteId || null,
      companyId: data.companyId || null,
      projectId: data.projectId || null,
      level: data.level || 0,
      laborType: data.laborType || 'MOD',
      professionalLevel: data.level || 0,
      canLeadTeam: false,
      gender: data.gender || null,
      birthDate: data.birthDate || null,
      cep: data.cep || '',
      street: data.street || '',
      number: data.number || '',
      neighborhood: data.neighborhood || '',
      city: data.city || '',
      state: data.state || '',
      createdAt: new Date(),
    };

    // Optimistically update UI
    employeesSignal.value = [...employeesSignal.value, newEmployee];
    await storageService.setItem('employees', employeesSignal.value);

    const isOnline = navigator.onLine;

    if (isOnline) {
      try {
        const { data: created, error } = await db
          .from('users')
          .insert({
            name: data.fullName,
            registration_number: data.registrationNumber,
            function_id: data.functionId || null,
            phone: data.phone || null,
            email: data.email || null,
            cpf: data.cpf || null,
            password: data.password || null,
            face_descriptor: (newEmployee as any).faceDescriptor || null,
            site_id: data.siteId || null,
            company_id: data.companyId || null,
            project_id: data.projectId || null,
            hierarchy_level: data.level || 0,
            labor_type: data.laborType || 'MOD',
            gender: data.gender || null,
            birth_date: data.birthDate || null,
            status: 'ACTIVE',
            role: 'WORKER' // Default role for field workers
          })
          .select(`*, jobFunction:job_functions(name, level, can_lead_team)`)
          .single();

        if (error) throw error;

        // Insert/Update Address
        if (data.cep || data.street || data.city) {
            await db.from('user_addresses').upsert({
                user_id: created.id,
                cep: data.cep || '',
                logradouro: data.street || '',
                number: data.number || '',
                bairro: data.neighborhood || '',
                localidade: data.city || '',
                uf: data.state || ''
            }, { onConflict: 'user_id' });
        }

        const updatedEmployee = {
          ...newEmployee,
          id: created.id,
          functionName: created.jobFunction?.name || 'Não definida',
        };

        employeesSignal.value = employeesSignal.value.map(e => e.id === localId ? updatedEmployee : e);
        storageService.setItem('employees', employeesSignal.value);

        return { success: true, data: updatedEmployee };
      } catch (error: any) {
        // Se for erro de duplicidade (Unique constraint), não cai no modo offline
        const isConflict = error.message?.includes('P2002') || 
                           error.message?.includes('Unique constraint') ||
                           error.status === 409;

        if (isConflict) {
          console.error('CPF or Registration collision detected:', error);
          employeesSignal.value = employeesSignal.value.filter(e => e.id !== localId);
          const userMessage = mapDatabaseError(error);
          toast({
            title: 'Erro de cadastro',
            description: userMessage || 'CPF ou Matrícula já utilizados.',
            variant: 'destructive',
          });
          return { success: false, error: userMessage };
        }

        console.warn('Online sync failed, falling back to offline mode:', error);

        await storageService.addToSyncQueue({
          operation: 'insert',
          table: 'employees',
          data: { ...data, localId },
        });

        toast({
          title: 'Salvo offline',
          description: 'Funcionário salvo localmente. Será sincronizado quando houver conexão.',
          duration: 3000,
        });

        return { success: true, data: newEmployee, offline: true };
      }
    } else {
      await storageService.addToSyncQueue({
        operation: 'insert',
        table: 'employees',
        data: { ...data, localId },
      });

      toast({
        title: 'Modo Offline',
        description: 'Funcionário salvo localmente.',
        duration: 3000,
      });

      return { success: true, data: newEmployee, offline: true };
    }
  };

  const updateEmployee = async (id: string, data: Partial<Employee>) => {
    const oldEmployees = [...employeesSignal.value];

    employeesSignal.value = employeesSignal.value.map(e =>
      e.id === id ? { ...e, ...data } : e
    );

    if (navigator.onLine) {
      try {
        const updateData: any = {};
        if (data.fullName) updateData.name = data.fullName;
        if (data.registrationNumber) updateData.registration_number = data.registrationNumber;
        if (data.functionId !== undefined) updateData.function_id = data.functionId;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.cpf) updateData.cpf = data.cpf;
        if (data.isActive !== undefined) updateData.status = data.isActive ? 'ACTIVE' : 'INACTIVE';
        if (data.siteId !== undefined) updateData.site_id = data.siteId;
        if (data.companyId !== undefined) updateData.company_id = data.companyId;
        if (data.projectId !== undefined) updateData.project_id = data.projectId;
        if (data.level !== undefined) updateData.hierarchy_level = data.level;
        if (data.laborType !== undefined) updateData.labor_type = data.laborType;
        if ((data as any).gender !== undefined) updateData.gender = (data as any).gender;
        if ((data as any).birthDate !== undefined) updateData.birth_date = (data as any).birthDate;


        const { error } = await db
          .from('users')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        // Update Address
        if (data.cep !== undefined || data.street !== undefined || data.city !== undefined || data.state !== undefined || data.number !== undefined || data.neighborhood !== undefined) {
            await db.from('user_addresses').upsert({
                user_id: id,
                cep: data.cep || '',
                logradouro: data.street || '',
                number: data.number || '',
                bairro: data.neighborhood || '',
                localidade: data.city || '',
                uf: data.state || ''
            }, { onConflict: 'user_id' });
        }

        await storageService.setItem('employees', employeesSignal.value);

        return { success: true };
      } catch (error: any) {
        logError('Employee Update', error);
        employeesSignal.value = oldEmployees;
        const userMessage = mapDatabaseError(error);
        toast({
          title: 'Erro ao atualizar funcionário',
          description: userMessage,
          variant: 'destructive',
        });
        return { success: false, error: userMessage };
      }
    } else {
      await storageService.addToSyncQueue({
        operation: 'update',
        table: 'employees',
        id,
        data,
      });
      await storageService.setItem('employees', employeesSignal.value);
      return { success: true, offline: true };
    }
  };

  const deleteEmployee = async (id: string) => {
    const oldEmployees = [...employeesSignal.value];
    employeesSignal.value = employeesSignal.value.filter(e => e.id !== id);

    if (navigator.onLine) {
      try {
        const { error } = await db
          .from('users')
          .delete()
          .eq('id', id);

        if (error) throw error;

        await storageService.setItem('employees', employeesSignal.value);
        return { success: true };
      } catch (error: any) {
        logError('Employee Delete', error);
        employeesSignal.value = oldEmployees;
        const userMessage = mapDatabaseError(error);
        toast({
          title: 'Erro ao remover funcionário',
          description: userMessage,
          variant: 'destructive',
        });
        return { success: false, error: userMessage };
      }
    } else {
      await storageService.addToSyncQueue({
        operation: 'delete',
        table: 'employees',
        id,
      });
      await storageService.setItem('employees', employeesSignal.value);
      return { success: true, offline: true };
    }
  };

  const deleteMultipleEmployees = async (ids: string[]) => {
    const oldEmployees = [...employeesSignal.value];
    employeesSignal.value = employeesSignal.value.filter(e => !ids.includes(e.id));

    if (navigator.onLine) {
      try {
        const { error } = await db
          .from('users')
          .delete()
          .in('id', ids);

        if (error) throw error;

        storageService.setItem('employees', employeesSignal.value);
        return { success: true };
      } catch (error: any) {
        logError('Employees Bulk Delete', error);
        employeesSignal.value = oldEmployees;
        const userMessage = mapDatabaseError(error);
        toast({
          title: 'Erro ao remover funcionários',
          description: userMessage,
          variant: 'destructive',
        });
        return { success: false, error: userMessage };
      }
    } else {
      for (const id of ids) {
        await storageService.addToSyncQueue({
          operation: 'delete',
          table: 'employees',
          id,
        });
      }
      await storageService.setItem('employees', employeesSignal.value);
      return { success: true, offline: true };
    }
  };

  return {
    employees: employeesSignal.value,
    isLoading: isLoadingEmployees.value,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    deleteMultipleEmployees,
    refresh: () => fetchEmployees(true),
  };
}


