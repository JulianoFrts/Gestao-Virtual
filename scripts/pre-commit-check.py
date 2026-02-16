import os
import subprocess
import sys

def run_command(command, cwd=None):
    print(f"Executando: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=cwd)
    if result.returncode != 0:
        print(f"ERRO:\n{result.stderr}")
        return False
    print("Sucesso!")
    return True

def main():
    root_dir = r"c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual"
    frontend_dir = os.path.join(root_dir, "frontend")
    
    print("--- Iniciando Verificação de Sanidade ---")
    
    # 1. Verificar tipos TypeScript no frontend
    if not run_command("npm run typecheck", cwd=frontend_dir):
        print("Falha na verificação de tipos do frontend.")
        sys.exit(1)
        
    # 2. Verificar se arquivos grandes têm fechamentos básicos (opcional, mas útil)
    audit_logs_path = os.path.join(frontend_dir, "src", "pages", "AuditLogs.tsx")
    if os.path.exists(audit_logs_path):
        with open(audit_logs_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Verificação rudimentar de tags
            tags = ["Tabs", "TabsContent", "Card", "CardContent", "Dialog", "DialogContent"]
            import re
            for tag in tags:
                open_pattern = rf"<{tag}\b"
                close_pattern = rf"</{tag}>"
                open_count = len(re.findall(open_pattern, content))
                close_count = len(re.findall(close_pattern, content))
                if open_count != close_count:
                    print(f"AVISO: Possível desequilíbrio na tag <{tag}> no arquivo AuditLogs.tsx ({open_count} aberturas vs {close_count} fechamentos)")
    
    print("--- Verificação Concluída com Sucesso ---")

if __name__ == "__main__":
    main()
