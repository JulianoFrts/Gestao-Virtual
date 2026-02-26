import { NextRequest } from "next/server";

// Mocks devem vir ANTES da importação do componente que os utiliza para evitar SyntaxError de ESM em dependências
jest.mock("@/lib/auth/token", () => ({
  generateToken: jest.fn().mockResolvedValue("mock-jwt-token"),
  validateToken: jest.fn(),
}));
jest.mock("@/lib/auth/session", () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
  isUserAdmin: jest.fn().mockReturnValue(true),
}));
jest.mock("@/lib/utils/api/response", () => ({
  ApiResponse: {
    json: jest.fn((data) => new Response(JSON.stringify(data), { status: HTTP_STATUS.OK })),
    unauthorized: jest.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: HTTP_STATUS.UNAUTHORIZED })),
    badRequest: jest.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: HTTP_STATUS.BAD_REQUEST })),
    created: jest.fn((data) => new Response(JSON.stringify(data), { status: HTTP_STATUS.CREATED })),
  },
  handleApiError: jest.fn(),
}));
jest.mock("@/lib/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { POST } from "../../app/api/v1/auth/login/route";
import { AuthService } from "../../modules/auth/application/auth.service";
import { UserService } from "../../modules/users/application/user.service";
import { generateToken } from "@/lib/auth/token";
import { ApiResponse } from "@/lib/utils/api/response";

jest.mock("../../modules/auth/application/auth.service");
jest.mock("../../modules/users/application/user.service");

describe("Login Route Unit Tests", () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 and user data for valid credentials", async () => {
    const loginData = { email: "test@example.com", password: "password123" };
    mockRequest = {
      text: jest.fn().mockResolvedValue(JSON.stringify(loginData)),
    };

    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: "ADMIN",
      status: "ACTIVE",
    };

    (AuthService.prototype.verifyCredentials as jest.Mock).mockResolvedValue(mockUser);
    (generateToken as jest.Mock).mockResolvedValue("mock-jwt-token");
    (UserService.prototype.getPermissionsMap as jest.Mock).mockResolvedValue({ "users.view": true });
    
    // ApiResponse.json should return a Response object
    (ApiResponse.json as jest.Mock).mockReturnValue(new Response(JSON.stringify({ success: true }), { status: HTTP_STATUS.OK }));

    const response = await POST(mockRequest as NextRequest);

    expect(response.status).toBe(200);
    expect(AuthService.prototype.verifyCredentials).toHaveBeenCalledWith(loginData.email, loginData.password);
    expect(generateToken).toHaveBeenCalled();
    expect(ApiResponse.json).toHaveBeenCalled();
  });

  it("should return 401 for invalid credentials", async () => {
    const loginData = { email: "wrong@example.com", password: "wrong" };
    mockRequest = {
      text: jest.fn().mockResolvedValue(JSON.stringify(loginData)),
    };

    (AuthService.prototype.verifyCredentials as jest.Mock).mockResolvedValue(null);
    (ApiResponse.unauthorized as jest.Mock).mockReturnValue(new Response(JSON.stringify({ error: "Unauthorized" }), { status: HTTP_STATUS.UNAUTHORIZED }));

    // Note: The route uses ApiResponse.unauthorized but I need to make sure it's called correctly
    // Looking at the route code again... it uses result.error logic
    
    await POST(mockRequest as NextRequest);

    expect(ApiResponse.unauthorized).toHaveBeenCalledWith("Credenciais inválidas");
  });

  it("should return 400 for empty body", async () => {
    mockRequest = {
      text: jest.fn().mockResolvedValue(""),
    };

    (ApiResponse.badRequest as jest.Mock).mockReturnValue(new Response(null, { status: HTTP_STATUS.BAD_REQUEST }));

    await POST(mockRequest as NextRequest);

    expect(ApiResponse.badRequest).toHaveBeenCalledWith("Corpo vazio", undefined);
  });
});
