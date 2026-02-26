import { ApiResponse } from "@/lib/utils/api/response";

export async function GET(): Promise<Response> {
  return ApiResponse.json({ message: "pong" });
}
