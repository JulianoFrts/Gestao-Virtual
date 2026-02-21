import { prisma } from "@/lib/prisma/client";
import { ROLE_LEVELS } from "@/lib/constants";

export class PermissionSyncService {
  /**
   * Sincroniza as constantes ROLE_LEVELS com a tabela permission_levels no banco.
   * Realiza um upsert para cada cargo definido nas constantes.
   */
  static async syncHierarchy() {
    console.log("[PermissionSync] Iniciando sincronização de hierarquia...");

    const roles = Object.keys(ROLE_LEVELS);
    let updatedCount = 0;

    for (const roleKey of roles) {
      const rank = ROLE_LEVELS[roleKey];
      const name = roleKey.toUpperCase();

      try {
        await prisma.permissionLevel.upsert({
          where: { name },
          update: { rank },
          create: {
            id: name, // Usando o nome como ID já que é único e não há default no schema
            name,
            rank,
            description: `Sincronizado automaticamente: ${roleKey}`,
            isSystem: true,
          },
        });
        updatedCount++;
      } catch (error: any) {
        console.error(
          `[PermissionSync] Erro ao sincronizar cargo ${name}:`,
          error.message,
        );
      }
    }

    console.log(
      `[PermissionSync] Sincronização concluída. ${updatedCount}/${roles.length} cargos processados.`,
    );
    return updatedCount;
  }
}
