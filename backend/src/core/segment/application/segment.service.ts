import { Segment, SegmentRepository } from "../domain/segment.repository";

export class SegmentService {
  constructor(private segmentRepository: SegmentRepository) {}

  async getProjectSegments(projectId: string): Promise<Segment[]> {
    return await this.segmentRepository.findByProject(projectId);
  }

  async getCompanySegments(companyId: string): Promise<Segment[]> {
    return await this.segmentRepository.findByCompany(companyId);
  }

  async saveSegment(segment: Segment): Promise<Segment> {
    return await this.segmentRepository.save(segment);
  }

  async saveSegments(segments: Segment[]): Promise<Segment[]> {
    return await this.segmentRepository.saveMany(segments);
  }

  async deleteSegment(id: string): Promise<void> {
    await this.segmentRepository.deleteById(id);
  }
}
