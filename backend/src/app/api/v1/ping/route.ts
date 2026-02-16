import { ApiResponse } from "@/lib/utils/api/response";

export async function GET() {
  return ApiResponse.json({ message: "pong" });
}
