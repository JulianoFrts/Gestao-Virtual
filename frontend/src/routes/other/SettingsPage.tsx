
import { useState } from 'react';
import { 
  User, 
  Shield, 
  Lock, 
  Building, 
  Save, 
  Bell, 
  Mail, 
  Smartphone, 
  Globe, 
  Layout, 
  Palette, 
  Check, 
  CreditCard,
  ArrowLeft
} from 'lucide-react';
import { userSignal, themeSignal, densitySignal } from '../hooks/useSignals';
import { showToast } from '../hooks/useSignals';
import { updateMe, updateCompany } from '../services/auth';

type SectionId = 'profile' | 'company' | 'security' | 'notifications' | 'appearance' | 'billing';

export function SettingsPage() {
  const user = userSignal.value;
  const userLevel = user?.level ?? 0;
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados de formulário
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: ''
  });

  const [companyData, setCompanyData] = useState({
    name: 'Gestão Virtual Online Ltda', // Fallback se não vier do signal
    document: '12.345.678/0001-90',
    address: 'Av. Paulista, 1000 - São Paulo, SP'
  });

  // Estados de aparência (usando signals globais)
  const selectedTheme = themeSignal.value;
  const selectedDensity = densitySignal.value;

  const sections = [
    { id: 'profile' as SectionId, label: 'Meu Perfil', icon: <User size={20} />, description: 'Gerencie suas informações pessoais e credenciais.' },
    { id: 'company' as SectionId, label: 'Dados da Empresa', icon: <Building size={20} />, description: 'Informações corporativas e faturamento.' },
    { id: 'security' as SectionId, label: 'Segurança & Privacidade', icon: <Shield size={20} />, description: 'Controle de sessões e autenticação de dois fatores.' },
    { id: 'notifications' as SectionId, label: 'Notificações', icon: <Bell size={20} />, description: 'Configure como e quando deseja ser alertado.' },
    { id: 'appearance' as SectionId, label: 'Interface & Tema', icon: <Palette size={20} />, description: 'Personalize o visual da sua plataforma.' },
    { id: 'billing' as SectionId, label: 'Assinatura', icon: <CreditCard size={20} />, description: 'Gerencie seu plano e métodos de pagamento.' },
  ];

  const handleSave = () => {
    setIsConfirming(true);
  };

  const executeSave = async () => {
    setIsSaving(true);
    setIsConfirming(false);
    
    try {
      if (activeSection === 'profile') {
        const payload: { name: string; email: string; password?: string } = { 
          name: profileData.name, 
          email: profileData.email 
        };
        if (profileData.password) payload.password = profileData.password;
        
        await updateMe(payload);
        showToast('Perfil atualizado com sucesso', 'success');
        
        // Atualizar signal global com os novos dados
        if (userSignal.value) {
            userSignal.value = { ...userSignal.value, ...payload };
        }
      } else if (activeSection === 'company') {
        await updateCompany(companyData);
        showToast('Dados da empresa atualizados', 'success');
      } else {
        // Módulos ainda não implementados no backend usam delay simulado
        await new Promise(resolve => setTimeout(resolve, 800));
        showToast('Preferências salvas localmente', 'success');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar alterações';
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSectionHeader = (title: string, subtitle: string) => (
    <div className="sticky -top-8 z-50 bg-slate-50/95 backdrop-blur-md py-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200/50">
      <div className="space-y-1">
        <button 
          onClick={() => setActiveSection(null)}
          className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest hover:gap-3 transition-all mb-4"
        >
          <ArrowLeft size={16} /> Voltar para Configurações
        </button>
        <h2 className="text-3xl font-black italic tracking-tighter text-slate-800 uppercase leading-none">{title}</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{subtitle}</p>
      </div>
      <button 
        onClick={handleSave}
        disabled={isSaving}
        className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 z-10"
      >
        {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        ) : (
            <Save size={16} />
        )}
        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
      </button>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderSectionHeader('Meu Perfil', 'Edite suas informações de acesso e identidade no sistema')}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <User size={14} className="text-primary" /> Dados Pessoais
          </h4>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome Completo</label>
              <input 
                value={profileData.name}
                onChange={e => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-primary/30 transition-all outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">E-mail Corporativo</label>
              <input 
                value={profileData.email}
                onChange={e => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-primary/30 transition-all outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5 pt-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nova Senha</label>
              <input 
                type="password"
                placeholder="Deixe em branco para manter a atual"
                value={profileData.password}
                onChange={e => setProfileData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-primary/30 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-4xl p-8 shadow-2xl shadow-slate-200/50">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <Shield size={14} className="text-primary" /> Nível de Acesso
          </h4>
          <div className="p-6 bg-slate-50 rounded-4xl border border-slate-100 flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
              <Shield size={32} />
            </div>
            <div>
              <p className="text-lg font-black italic tracking-tighter text-slate-800 uppercase">{user?.role}</p>
              <div className="flex gap-2 items-center mt-1">
                <span className="text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded tracking-widest uppercase">LVL {userLevel}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supervisor Master</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-6 leading-relaxed flex items-center gap-2 px-2">
            <Lock size={12} /> Alterações de nível só podem ser feitas por usuários <span className="text-primary font-black italic">SYSTEM</span> através da Gestão de Permissões.
          </p>
        </div>
      </div>
    </div>
  );

  const renderCompany = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderSectionHeader('Dados da Empresa', 'Informações estruturais e dados de faturamento do ecossistema')}
      
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Globe size={14} className="text-primary" /> Identificação Corporativa
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Razão Social</label>
                        <input 
                          value={companyData.name} 
                          onChange={e => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-800 outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">CNPJ</label>
                        <input 
                          value={companyData.document} 
                          onChange={e => setCompanyData(prev => ({ ...prev, document: e.target.value }))}
                          className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-800 outline-none" 
                        />
                    </div>
                </div>
            </div>
            
            <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Smartphone size={14} className="text-primary" /> Contatos Principais
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Telefone</label>
                        <input 
                          defaultValue="(11) 98765-4321" 
                          className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-800 outline-none" 
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Suporte Técnico</label>
                        <input 
                          defaultValue="suporte@gestaovirtual.com" 
                          className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-800 outline-none" 
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderSectionHeader('Segurança & Privacidade', 'Gerencie senhas e autenticação de dois fatores')}
      <div className="flex items-center justify-center p-20 bg-white border border-slate-100 rounded-[3rem] shadow-xl">
         <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                <Lock size={32} />
            </div>
            <div>
                <h4 className="text-xl font-black italic tracking-tighter text-slate-800 uppercase">Módulo em Integração</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Troca de senha e 2FA disponível em breve.</p>
            </div>
         </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderSectionHeader('Notificações', 'Escolha como deseja receber alertas e relatórios')}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
            { label: 'E-mails de Produção', desc: 'Receba o resumo diário do RDO por e-mail', icon: <Mail size={16} /> },
            { label: 'Alertas de Auditoria', desc: 'Notificações push para inconformidades críticas', icon: <Shield size={16} /> },
            { label: 'Prazos de Projetos', desc: 'Avisos sobre marcos de cronograma atrasados', icon: <Bell size={16} /> },
            { label: 'Mensagens de Sistema', desc: 'Atualizações e manutenções do ecossistema', icon: <Smartphone size={16} /> }
        ].map(item => (
            <div key={item.label} className="bg-white border border-slate-100 rounded-4xl p-8 shadow-lg flex items-center justify-between group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        {item.icon}
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800 tracking-tight">{item.label}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.desc}</p>
                    </div>
                </div>
                <div className="w-12 h-6 bg-emerald-500 rounded-full flex items-center justify-end px-1 shadow-inner cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </div>
            </div>
        ))}
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderSectionHeader('Interface & Tema', 'Personalize a densidade e o visual da plataforma')}
      <div className="bg-white border border-slate-100 rounded-4xl p-10 shadow-xl flex flex-col items-center gap-8">
           {/* Seletor de Tema */}
           <div className="flex gap-4 p-2 bg-slate-100 rounded-4xl shadow-inner">
                <button 
                  onClick={() => themeSignal.value = 'business-navy'}
                  className={`flex items-center gap-2 px-8 py-3 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all ${
                    selectedTheme === 'business-navy' 
                      ? 'bg-white text-primary shadow-lg' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                    <Layout size={16} /> Business Navy
                </button>
                <button 
                  onClick={() => themeSignal.value = 'industrial-gray'}
                  className={`flex items-center gap-2 px-8 py-3 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all ${
                    selectedTheme === 'industrial-gray' 
                      ? 'bg-white text-primary shadow-lg' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                    <Palette size={16} /> Industrial Gray
                </button>
           </div>
           
           {/* Seletor de Densidade */}
           <div className="w-full flex justify-around">
               {/* Confortável */}
               <div 
                 onClick={() => densitySignal.value = 'comfortable'}
                 className={`flex flex-col items-center gap-2 cursor-pointer transition-all ${
                   selectedDensity === 'comfortable' ? '' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                 }`}
               >
                   <div className={`w-24 h-16 bg-slate-50 border-2 rounded-xl flex items-center justify-center relative shadow-xl ${
                     selectedDensity === 'comfortable' ? 'border-primary' : 'border-slate-100'
                   }`}>
                        {selectedDensity === 'comfortable' && (
                          <Check className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full w-6 h-6 shadow-lg border-2 border-white" />
                        )}
                        <div className="w-16 h-8 bg-slate-200 rounded animate-pulse" />
                   </div>
                   <p className={`text-[10px] font-black uppercase tracking-widest ${
                     selectedDensity === 'comfortable' ? 'text-slate-800' : 'text-slate-400'
                   }`}>Confortável</p>
               </div>
               
               {/* Compacto */}
               <div 
                 onClick={() => densitySignal.value = 'compact'}
                 className={`flex flex-col items-center gap-2 cursor-pointer transition-all ${
                   selectedDensity === 'compact' ? '' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                 }`}
               >
                   <div className={`w-24 h-16 bg-slate-50 border-2 rounded-xl flex flex-col items-center justify-center gap-1 relative shadow-xl ${
                     selectedDensity === 'compact' ? 'border-primary' : 'border-slate-100'
                   }`}>
                        {selectedDensity === 'compact' && (
                          <Check className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full w-6 h-6 shadow-lg border-2 border-white" />
                        )}
                        <div className="w-16 h-2 bg-slate-200 rounded" />
                        <div className="w-16 h-2 bg-slate-200 rounded" />
                        <div className="w-16 h-2 bg-slate-200 rounded" />
                   </div>
                   <p className={`text-[10px] font-black uppercase tracking-widest ${
                     selectedDensity === 'compact' ? 'text-slate-800' : 'text-slate-400'
                   }`}>Compacto</p>
               </div>
           </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderSectionHeader('Assinatura', 'Gerencie seu plano e histórico de pagamentos corporativos')}
      <div className="bg-slate-900 border border-slate-800 rounded-4xl p-12 shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all duration-1000" />
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="space-y-4 text-center md:text-left">
                <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20">Plano Enterprise Ativo</span>
                <h3 className="text-5xl font-black italic tracking-tighter text-white">GESTOR MASTER <span className="text-primary">DNA</span></h3>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">Recursos ilimitados para transmissão de energia em larga escala.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-4xl shadow-2xl min-w-[280px]">
                <div className="space-y-2 mb-6">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Próximo Vencimento</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">15 OUT 2026</p>
                </div>
                <button className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary hover:text-white transition-all active:scale-95 shadow-xl">
                    Gerenciar Pagamento
                </button>
            </div>
         </div>
      </div>
    </div>
  );

  let content;
  if (activeSection === 'profile') content = renderProfile();
  else if (activeSection === 'company') content = renderCompany();
  else if (activeSection === 'security') content = renderSecurity();
  else if (activeSection === 'notifications') content = renderNotifications();
  else if (activeSection === 'appearance') content = renderAppearance();
  else if (activeSection === 'billing') content = renderBilling();
  else content = (
    <div className="space-y-8 p-8 max-w-7xl mx-auto font-sans animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black italic tracking-tighter text-primary leading-none uppercase">CONFIGURAÇÕES DO <span className="text-slate-800">SISTEMA</span></h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] pl-1">Personalize sua experiência e gerencie diretrizes globais do ecossistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* User Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-2xl shadow-primary/5 flex flex-col items-center text-center space-y-6 group hover:translate-y-[-4px] transition-all duration-500">
            <div className="relative">
                <div className="w-32 h-32 rounded-[2.5rem] bg-slate-900 flex items-center justify-center text-5xl font-black italic text-white shadow-2xl shadow-slate-900/30 group-hover:rotate-3 transition-transform duration-500">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-xl border-4 border-white">
                    <Shield size={16} />
                </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-black italic tracking-tighter text-slate-800 uppercase leading-none">{user?.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user?.role} • {userLevel >= 1000 ? 'Supervisor Master' : 'Colaborador'}</p>
            </div>

            <div className="w-full pt-8 border-t border-slate-50 flex flex-col gap-5 text-left">
                <div className="flex flex-col space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Mail size={12} className="text-primary" /> E-mail Corporativo
                    </span>
                    <span className="text-xs font-bold text-slate-800">{user?.email}</span>
                </div>
                <div className="flex flex-col space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Globe size={12} className="text-primary" /> ID de Usuário
                    </span>
                    <span className="text-[8px] font-mono text-slate-300 break-all leading-tight">{user?.id}</span>
                </div>
            </div>

            <button 
                onClick={() => setActiveSection('profile')}
                className="w-full py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-[0.2em] text-[9px] hover:bg-slate-50 hover:border-primary/20 hover:text-primary transition-all active:scale-95"
            >
                Editar Perfil Completo
            </button>
          </div>
        </div>

        {/* Settings Action Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map(section => (
            <button 
                key={section.id} 
                onClick={() => setActiveSection(section.id)}
                className="group p-8 bg-white border border-slate-100 rounded-[2.5rem] text-left hover:border-primary/30 hover:shadow-2xl hover:translate-y-[-4px] transition-all duration-500 relative overflow-hidden"
            >
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-8 -translate-y-8 group-hover:bg-primary/5 transition-all duration-500" />
              
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-6 group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                {section.icon}
              </div>
              <h4 className="text-xl font-black italic tracking-tighter text-slate-500 group-hover:text-primary transition-colors leading-none uppercase">{section.label}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed opacity-80 group-hover:opacity-100">{section.description}</p>
              
              <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500">
                <ArrowLeft size={20} className="text-primary rotate-180" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" data-builder-path="src/routes/SettingsPage.tsx" data-builder-file="SettingsPage.tsx">
      {content}

      {/* Confirmation Modal */}
      {isConfirming && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 max-w-md w-full animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-6">
                 <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center shadow-inner">
                    <Save size={40} />
                 </div>
                 
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black italic tracking-tighter text-slate-800 uppercase">Salvar Planilha?</h3>
                    <p className="text-sm text-slate-500 font-bold leading-relaxed px-4">
                       Você está prestes a atualizar as diretrizes desta seção de configuração. Deseja prosseguir com a persistência?
                    </p>
                 </div>

                 <div className="flex flex-col w-full gap-3 pt-4">
                    <button 
                       onClick={executeSave}
                       className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all outline-none"
                    >
                       Confirmar Alterações
                    </button>
                    <button 
                       onClick={() => setIsConfirming(false)}
                       className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-200 transition-all outline-none"
                    >
                       Cancelar
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
