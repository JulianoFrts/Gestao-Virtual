import {
  UserEntity,
  UserFiltersDTO,
  CreateUserDTO,
  UpdateUserDTO,
} from "./user.dto";

export interface UserListResult {
  items: UserEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserRepository {
  findAll(params: {
    where: UserFiltersDTO;
    skip: number;
    take: number;
    orderBy?: Record<string, unknown>; // To be structured properly later
    select?: Record<string, unknown>; // To be structured properly later
  }): Promise<UserEntity[]>;

  count(where: UserFiltersDTO): Promise<number>;

  findById(
    id: string,
    select?: Record<string, unknown>,
  ): Promise<UserEntity | null>;

  findByEmail(email: string): Promise<UserEntity | null>;

  create(
    data: CreateUserDTO,
    select?: Record<string, unknown>,
  ): Promise<UserEntity>;

  update(
    id: string,
    data: UpdateUserDTO,
    select?: Record<string, unknown>,
  ): Promise<UserEntity>;

  updateMany(ids: string[], data: UpdateUserDTO): Promise<{ count: number }>;

  delete(id: string): Promise<void>;

  findByIdentifier(
    identifier: string,
    select?: Record<string, unknown>,
  ): Promise<UserEntity | null>;

  deduplicateCPFs(): Promise<number>;
  upsertAddress(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}
