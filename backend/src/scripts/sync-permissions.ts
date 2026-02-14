/**
 * Script de Sincronização de Permissões
 * Fonte única de verdade: constants/index.ts -> Banco de Dados
 */
import { PermissionSyncService } from "../modules/user-roles/application/permission-sync.service";

async function main() {
  try {
    await PermissionSyncService.syncHierarchy();
    process.exit(0);
  } catch (error) {
    console.error("Falha crítica na sincronização de permissões:", error);
    process.exit(1);
  }
}

main();
