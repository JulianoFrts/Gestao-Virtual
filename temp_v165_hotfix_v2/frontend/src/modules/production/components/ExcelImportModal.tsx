import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Upload, CheckCircle2, Info } from "lucide-react";
import { orionApi } from "@/integrations/orion/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { read, utils, writeFile } from "xlsx";

interface ExcelImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

const ExcelImportModal = ({
    isOpen,
    onClose,
    projectId,
}: ExcelImportModalProps) => {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    const importMutation = useMutation({
        mutationFn: async (data: any[]) => {
            const formattedData = data.map(row => {
                // ... (formattedData logic remains same)
                const towerNumber = String(row.NumeroTorre || row['Número da Torre'] || row.Torre || "");
                const trecho = String(row.Trecho || row.Subtrecho || "");
                const concreto = parseFloat(row.Concreto || row['Total Concreto'] || row.Concreto_m3 || row['Concreto (m3)'] || 0);
                let armacao = parseFloat(row.PesoArmacao || row['Peso Armação'] || row.PesoArmacao_kg || row.PesoArmacao_ton || row['Peso Armação (kg)'] || 0);
                if (row.PesoArmacao_ton || row['Peso Armação (ton)']) armacao *= 1000;
                const pesoEstrutura = parseFloat(row.PesoEstrutura || row['Peso Estrutura'] || row.PesoEstrutura_ton || row.PesoEstrutura_kg || row['Peso Estrutura (ton)'] || 0);
                const vaoVante = parseFloat(row.VaoVante || row['Vão Vante'] || row.VaoVante_m || row.VaoVante_m_km || row['Vão Vante (m)'] || 0);

                return {
                    project_id: projectId,
                    object_id: towerNumber,
                    trecho: trecho,
                    tower_type: row.TipoTorre || row['Tipo de Torre'] || "Autoportante",
                    tipo_fundacao: row.TipoFundacao || row['Tipo de Fundação'] || "",
                    total_concreto: concreto,
                    peso_armacao: armacao,
                    peso_estrutura: pesoEstrutura,
                    tramo_lancamento: String(row.TramoLancamento || row['Tramo de Lançamento'] || ""),
                    tipificacao_estrutura: String(row.TipificacaoEstrutura || row['Tipificação'] || ""),
                    object_seq: parseInt(row.Sequencia || row['Sequência'] || 0),
                    go_forward: vaoVante,
                    metadata: {
                        tower_type: row.TipoTorre || row['Tipo de Torre'] || "Autoportante",
                        tipo_fundacao: row.TipoFundacao || row['Tipo de Fundação'] || "",
                        total_concreto: concreto,
                        peso_armacao: armacao,
                        peso_estrutura: pesoEstrutura,
                        tramo_lancamento: String(row.TramoLancamento || row['Tramo de Lançamento'] || ""),
                        tipificacao_estrutura: String(row.TipificacaoEstrutura || row['Tipificação'] || ""),
                        go_forward: vaoVante,
                        trecho: trecho,
                        description: `Torre ${towerNumber} do trecho ${trecho}`
                    }
                };
            });

            // --- CHUNKED INSERTION FOR STABILITY ---
            const CHUNK_SIZE = 50;
            const results = [];
            for (let i = 0; i < formattedData.length; i += CHUNK_SIZE) {
                const chunk = formattedData.slice(i, i + CHUNK_SIZE);
                console.log(`[Import] Enviando lote ${Math.floor(i/CHUNK_SIZE) + 1} (${chunk.length} torres)...`);
                
                const { data: result, error } = await orionApi
                    .from('tower_technical_data' as any)
                    .insert(chunk as any);

                if (error) throw error;
                results.push(result);

                // Espera 500ms entre lotes para o servidor respirar
                if (i + CHUNK_SIZE < formattedData.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            return results;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
            toast.success("Torres importadas com sucesso!");

            // Reordering for stability: close modal first, then clear internal state
            onClose();
            setTimeout(() => {
                setFile(null);
                setPreviewData([]);
            }, 100);
        },
        onError: (error: any) => {
            toast.error("Erro na importação: " + (error.response?.data?.message || error.message));
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    const parseExcel = (file: File) => {
        setIsParsing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = utils.sheet_to_json(sheet);
            setPreviewData(json);
            setIsParsing(false);
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const template = [
            {
                Sequencia: 1,
                Trecho: "TR-01",
                NumeroTorre: "0/1",
                VaoVante_m: 450,
                TipoTorre: "Autoportante",
                TipoFundacao: "Grelha",
                Concreto_m3: 15.5,
                PesoArmacao_ton: 1.2,
                PesoEstrutura_ton: 8.5,
                TramoLancamento: "T1",
                TipificacaoEstrutura: "A1"
            }
        ];
        const ws = utils.json_to_sheet(template);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Modelo Importação");
        writeFile(wb, "Modelo_Importacao_Torres.xlsx");
    };

    const handleConfirmImport = () => {
        if (previewData.length > 0) {
            importMutation.mutate(previewData);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Importar Torres via Excel
                    </DialogTitle>
                    <DialogDescription>
                        Faça o upload de uma planilha para importar ou atualizar torres no projeto.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex flex-col gap-2 p-4 border-2 border-dashed rounded-lg bg-muted/30 items-center justify-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                        <Input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Clique ou arraste o arquivo aqui</p>
                        <p className="text-xs text-muted-foreground">Formatos suportados: .xlsx, .xls, .csv</p>
                        {file && (
                            <div className="mt-2 flex items-center gap-2 text-primary font-bold text-sm">
                                <CheckCircle2 className="h-4 w-4" />
                                {file.name}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center bg-primary/5 p-3 rounded-md border border-primary/20">
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Baixe o modelo padrão. O campo **Vão Vante** deve ser informado em **metros**.</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                            <Download className="h-4 w-4" />
                            Baixar Modelo
                        </Button>
                    </div>

                    {isParsing && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2 text-sm">Processando planilha...</span>
                        </div>
                    )}

                    {previewData.length > 0 && !isParsing && (
                        <div className="max-h-[200px] overflow-auto border rounded-md">
                            <table className="w-full text-[10px]">
                                <thead className="bg-muted sticky top-0">
                                    <tr>
                                        {Object.keys(previewData[0]).map(k => <th key={k} className="p-2 border-b text-left">{k}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.slice(0, 5).map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((v: any, j) => <td key={j} className="p-2 border-b">{v}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {previewData.length > 5 && (
                                <p className="text-[10px] text-muted-foreground p-2 text-center">... e mais {previewData.length - 5} linhas</p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                        {previewData.length} torres detectadas na planilha.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={importMutation.isPending}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmImport}
                            disabled={importMutation.isPending || previewData.length === 0}
                            className="gap-2"
                        >
                            {importMutation.isPending ? (
                                <Loader2 key="loader-icon" className="h-4 w-4 animate-spin" />
                            ) : (
                                <Upload key="upload-icon" className="h-4 w-4" />
                            )}
                            Confirmar Importação
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ExcelImportModal;
