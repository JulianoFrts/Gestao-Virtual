import { MapVisibilityRepository } from "../domain/map-visibility.repository";

export class MapVisibilityService {
  constructor(private readonly repository: MapVisibilityRepository) {}

  async listVisibility(userId: string) {
    return this.repository.findMany({ userId });
  }

  async saveVisibility(userId: string, data: any) {
    const { projectId, elementId, documentId, ...visibilityData } = data;

    const existing = await this.repository.findFirst({
      userId,
      projectId,
      elementId,
      documentId: documentId || null,
    });

    if (existing) {
      return this.repository.update(existing.id, visibilityData);
    }

    return this.repository.create({
      userId,
      projectId,
      elementId,
      documentId: documentId || null,
      ...visibilityData,
      isHidden: visibilityData.isHidden ?? false,
    });
  }

  async bulkUpdate(userId: string, projectId: string | null, data: any) {
    return this.repository.updateMany(
      {
        userId,
        ...(projectId && { projectId }),
      },
      data,
    );
  }
}
