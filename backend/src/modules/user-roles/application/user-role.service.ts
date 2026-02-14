import { UserRoleRepository } from "../domain/user-role.repository";

export class UserRoleService {
  constructor(private readonly repository: UserRoleRepository) {}

  async getRolesByUser(userId: string) {
    return this.repository.findByUserId(userId);
  }

  async assignRole(data: any) {
    // Business logic for role assignment (e.g. check if role already exists)
    return this.repository.create(data);
  }

  async updateRole(id: string, data: any) {
    return this.repository.update(id, data);
  }

  async deleteRole(id: string) {
    return this.repository.delete(id);
  }
}
