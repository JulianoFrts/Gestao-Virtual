import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Mail, Building2, Briefcase, HardHat, Truck, 
  ShieldCheck, ShieldAlert, Pencil, Key, Ban, Trash2, Check 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleStyle, getRoleLabel } from "@/utils/roleUtils";
import { isSuperAdminGod, isGestaoGlobal, isProtectedUser, isCorporateRole } from "@/utils/permissionHelpers";
import { SystemUser } from "@/hooks/useUsers";

interface UserCardProps {
  user: SystemUser;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (user: SystemUser) => void;
  onChangePassword: (user: SystemUser) => void;
  onToggleBlock: (user: SystemUser) => void;
  onDelete: (user: SystemUser) => void;
  canUpdate: boolean;
  canDelete: boolean;
  updatingUserId: string | null;
  companies: any[];
  projects: any[];
  sites: any[];
}

export const UserCard: React.FC<UserCardProps> = ({
  user, isSelected, onToggleSelect, onEdit, onChangePassword, 
  onToggleBlock, onDelete, canUpdate, canDelete, updatingUserId,
  companies, projects, sites
}) => {
  const isGod = isSuperAdminGod(user as any);
  const isGlobal = isGestaoGlobal(user as any);
  const isProtected = isProtectedUser(user as any);

  return (
    <Card className={cn(
      "glass-card hover-lift transition-all duration-500 group overflow-hidden border-white/5 relative bg-white/2 backdrop-blur-xl",
      user.isBlocked && "opacity-60 grayscale-[0.3] border-destructive/10"
    )}>
      <CardHeader className="pb-3 px-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(user.id)}
                className="border-white/20 data-[state=checked]:bg-primary"
              />
              <div className={cn(
                "w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden",
                isSelected ? "border-primary bg-primary/10" : "border-white/5 bg-muted/40"
              )}>
                {user.image ? (
                  <img src={user.image} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span>{(user.fullName || "U").charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            
            <div className="min-w-0">
              <CardTitle className="text-lg flex flex-wrap items-center gap-2">
                <span className={cn(
                  "truncate",
                  isGod && "text-orange-500 font-black",
                  isGlobal && !isGod && "text-yellow-500 font-extrabold",
                  user.role === "TI_SOFTWARE" && "text-purple-500 font-mono"
                )}>
                  {user.fullName}
                </span>
                <Badge variant="outline" className={cn("text-[9px] h-4", getRoleStyle(user.role))}>
                  {getRoleLabel(user.role)}
                </Badge>
              </CardTitle>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </span>
                
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {isGlobal ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Gestão Global
                    </span>
                  ) : (
                    <span>{companies.find(c => c.id === user.companyId)?.name || "Sem Empresa"}</span>
                  )}
                </span>

                {user.jobFunction && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" /> {user.jobFunction.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {canUpdate && (
              <>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onEdit(user)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChangePassword(user)}>
                  <Key className="w-3.5 h-3.5 text-primary" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onToggleBlock(user)} disabled={updatingUserId === user.id}>
                  {user.isBlocked ? <ShieldCheck className="text-emerald-500 w-3.5 h-3.5" /> : <Ban className="text-red-400 w-3.5 h-3.5" />}
                </Button>
              </>
            )}
            {canDelete && !isProtected && (
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onDelete(user)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            )}
            {isProtected && <ShieldCheck className="w-5 h-5 text-orange-500 animate-pulse ml-2" />}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
