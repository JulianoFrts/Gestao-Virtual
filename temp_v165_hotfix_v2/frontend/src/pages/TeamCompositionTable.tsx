'use client'

import * as React from 'react'
import { useTeams } from '@/hooks/useTeams'
import { useEmployees } from '@/hooks/useEmployees'
import { useSites } from '@/hooks/useSites'
import { useProjects } from '@/hooks/useProjects'
import { useCompanies } from '@/hooks/useCompanies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Loader2,
  Target,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  XCircle
} from 'lucide-react'

import { useSignals } from '@preact/signals-react/runtime'

export default function TeamCompositionTable() {
  useSignals()
  const { teams, isLoading: loadingTeams } = useTeams()
  const { employees, isLoading: loadingEmployees } = useEmployees()
  const { sites } = useSites()
  const { projects } = useProjects()
  const { companies } = useCompanies()

  const [selectedCompany, setSelectedCompany] = React.useState<string>('all')
  const [selectedProject, setSelectedProject] = React.useState<string>('all')
  const [selectedSite, setSelectedSite] = React.useState<string>('all')

  const isLoading = loadingTeams || loadingEmployees

  // Filter employees based on selections
  const filteredEmployees = React.useMemo(() => {
    return employees
      .filter(emp => {
        // Only filter by selected filters, don't exclude employees without company
        if (selectedCompany !== 'all' && emp.companyId !== selectedCompany)
          return false
        if (selectedSite !== 'all' && emp.siteId !== selectedSite) return false

        if (selectedProject !== 'all') {
          const site = sites.find(s => s.id === emp.siteId)
          if (site?.projectId !== selectedProject) return false
        }

        // Show all employees (active and inactive)
        return true
      })
      .sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber))
  }, [employees, selectedCompany, selectedProject, selectedSite, sites])

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    // Prepare data
    const data = filteredEmployees.map(emp => {
      const team = teams.find(t => t.members?.includes(emp.id))
      const site = sites.find(s => s.id === emp.siteId)
      const project = projects.find(p => p.id === site?.projectId)
      const company = companies.find(c => c.id === emp.companyId)

      return {
        'Nº Registro': emp.registrationNumber,
        'Nome Completo': emp.fullName,
        Função: emp.functionName || 'Não definida',
        Equipe: team?.name || '-',
        Canteiro: site?.name || '-',
        Obra: project?.name || '-',
        Empresa: company?.name || '-',
        Status: emp.isActive ? 'ATIVO' : 'INATIVO'
      }
    })

    // Create HTML table for Excel
    const tableHTML = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="utf-8">
                <style>
                    table { border-collapse: collapse; width: 100%; }
                    th { 
                        background-color: #3b82f6; 
                        color: white; 
                        font-weight: bold; 
                        padding: 12px; 
                        text-align: center;
                        border: 1px solid #ddd;
                    }
                    td { 
                        padding: 10px; 
                        border: 1px solid #ddd; 
                        text-align: center;
                    }
                    tr:nth-child(even) { background-color: #f9fafb; }
                    tr:hover { background-color: #e5e7eb; }
                    .status-active { color: #10b981; font-weight: bold; }
                    .status-inactive { color: #ef4444; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1 style="color: #1f2937; margin-bottom: 20px;">Composição de Equipes - Relatório Detalhado</h1>
                <p style="color: #6b7280; margin-bottom: 20px;">
                    Data de Geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br>
                    Total de Colaboradores: ${data.length}
                </p>
                <table>
                    <thead>
                        <tr>
                            <th>Nº Registro</th>
                            <th>Nome Completo</th>
                            <th>Função</th>
                            <th>Equipe</th>
                            <th>Canteiro</th>
                            <th>Obra</th>
                            <th>Empresa</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data
                          .map(
                            row => `
                            <tr>
                                <td>${row['Nº Registro']}</td>
                                <td style="text-align: left;">${row['Nome Completo']}</td>
                                <td>${row['Função']}</td>
                                <td>${row['Equipe']}</td>
                                <td>${row['Canteiro']}</td>
                                <td>${row['Obra']}</td>
                                <td>${row['Empresa']}</td>
                                <td class="${row['Status'] === 'ATIVO' ? 'status-active' : 'status-inactive'}">${row['Status']}</td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
                <br>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                    <strong>Filtros Aplicados:</strong><br>
                    Empresa: ${selectedCompany === 'all' ? 'Todas' : companies.find(c => c.id === selectedCompany)?.name || 'N/A'}<br>
                    Obra: ${selectedProject === 'all' ? 'Todas' : projects.find(p => p.id === selectedProject)?.name || 'N/A'}<br>
                    Canteiro: ${selectedSite === 'all' ? 'Todos' : sites.find(s => s.id === selectedSite)?.name || 'N/A'}
                </p>
            </body>
            </html>
        `

    // Create blob and download
    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)

    const filterSuffix =
      selectedCompany !== 'all' ||
      selectedProject !== 'all' ||
      selectedSite !== 'all'
        ? '_filtrado'
        : ''
    link.download = `Composicao_Equipes_${new Date().toISOString().split('T')[0]}${filterSuffix}.xls`
    link.click()
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in print-area space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="from-primary bg-linear-to-r via-purple-500 to-pink-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Composição de Equipes - Tabela Detalhada
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualização completa de todos os colaboradores com suas atribuições
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="text-primary h-5 w-5" />
            Filtros de Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Empresa
              </label>
              <Select
                value={selectedCompany}
                onValueChange={val => {
                  setSelectedCompany(val)
                  setSelectedProject('all')
                  setSelectedSite('all')
                }}
              >
                <SelectTrigger className="industrial-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Obra
              </label>
              <Select
                value={selectedProject}
                onValueChange={val => {
                  setSelectedProject(val)
                  setSelectedSite('all')
                }}
              >
                <SelectTrigger className="industrial-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as obras</SelectItem>
                  {projects
                    .filter(
                      p =>
                        selectedCompany === 'all' ||
                        p.companyId === selectedCompany
                    )
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Canteiro
              </label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="industrial-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os canteiros</SelectItem>
                  {sites
                    .filter(s => {
                      if (
                        selectedCompany !== 'all' &&
                        s.companyId !== selectedCompany
                      )
                        return false
                      if (
                        selectedProject !== 'all' &&
                        s.projectId !== selectedProject
                      )
                        return false
                      return true
                    })
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="glass-card border-white/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Total de Registros
              </p>
              <p className="text-primary mt-1 text-2xl font-bold">
                {filteredEmployees.length} colaboradores
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-center text-xs font-bold tracking-wider uppercase">
                    Nº
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold tracking-wider uppercase">
                    Nome Completo
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold tracking-wider uppercase">
                    Função
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold tracking-wider uppercase">
                    Equipe
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold tracking-wider uppercase">
                    Canteiro
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold tracking-wider uppercase">
                    Obra
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold tracking-wider uppercase">
                    Empresa
                  </TableHead>
                  <TableHead className="text-center text-xs font-bold tracking-wider uppercase">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground h-40 text-center"
                    >
                      Nenhum colaborador encontrado com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee, index) => {
                    const team = teams.find(t =>
                      t.members?.includes(employee.id)
                    )
                    const site = sites.find(s => s.id === employee.siteId)
                    const project = projects.find(p => p.id === site?.projectId)
                    const company = companies.find(
                      c => c.id === employee.companyId
                    )

                    return (
                      <TableRow
                        key={employee.id}
                        className={`border-white/5 transition-colors hover:bg-white/5 ${index % 2 === 0 ? 'bg-white/2' : ''}`}
                      >
                        <TableCell className="text-center">
                          <span className="text-muted-foreground font-mono text-xs">
                            {employee.registrationNumber}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">
                            {employee.fullName}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-primary/5 border-primary/20 text-primary font-medium"
                          >
                            {employee.functionName || 'Não definida'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-muted-foreground text-sm">
                            {team?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">{site?.name || '-'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-muted-foreground text-sm">
                            {project?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-muted-foreground text-sm">
                            {company?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {employee.isActive ? (
                            <div className="text-success flex items-center justify-center gap-1.5 text-xs font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> ATIVO
                            </div>
                          ) : (
                            <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs font-bold">
                              <XCircle className="h-3.5 w-3.5" /> INATIVO
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
    </div>
  )
}
