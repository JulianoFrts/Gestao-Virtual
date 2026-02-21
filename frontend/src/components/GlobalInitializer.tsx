import React, { useEffect, useRef } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useTeams } from '@/hooks/useTeams';
import { fetchEmployees } from '@/signals/employeeSignals';
import { useSignals } from "@preact/signals-react/runtime";
import {
    hasUsersFetchedSignal,
    hasTeamsFetchedSignal,
    hasGlobalDataFetchedSignal,
    has3dFetchedSignal,
    hasReportsFetchedSignal
} from '@/signals/syncSignals';
import { fetchGlobalData } from '@/signals/globalDataSignals';
import { ParallelLoader } from '@/lib/async/ParallelLoader';
import { fetchSystemMessages, hasSystemMessagesFetchedSignal } from '@/signals/monitoringSignals';
import { fetchTimeRecords, hasTimeRecordsFetchedSignal } from '@/signals/timeSignals';
import { fetchWorkStages, hasWorkStagesFetchedSignal } from '@/signals/workStageSignals';
import { fetchAuditLogs } from '@/signals/auditSignals';
import {
    loaderConcurrencySignal,
    activeTaskIdsSignal,
    pendingTaskIdsSignal
} from '@/signals/loaderSignals';
import {
    hasEmployeesFetchedSignal,
    hasAuditFetchedSignal,
    hasCostsFetchedSignal
} from '@/signals/syncSignals';
import { fetchProductionData } from '@/signals/productionSignals';
import { useDailyReports, DailyReportStatus } from '@/hooks/useDailyReports';
import { kpiService } from '@/services/kpiService';
import { orionApi } from '@/integrations/orion/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

/**
 * GlobalInitializer
 * Orquestra o carregamento inicial usando ParallelLoader (4 workers).
 */
export const GlobalInitializer = () => {
    useSignals();

    // Hooks que retornam funções de refresh
    const { reports, refresh: refreshReports } = useDailyReports();
    const { refresh: refreshUsers } = useUsers();
    const { refresh: refreshTeams } = useTeams();
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    const loaderRef = useRef<ParallelLoader | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        console.log("[GlobalInitializer] Mounted.");

        if (initializedRef.current) return;
        initializedRef.current = true;

        const initLoader = async () => {
            console.log(`[GlobalInitializer] Iniciando ParallelLoader (Limite: ${loaderConcurrencySignal.value})...`);

            // Importar dinamicamente db para evitar carregamento precoce se necessário
            const { db } = await import("@/integrations/database");

            const loader = new ParallelLoader(loaderConcurrencySignal);
            loaderRef.current = loader;

            // Rastreamento de Estado
            loader.onTaskStateChange((id, status) => {
                if (status === 'running') {
                    activeTaskIdsSignal.value = [...activeTaskIdsSignal.value, id];
                    pendingTaskIdsSignal.value = pendingTaskIdsSignal.value.filter(pid => pid !== id);
                } else if (status === 'completed' || status === 'failed') {
                    activeTaskIdsSignal.value = activeTaskIdsSignal.value.filter(aid => aid !== id);
                } else if (status === 'pending') {
                    if (!pendingTaskIdsSignal.value.includes(id)) {
                        pendingTaskIdsSignal.value = [...pendingTaskIdsSignal.value, id];
                    }
                }
            });

            loader.onProgress((completed, total, task) => {
                console.log(`[Loader] Progress: ${completed}/${total} (Completed: ${task})`);
            });

            // --- NÍVEL 1: IDENTIDADE E BASE (100-90) ---
            loader.add({
                id: 'users',
                label: 'Usuários e Acessos',
                action: async () => { await refreshUsers(true); },
                priority: 100
            });

            loader.add({
                id: 'projects',
                label: 'Obras e Projetos',
                action: async () => { await fetchGlobalData(true); },
                priority: 95
            });

            loader.add({
                id: 'functions',
                label: 'Funções e Cargos',
                action: async () => {
                    // Job functions já carregadas via fetchGlobalData no orionApi em alguns casos, 
                    // mas garantimos aqui se necessário.
                    const { data } = await orionApi.get('/production/categories'); // Exemplo de categorias
                    const { data: jobFuncs } = await db.from('job_functions').select('*');
                    // hasGlobalDataFetchedSignal cobrirá isso
                },
                priority: 90
            });

            // --- NÍVEL 2: ESTRUTURA ORGANIZACIONAL (80-70) ---
            loader.add({
                id: 'employees',
                label: 'Funcionários',
                action: async () => {
                    await fetchEmployees(true);
                    hasEmployeesFetchedSignal.value = true;
                },
                priority: 80
            });

            loader.add({
                id: 'teams',
                label: 'Equipes e Lideranças',
                action: async () => { await refreshTeams(); },
                priority: 75,
                dependencies: ['users', 'employees']
            });

            loader.add({
                id: 'reports',
                label: 'Relatórios Diários (RDO)',
                action: async () => {
                    // Trigger inicial de cache se necessário
                    hasReportsFetchedSignal.value = true;
                },
                priority: 70,
                dependencies: ['teams']
            });


            // --- NÍVEL 3: PRODUÇÃO E OPERAÇÃO (60-40) ---
            loader.add({
                id: 'workStages',
                label: 'Etapas de Obra',
                action: async () => { await fetchWorkStages(true); },
                priority: 60,
                dependencies: ['projects']
            });

            loader.add({
                id: 'production',
                label: 'Dados de Produção',
                action: async () => { await fetchProductionData(true); },
                priority: 55,
                dependencies: ['projects', 'workStages']
            });

            loader.add({
                id: 'timeRecords',
                label: 'Ponto Eletrônico',
                action: async () => { await fetchTimeRecords(true); },
                priority: 50
            });

            loader.add({
                id: 'costs',
                label: 'Gestão de Custos',
                action: async () => {
                    // Trigger calc ou warming de custos
                    await kpiService.getUnitCosts('all');
                    hasCostsFetchedSignal.value = true;
                },
                priority: 40,
                dependencies: ['production']
            });

            // --- NÍVEL 4: SUPORTE E VISUAL (30-10) ---
            loader.add({
                id: 'audit',
                label: 'Logs de Auditoria',
                action: async () => {
                    await fetchAuditLogs(); // Inicia stream em background
                    hasAuditFetchedSignal.value = true;
                },
                priority: 100
            });


            loader.add({
                id: 'viewer3d',
                label: 'Engenharia 3D',
                action: async () => {
                    has3dFetchedSignal.value = true;
                },
                priority: 95
            });


            loader.add({
                id: 'messages',
                label: 'Mensagens do Sistema',
                action: async () => { await fetchSystemMessages(true); },
                priority: 10
            });

            // Harmonização Final
            loader.add({
                id: 'harmonization',
                label: 'Finalizando...',
                action: async () => {
                    // Removido delay de 300ms
                },
                priority: 1,
                dependencies: ['users', 'projects', 'teams', 'employees', 'production', 'viewer3d', 'reports', 'messages', 'timeRecords', 'workStages', 'costs', 'audit']
            });


            loader.start();
        };

        initLoader();

        // Safety Timeout (Aumentado para 25s para acomodar delays)
        const timer = setTimeout(() => {
            const notReady =
                !hasUsersFetchedSignal.value ||
                !hasTeamsFetchedSignal.value ||
                !hasGlobalDataFetchedSignal.value;

            if (notReady) {
                console.warn("[GlobalInitializer] Tempo limite excedido. Forçando renderização da UI.");
                hasUsersFetchedSignal.value = true;
                hasTeamsFetchedSignal.value = true;
                hasGlobalDataFetchedSignal.value = true;
                has3dFetchedSignal.value = true;
                hasReportsFetchedSignal.value = true;
                hasSystemMessagesFetchedSignal.value = true;
                hasTimeRecordsFetchedSignal.value = true;
                hasWorkStagesFetchedSignal.value = true;
            }
        }, 25000);

        return () => clearTimeout(timer);
    }, []); // Dependência vazia para orquestrar apenas uma vez no "ciclo de vida logado"

    // Background checker for returned reports
    useEffect(() => {
        if (!user || !reports.length) return;

        const returnedReports = reports.filter(r => 
            (r.employeeId === user.id || (r as any).userId === user.id) && 
            r.status === DailyReportStatus.RETURNED
        );

        if (returnedReports.length > 0) {
            const notifiedKey = `notified_returned_${user.id}`;
            const notifiedIds = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
            
            const newReturned = returnedReports.filter(r => !notifiedIds.includes(r.id));

            if (newReturned.length > 0) {
                toast({
                    title: "Relatório Devolvido",
                    description: `Você tem ${newReturned.length} relatório(s) que precisam de correção.`,
                    variant: "destructive",
                    action: (
                        <button 
                            onClick={() => navigate('/rdo/history')}
                            className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all"
                        >
                            Ver Agora
                        </button>
                    ),
                });

                // Mark current returned reports as notified
                const allReturnedIds = returnedReports.map(r => r.id);
                localStorage.setItem(notifiedKey, JSON.stringify(allReturnedIds));
            }
        }
    }, [user, reports, toast, navigate]);


    return null;
};
