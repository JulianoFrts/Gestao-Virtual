import { UserRepository } from "@/modules/users/domain/user.repository";
import { UserService } from "@/modules/users/application/user.service";
import { publicUserSelect } from "@/types/database";
import { logger } from "@/lib/utils/logger";

export interface UserStreamParams {
  where: any;
  page: number;
  limit: number;
  total: number;
  sortBy?: string;
  sortOrder?: string;
  CONSTANTS: any;
  userRepository: UserRepository;
  userService: UserService;
}

/**
 * Função Auxiliar para Streaming de Usuários (SRP)
 * Encapsula a lógica de paginação via chunks para evitar estouro de memória.
 */
export function generateUsersStream(params: UserStreamParams): ReadableStream {
  const { where, page, limit, total, sortBy, sortOrder, CONSTANTS, userRepository, userService } = params;
  const encoder = new TextEncoder();
  const pages = Math.ceil(total / limit);

  return new ReadableStream({
    async start(controller) {
      try {
        // Início do JSON
        controller.enqueue(encoder.encode('{"success":true,"data":{"items":['));

        let totalSent = 0;
        const batchSize = CONSTANTS.API.BATCH.SIZE;
        const skipStart = (page - 1) * limit;
        const maxToFetch = Math.min(limit, total - skipStart);

        while (totalSent < maxToFetch) {
          const takeBatch = Math.min(batchSize, maxToFetch - totalSent);
          
          const users = await userRepository.findAll({
            where,
            skip: skipStart + totalSent,
            take: takeBatch,
            orderBy: sortBy
              ? ({ [sortBy]: sortOrder || "asc" } as any)
              : [{ hierarchyLevel: "desc" }, { name: "asc" }],
            select: publicUserSelect,
          });

          if (users.length === 0) break;

          const flattenedUsers = users.map((u: any) => (userService as any).flattenUser(u));
          const usersJson = flattenedUsers.map((u) => JSON.stringify(u)).join(",");
          
          const prefix = totalSent > 0 ? "," : "";
          controller.enqueue(encoder.encode(prefix + usersJson));

          totalSent += users.length;

          // Throttling opcional para streams muito grandes
          if (maxToFetch > CONSTANTS.API.THROTTLE.THRESHOLD) {
            await new Promise((resolve) => setTimeout(resolve, CONSTANTS.API.THROTTLE.MS));
          }
        }

        // Fim do JSON com metadados de paginação
        const paginationJson = JSON.stringify({
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > CONSTANTS.API.PAGINATION.DEFAULT_PAGE,
        });

        controller.enqueue(
          encoder.encode(`],"pagination":${paginationJson}},"timestamp":"${new Date().toISOString()}"}`)
        );
        
        controller.close();
      } catch (err) {
        logger.error("Erro no streaming de usuários", { err });
        controller.error(err);
      }
    },
  });
}
