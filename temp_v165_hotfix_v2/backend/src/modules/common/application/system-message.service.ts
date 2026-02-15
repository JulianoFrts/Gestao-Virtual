import { SystemMessageRepository } from "../domain/system-message.repository";

export class SystemMessageService {
  constructor(private readonly repository: SystemMessageRepository) {}

  async listMessages(params: any) {
    const {
      page,
      limit,
      recipientUserId,
      messageType,
      status,
      currentUser,
      isAdmin,
    } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    if (recipientUserId) {
      where.recipientUserId = recipientUserId;
    } else if (!isAdmin) {
      where.recipientUserId = currentUser.id;
    }

    if (messageType) where.messageType = messageType;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.repository.findAll(where, skip, limit, { createdAt: "desc" }),
      this.repository.count(where),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  async createMessage(data: any, sender: { id: string; email: string }) {
    return this.repository.create({
      ...data,
      senderId: sender.id,
      senderEmail: sender.email,
      metadata: data.metadata || {},
    });
  }
}
