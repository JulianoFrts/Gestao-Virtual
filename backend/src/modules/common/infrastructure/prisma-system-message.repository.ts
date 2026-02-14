import { prisma } from "@/lib/prisma/client";
import { SystemMessageRepository } from "../domain/system-message.repository";

export class PrismaSystemMessageRepository implements SystemMessageRepository {
  async findAll(
    where: any,
    skip: number,
    take: number,
    orderBy: any,
  ): Promise<any[]> {
    return prisma.systemMessage.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        recipientUser: {
          select: {
            id: true,
            name: true,
            authCredential: { select: { email: true } },
          },
        },
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async count(where: any): Promise<number> {
    return prisma.systemMessage.count({ where });
  }

  async create(data: any): Promise<any> {
    return prisma.systemMessage.create({
      data,
      include: {
        recipientUser: { select: { id: true, name: true } },
      },
    });
  }
}
