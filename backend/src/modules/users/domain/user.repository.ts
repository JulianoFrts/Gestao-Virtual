import { User, Prisma } from "@prisma/client";

export interface UserWithRelations extends Partial<User> {
  authCredential?: {
    email?: string;
    role?: string;
    status?: string;
    mfaEnabled?: boolean;
    password?: string;
  };
  affiliation?: {
    companyId?: string | null;
    projectId?: string | null;
    siteId?: string | null;
  };
  hierarchyLevel?: number;
  isSystemAdmin?: boolean;
}

export interface UserListResult {
  items: Partial<User>[];
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
    where: Prisma.UserWhereInput;
    skip: number;
    take: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    select?: Prisma.UserSelect;
  }): Promise<Partial<User>[]>;

  count(where: Prisma.UserWhereInput): Promise<number>;

  findById(
    id: string,
    select?: Prisma.UserSelect,
  ): Promise<Partial<User> | null>;

  findByEmail(email: string): Promise<Partial<User> | null>;

  create(
    data: Prisma.UserCreateInput,
    select?: Prisma.UserSelect,
  ): Promise<Partial<User>>;

  update(
    id: string,
    data: Prisma.UserUpdateInput,
    select?: Prisma.UserSelect,
  ): Promise<Partial<User>>;

  delete(id: string): Promise<void>;
  findByIdentifier(
    identifier: string,
    select?: Prisma.UserSelect,
  ): Promise<Partial<User> | null>;
  deduplicateCPFs(): Promise<number>;
  upsertAddress(userId: string, data: any): Promise<any>;
}
