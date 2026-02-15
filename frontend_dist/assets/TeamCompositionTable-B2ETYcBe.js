import{N as M,c as U,b as X,w as J,r as w,j as e,L as Q,B as D,aX as K,S as I,G as E,H as k,I as $,J as f,q as W,e as Y,Q as Z}from"./index-D951x4H-.js";import{u as ee}from"./useSites-Dum3dnEP.js";import{u as te}from"./useCompanies-kjFTA6Qu.js";import{C as O,b as se,c as ae,a as A}from"./card-BTHGlYFz.js";import{T as re,a as le,b as R,c as d,d as ie,e as c}from"./table-UwE0Vej1.js";import{P as ne}from"./printer-6uhaNVcg.js";import{T as ce}from"./target-J4oQCKEn.js";function fe(){M();const{teams:L,isLoading:F}=U(),{employees:V,isLoading:P}=X(),{sites:h}=ee(),{projects:g}=J(),{companies:N}=te(),[a,H]=w.useState("all"),[i,q]=w.useState("all"),[o,C]=w.useState("all"),_=F||P,v=w.useMemo(()=>V.filter(t=>{if(a!=="all"&&t.companyId!==a||o!=="all"&&t.siteId!==o)return!1;if(i!=="all"){const n=h.find(m=>m.id===t.siteId);if((n==null?void 0:n.projectId)!==i)return!1}return!0}).sort((t,n)=>t.registrationNumber.localeCompare(n.registrationNumber)),[V,a,i,o,h]),z=()=>{window.print()},G=()=>{var u,l,b;const t=v.map(s=>{const y=L.find(x=>{var B;return(B=x.members)==null?void 0:B.includes(s.id)}),p=h.find(x=>x.id===s.siteId),T=g.find(x=>x.id===(p==null?void 0:p.projectId)),S=N.find(x=>x.id===s.companyId);return{"Nº Registro":s.registrationNumber,"Nome Completo":s.fullName,Função:s.functionName||"Não definida",Equipe:(y==null?void 0:y.name)||"-",Canteiro:(p==null?void 0:p.name)||"-",Obra:(T==null?void 0:T.name)||"-",Empresa:(S==null?void 0:S.name)||"-",Status:s.isActive?"ATIVO":"INATIVO"}}),n=`
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
                    Data de Geração: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}<br>
                    Total de Colaboradores: ${t.length}
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
                        ${t.map(s=>`
                            <tr>
                                <td>${s["Nº Registro"]}</td>
                                <td style="text-align: left;">${s["Nome Completo"]}</td>
                                <td>${s.Função}</td>
                                <td>${s.Equipe}</td>
                                <td>${s.Canteiro}</td>
                                <td>${s.Obra}</td>
                                <td>${s.Empresa}</td>
                                <td class="${s.Status==="ATIVO"?"status-active":"status-inactive"}">${s.Status}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                <br>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                    <strong>Filtros Aplicados:</strong><br>
                    Empresa: ${a==="all"?"Todas":((u=N.find(s=>s.id===a))==null?void 0:u.name)||"N/A"}<br>
                    Obra: ${i==="all"?"Todas":((l=g.find(s=>s.id===i))==null?void 0:l.name)||"N/A"}<br>
                    Canteiro: ${o==="all"?"Todos":((b=h.find(s=>s.id===o))==null?void 0:b.name)||"N/A"}
                </p>
            </body>
            </html>
        `,m=new Blob([n],{type:"application/vnd.ms-excel"}),r=document.createElement("a");r.href=URL.createObjectURL(m);const j=a!=="all"||i!=="all"||o!=="all"?"_filtrado":"";r.download=`Composicao_Equipes_${new Date().toISOString().split("T")[0]}${j}.xls`,r.click()};return _?e.jsx("div",{className:"flex h-64 items-center justify-center",children:e.jsx(Q,{className:"text-primary h-8 w-8 animate-spin"})}):e.jsxs("div",{className:"animate-fade-in print-area space-y-6",children:[e.jsxs("div",{className:"flex flex-col gap-4 md:flex-row md:items-center md:justify-between",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"from-primary bg-linear-to-r via-purple-500 to-pink-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent",children:"Composição de Equipes - Tabela Detalhada"}),e.jsx("p",{className:"text-muted-foreground mt-1",children:"Visualização completa de todos os colaboradores com suas atribuições"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(D,{onClick:G,variant:"outline",className:"gap-2",children:[e.jsx(K,{className:"h-4 w-4"}),"Exportar Excel"]}),e.jsxs(D,{onClick:z,variant:"outline",className:"gap-2",children:[e.jsx(ne,{className:"h-4 w-4"}),"Imprimir"]})]})]}),e.jsxs(O,{className:"glass-card border-white/5",children:[e.jsx(se,{children:e.jsxs(ae,{className:"flex items-center gap-2 text-lg",children:[e.jsx(ce,{className:"text-primary h-5 w-5"}),"Filtros de Análise"]})}),e.jsx(A,{children:e.jsxs("div",{className:"grid grid-cols-1 gap-4 md:grid-cols-3",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx("label",{className:"text-muted-foreground text-xs font-medium tracking-wider uppercase",children:"Empresa"}),e.jsxs(I,{value:a,onValueChange:t=>{H(t),q("all"),C("all")},children:[e.jsx(E,{className:"industrial-input",children:e.jsx(k,{})}),e.jsxs($,{children:[e.jsx(f,{value:"all",children:"Todas as empresas"}),N.map(t=>e.jsx(f,{value:t.id,children:t.name},t.id))]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("label",{className:"text-muted-foreground text-xs font-medium tracking-wider uppercase",children:"Obra"}),e.jsxs(I,{value:i,onValueChange:t=>{q(t),C("all")},children:[e.jsx(E,{className:"industrial-input",children:e.jsx(k,{})}),e.jsxs($,{children:[e.jsx(f,{value:"all",children:"Todas as obras"}),g.filter(t=>a==="all"||t.companyId===a).map(t=>e.jsx(f,{value:t.id,children:t.name},t.id))]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("label",{className:"text-muted-foreground text-xs font-medium tracking-wider uppercase",children:"Canteiro"}),e.jsxs(I,{value:o,onValueChange:C,children:[e.jsx(E,{className:"industrial-input",children:e.jsx(k,{})}),e.jsxs($,{children:[e.jsx(f,{value:"all",children:"Todos os canteiros"}),h.filter(t=>!(a!=="all"&&t.companyId!==a||i!=="all"&&t.projectId!==i)).map(t=>e.jsx(f,{value:t.id,children:t.name},t.id))]})]})]})]})})]}),e.jsx(O,{className:"glass-card border-white/5",children:e.jsx(A,{className:"pt-6",children:e.jsx("div",{className:"flex items-center justify-between",children:e.jsxs("div",{children:[e.jsx("p",{className:"text-muted-foreground text-sm font-medium",children:"Total de Registros"}),e.jsxs("p",{className:"text-primary mt-1 text-2xl font-bold",children:[v.length," colaboradores"]})]})})})}),e.jsx(O,{className:"glass-card border-white/5",children:e.jsx(A,{className:"p-0",children:e.jsx("div",{className:"overflow-x-auto",children:e.jsxs(re,{children:[e.jsx(le,{className:"bg-white/5",children:e.jsxs(R,{className:"border-white/10 hover:bg-transparent",children:[e.jsx(d,{className:"text-center text-xs font-bold tracking-wider uppercase",children:"Nº"}),e.jsx(d,{className:"text-center text-xs font-bold tracking-wider uppercase",children:"Nome Completo"}),e.jsx(d,{className:"text-center text-xs font-bold tracking-wider uppercase",children:"Função"}),e.jsx(d,{className:"text-center text-xs font-bold tracking-wider uppercase",children:"Equipe"}),e.jsx(d,{className:"text-center text-xs font-bold tracking-wider uppercase",children:"Canteiro"}),e.jsx(d,{className:"text-center text-xs font-bold tracking-wider uppercase",children:"Obra"}),e.jsx(d,{className:"text-center text-xs font-bold tracking-wider uppercase",children:"Empresa"}),e.jsx(d,{className:"text-center text-xs font-bold tracking-wider uppercase",children:"Status"})]})}),e.jsx(ie,{children:v.length===0?e.jsx(R,{children:e.jsx(c,{colSpan:8,className:"text-muted-foreground h-40 text-center",children:"Nenhum colaborador encontrado com os filtros selecionados."})}):v.map((t,n)=>{const m=L.find(l=>{var b;return(b=l.members)==null?void 0:b.includes(t.id)}),r=h.find(l=>l.id===t.siteId),j=g.find(l=>l.id===(r==null?void 0:r.projectId)),u=N.find(l=>l.id===t.companyId);return e.jsxs(R,{className:`border-white/5 transition-colors hover:bg-white/5 ${n%2===0?"bg-white/2":""}`,children:[e.jsx(c,{className:"text-center",children:e.jsx("span",{className:"text-muted-foreground font-mono text-xs",children:t.registrationNumber})}),e.jsx(c,{className:"text-center",children:e.jsx("span",{className:"text-sm font-medium",children:t.fullName})}),e.jsx(c,{className:"text-center",children:e.jsx(W,{variant:"outline",className:"bg-primary/5 border-primary/20 text-primary font-medium",children:t.functionName||"Não definida"})}),e.jsx(c,{className:"text-center",children:e.jsx("span",{className:"text-muted-foreground text-sm",children:(m==null?void 0:m.name)||"-"})}),e.jsx(c,{className:"text-center",children:e.jsx("span",{className:"text-sm",children:(r==null?void 0:r.name)||"-"})}),e.jsx(c,{className:"text-center",children:e.jsx("span",{className:"text-muted-foreground text-sm",children:(j==null?void 0:j.name)||"-"})}),e.jsx(c,{className:"text-center",children:e.jsx("span",{className:"text-muted-foreground text-sm",children:(u==null?void 0:u.name)||"-"})}),e.jsx(c,{className:"text-center",children:t.isActive?e.jsxs("div",{className:"text-success flex items-center justify-center gap-1.5 text-xs font-bold",children:[e.jsx(Y,{className:"h-3.5 w-3.5"})," ATIVO"]}):e.jsxs("div",{className:"text-muted-foreground flex items-center justify-center gap-1.5 text-xs font-bold",children:[e.jsx(Z,{className:"h-3.5 w-3.5"})," INATIVO"]})})]},t.id)})})]})})})}),e.jsx("style",{children:`
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
            `})]})}export{fe as default};
