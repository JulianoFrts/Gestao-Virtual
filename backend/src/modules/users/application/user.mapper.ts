import { UserWithRelations } from "../domain/user.repository";
import { DEFAULT_PAGE } from "@/lib/constants";

/**
 * UserMapper
 * Responsável por transformar entidades do banco em DTOs (Data Transfer Objects)
 * e formatar resultados para o frontend.
 */
export class UserMapper {
  /**
   * Achata a estrutura aninhada do Prisma para o formato plano esperado pelo frontend
   */
  static toDTO(user: UserWithRelations | null): any {
    if (!user) return null;
    
    // Extraímos os campos aninhados para o nível raiz para facilitar o uso no frontend
    return {
      ...user,
      email: user.authCredential?.email,
      role: user.authCredential?.role,
      status: user.authCredential?.status,
      mfaEnabled: !!user.authCredential?.mfaEnabled,
      companyId: user.affiliation?.companyId,
      projectId: user.affiliation?.projectId,
      siteId: user.affiliation?.siteId,
    };
  }

  /**
   * Formata uma lista de usuários e seus metadados de paginação
   */
  static toPaginatedDTO(
    users: UserWithRelations[],
    total: number,
    page: number,
    limit: number
  ) {
    const flattenedItems = users.map((u) => this.toDTO(u));
    const pages = Math.ceil(total / limit);
    
    return {
      items: flattenedItems,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > DEFAULT_PAGE,
      },
    };
  }
}
