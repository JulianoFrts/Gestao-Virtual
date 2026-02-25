import { UserEntity } from "../domain/user.dto";
import { DEFAULT_PAGE } from "@/lib/constants";

/**
 * UserMapper
 * Responsável por transformar entidades do domínio em DTOs (Data Transfer Objects)
 * formatados para o consumo do frontend ou outras camadas.
 */
export class UserMapper {
  /**
   * Achata a estrutura aninhada da entidade para o formato plano esperado pelo frontend
   */
  static toDTO(user: UserEntity | null): Record<string, unknown> | null {
    if (!user) return null;

    // Extraímos os campos aninhados para o nível raiz para facilitar o uso no frontend
    return {
      ...user,
      // Segurança
      email: user.authCredential?.email,
      role: user.authCredential?.role,
      status: user.authCredential?.status,
      mfaEnabled: !!user.authCredential?.mfaEnabled,
      isSystemAdmin: !!user.authCredential?.isSystemAdmin,

      // Obra / Operacional
      companyId: user.affiliation?.companyId,
      projectId: user.affiliation?.projectId,
      siteId: user.affiliation?.siteId,
      registrationNumber: user.affiliation?.registrationNumber,
      hierarchyLevel: user.affiliation?.hierarchyLevel ?? 0,
      laborType: user.affiliation?.laborType,
      iapName: user.affiliation?.iapName,
      functionId: user.affiliation?.functionId,
      jobFunction: user.affiliation?.jobFunction,

      // Flatten Address
      zipCode: user.address?.cep,
      street: user.address?.logradouro,
      neighborhood: user.address?.bairro,
      city: user.address?.localidade,
      state: user.address?.uf,
      number: user.address?.number,
    };
  }

  /**
   * Formata uma lista de usuários e seus metadados de paginação
   */
  static toPaginatedDTO(
    users: UserEntity[],
    total: number,
    page: number,
    limit: number,
  ): Record<string, unknown> {
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
