import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, UserPlus, Pencil, ShieldCheck, Building2, MapPin, Key } from "lucide-react";
import { STANDARD_ROLES, getRoleLabel } from "@/utils/roleUtils";
import { SystemUser } from "@/hooks/useUsers";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: SystemUser | null;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  companies: any[];
}

export const UserFormDialog: React.FC<UserFormDialogProps> = ({
  open, onOpenChange, user, onSubmit, isSubmitting, companies
}) => {
  const [formData, setFormData] = useState<any>({
    fullName: "",
    email: "",
    password: "",
    role: "OPERATIONAL",
    isSystemAdmin: false,
    companyId: "none",
    registrationNumber: "",
    cpf: "",
    phone: "",
    zipCode: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: ""
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        role: user.role || "OPERATIONAL",
        isSystemAdmin: user.isSystemAdmin || false,
        companyId: user.companyId || "none",
        registrationNumber: user.registrationNumber || "",
        cpf: user.cpf || "",
        phone: user.phone || "",
        zipCode: user.zipCode || "",
        street: user.street || "",
        number: user.number || "",
        neighborhood: user.neighborhood || "",
        city: user.city || "",
        state: user.state || ""
      });
    } else {
      setFormData({
        fullName: "", email: "", password: "", role: "OPERATIONAL", 
        isSystemAdmin: false, companyId: "none", registrationNumber: "",
        cpf: "", phone: "", zipCode: "", street: "", number: "",
        neighborhood: "", city: "", state: ""
      });
    }
  }, [user, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black/80 border-white/10 backdrop-blur-2xl rounded-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            {user ? <Pencil className="text-primary" /> : <UserPlus className="text-primary" />}
            {user ? "EDITAR USUÁRIO" : "NOVO USUÁRIO"}
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-widest font-bold opacity-60">
            {user ? `Atualizando dados de ${user.fullName}` : "Cadastre um novo colaborador na plataforma"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <Accordion type="single" collapsible defaultValue="access" className="space-y-4">
            
            {/* 1. ACESSO & SEGURANÇA */}
            <AccordionItem value="access" className="border-none">
              <AccordionTrigger className="bg-white/5 px-4 rounded-xl hover:no-underline">
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4" /> Acesso & Segurança
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase opacity-60">Nome Completo</Label>
                    <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-white/5 border-white/10" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase opacity-60">Email</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-white/5 border-white/10" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase opacity-60">Nível de Acesso</Label>
                    <Select value={formData.role} onValueChange={val => setFormData({...formData, role: val})}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10">
                        {STANDARD_ROLES.map(r => (
                          <SelectItem key={r.name} value={r.name}>{getRoleLabel(r.name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!user && (
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase opacity-60">Senha Inicial</Label>
                      <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-white/5 border-white/10" required />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10 mt-2">
                  <Checkbox 
                    id="master-access" 
                    checked={formData.isSystemAdmin} 
                    onCheckedChange={val => setFormData({...formData, isSystemAdmin: !!val})}
                  />
                  <div className="grid gap-0.5">
                    <Label htmlFor="master-access" className="text-[10px] font-black uppercase text-primary">Acesso Mestre (System Admin)</Label>
                    <p className="text-[9px] text-muted-foreground uppercase">Imunidade total e soberania sobre outros usuários.</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. AFILIAÇÃO */}
            <AccordionItem value="affiliation" className="border-none">
              <AccordionTrigger className="bg-white/5 px-4 rounded-xl hover:no-underline">
                <div className="flex items-center gap-2 text-sky-500 font-black text-[10px] uppercase tracking-widest">
                  <Building2 className="w-4 h-4" /> Afiliação Corporativa
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase opacity-60">Empresa</Label>
                    <Select value={formData.companyId} onValueChange={val => setFormData({...formData, companyId: val})}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/10">
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase opacity-60">Matrícula</Label>
                    <Input value={formData.registrationNumber} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} className="bg-white/5 border-white/10" />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. ENDEREÇO */}
            <AccordionItem value="address" className="border-none">
              <AccordionTrigger className="bg-white/5 px-4 rounded-xl hover:no-underline">
                <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                  <MapPin className="w-4 h-4" /> Endereço & Localização
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 px-1">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase opacity-60">CEP</Label>
                    <Input value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] uppercase opacity-60">Cidade</Label>
                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="bg-white/5 border-white/10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase opacity-60">Logradouro (Rua)</Label>
                  <Input value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} className="bg-white/5 border-white/10" />
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="gradient-primary px-8 font-black" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              {user ? "SALVAR ALTERAÇÕES" : "CRIAR CONTA"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
