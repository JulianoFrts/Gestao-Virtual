import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/database';
import { useToast } from '@/hooks/use-toast';

export interface ConstructionDocument {
    id: string;
    projectId: string;
    siteId: string | null;
    companyId: string | null;
    name: string;
    docType: 'contract' | 'project' | 'safety' | 'report' | 'quality' | 'folder' | 'other';
    version: number;
    fileUrl: string;
    folderPath: string;
    status: 'valid' | 'expired' | 'archived' | 'superseded' | 'pending' | 'rejected' | 'active';
    createdBy: string;
    metadata: any;
    fileSize: number;
    createdAt: Date;
    updatedAt: Date;
}

export function useConstructionDocuments(projectId?: string, siteId?: string, companyId?: string) {
    const [documents, setDocuments] = useState<ConstructionDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            let docs: any[] = [];
            
            // Definição de filtros comuns
            const applyCommonFilters = (q: any) => {
                let filtered = q;
                if (siteId && siteId !== 'all_sites') filtered = filtered.eq('site_id', siteId);
                if (companyId) filtered = filtered.eq('company_id', companyId);
                return filtered.order('name', { ascending: true });
            };

            if (projectId) {
                // Como o cliente API não suporta .or(), fazemos duas chamadas em paralelo
                const queryProject = applyCommonFilters(
                    db.from('construction_documents' as any).select('*').eq('project_id', projectId)
                );
                
                const queryGlobal = applyCommonFilters(
                    db.from('construction_documents' as any).select('*').is('project_id', null)
                );

                const [resProject, resGlobal] = await Promise.all([queryProject, queryGlobal]);
                
                if (resProject.error) throw resProject.error;
                if (resGlobal.error) throw resGlobal.error;

                // Combinar e evitar duplicatas (embora logicamente não deva haver interseção)
                docs = [...(resProject.data || []), ...(resGlobal.data || [])];
                
                // Ordenar novamente o resultado combinado
                docs.sort((a, b) => a.name.localeCompare(b.name));
            } else {
                // Apenas global
                const query = applyCommonFilters(
                    db.from('construction_documents' as any).select('*').is('project_id', null)
                );
                
                const { data, error } = await query;
                if (error) throw error;
                docs = data || [];
            }

            const mapped: ConstructionDocument[] = docs.map((d: any) => ({
                id: d.id,
                projectId: d.project_id,
                siteId: d.site_id,
                companyId: d.company_id,
                name: d.name,
                docType: d.doc_type,
                version: d.version,
                fileUrl: d.file_url || '',
                folderPath: d.folder_path || '/',
                status: d.status,
                createdBy: d.created_by,
                metadata: d.metadata,
                fileSize: d.file_size || 0,
                createdAt: d.created_at ? new Date(d.created_at) : new Date(),
                updatedAt: d.updated_at ? new Date(d.updated_at) : new Date()
            }));

            setDocuments(mapped);
        } catch (error: any) {
            console.error('Error loading documents:', error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, siteId]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const uploadDocument = async (file: File, d: Partial<ConstructionDocument>) => {
        try {
            // 1. Upload file to storage (assuming a 'documents' bucket exists)
            const sanitizedName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath = `${d.projectId || 'global'}/${Date.now()}_${sanitizedName}`;
            const { data: uploadData, error: uploadError } = await db.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Register document in table
            const { data: insertData, error: insertError } = await db
                .from('construction_documents' as any)
                .insert({
                    project_id: d.projectId,
                    site_id: d.siteId,
                    company_id: d.companyId,
                    name: d.name || file.name,
                    doc_type: d.docType || 'report',
                    version: d.version || 1,
                    file_url: filePath,
                    folder_path: d.folderPath || '/',
                    status: d.status || 'pending',
                    file_size: file.size,
                    metadata: d.metadata || {}
                })
                .select()
                .single();

            if (insertError) throw insertError;

            toast({ title: "Documento enviado", description: "O arquivo foi registrado com sucesso." });
            loadDocuments();
            return { success: true, data: insertData };
        } catch (error: any) {
            toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
            return { success: false, error: error.message };
        }
    };

    const updateDocument = async (id: string, updates: Partial<ConstructionDocument>) => {
        try {
            const { error } = await db
                .from('construction_documents' as any)
                .update({
                    name: updates.name,
                    status: updates.status,
                    doc_type: updates.docType,
                    version: updates.version,
                    folder_path: updates.folderPath,
                    metadata: updates.metadata,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            toast({ title: "Documento atualizado", description: "As alterações foram salvas com sucesso." });
            loadDocuments();
            return { success: true };
        } catch (error: any) {
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
            return { success: false, error: error.message };
        }
    };

    const downloadDocument = async (doc: ConstructionDocument) => {
        try {
            const { data, error } = await db.storage
                .from('documents')
                .download(doc.fileUrl);

            if (error) throw error;

            // Create a link and trigger download
            const url = window.URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;

            // Ensure the name has the correct extension for the storage content
            link.setAttribute('download', doc.name);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast({ title: "Download iniciado", description: `O arquivo ${doc.name} está sendo baixado.` });
        } catch (error: any) {
            toast({ title: "Erro no download", description: error.message, variant: "destructive" });
        }
    };

    const previewDocument = async (doc: ConstructionDocument) => {
        try {
            const { data, error } = await db.storage
                .from('documents')
                .createSignedUrl(doc.fileUrl, 300); // 5 minutes

            if (error) throw error;

            window.open(data.signedUrl, '_blank');
        } catch (error: any) {
            toast({ title: "Erro ao visualizar", description: error.message, variant: "destructive" });
        }
    };

    const createFolder = async (name: string, folderPath: string = '/') => {
        try {
            const { data, error } = await db
                .from('construction_documents' as any)
                .insert({
                    project_id: projectId || undefined, // Ensure no nulls are sent to Zod optional fields
                    site_id: siteId || undefined,
                    name: name,
                    doc_type: 'folder',
                    version: 1,
                    file_url: 'file://folder', 
                    folder_path: folderPath,
                    status: 'valid',
                    metadata: { type: 'folder' }
                })
                .select()
                .single();

            if (error) throw error;

            const raw = data as any;

            // Map raw response to proper ConstructionDocument interface
            const newFolder: ConstructionDocument = {
                id: raw.id,
                projectId: raw.project_id,
                siteId: raw.site_id,
                companyId: raw.company_id,
                name: raw.name,
                docType: raw.doc_type,
                version: raw.version,
                fileUrl: raw.file_url,
                folderPath: raw.folder_path || '/',
                status: raw.status,
                createdBy: raw.created_by,
                metadata: raw.metadata,
                fileSize: raw.file_size || 0,
                createdAt: new Date(raw.created_at),
                updatedAt: new Date(raw.updated_at)
            };

            toast({ title: "Pasta criada", description: `A pasta "${name}" foi criada com sucesso.` });
            loadDocuments();
            return { success: true, data: newFolder };
        } catch (error: any) {
            toast({ title: "Erro ao criar pasta", description: error.message, variant: "destructive" });
            return { success: false, error: error.message };
        }
    };

    const deleteDocument = async (id: string, storagePath?: string) => {
        try {
            const { error: tableError } = await db
                .from('construction_documents' as any)
                .delete()
                .eq('id', id);

            if (tableError) throw tableError;

            if (storagePath && !storagePath.includes('folder')) {
                await db.storage.from('documents').remove([storagePath]);
            }

            toast({ title: "Excluído", description: "Item removido com sucesso." });
            loadDocuments();
            return { success: true };
        } catch (error: any) {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
            return { success: false, error: error.message };
        }
    };

    return {
        documents,
        isLoading,
        uploadDocument,
        updateDocument,
        downloadDocument,
        previewDocument, // Added
        createFolder,
        deleteDocument,
        refresh: loadDocuments
    };
}


