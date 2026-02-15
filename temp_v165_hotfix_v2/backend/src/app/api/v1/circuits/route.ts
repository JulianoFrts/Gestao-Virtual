import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { PrismaCircuitRepository } from "@/infrastructure/repositories/prisma-circuit.repository";
import { CircuitService } from "@/core/circuit/application/circuit.service";
import { z } from "zod";
import { Validator } from "@/lib/utils/api/validator";
import { idSchema } from "@/core/common/domain/common.schema";

const circuitRepository = new PrismaCircuitRepository();
const circuitService = new CircuitService(circuitRepository);

const getCircuitsSchema = z.object({
  projectId: idSchema,
});

// GET /api/v1/circuits?projectId=...
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const validation = Validator.validateQuery(
      getCircuitsSchema,
      request.nextUrl.searchParams,
    );
    if (!validation.success) return validation.response;

    const { projectId } = validation.data;
    const circuits = await circuitService.getProjectCircuits(projectId);

    return ApiResponse.json(circuits);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/v1/circuits
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const result = await circuitService.saveCircuit(body);
    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/v1/circuits?id=...
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return ApiResponse.badRequest("ID is required");

    await circuitService.deleteCircuit(id);
    return ApiResponse.json(null, "Circuit deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
