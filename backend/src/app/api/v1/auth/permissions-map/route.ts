import { NextRequest, NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/constants";

/**
 * [DEV ONLY] Mapa Estático de Permissões para Simulação
 * Em produção, isso viria do banco de dados/cache.
 */
const PERMISSIONS_MAP: Record<
  string,
  { permissions: Record<string, boolean>; ui: Record<string, any> }
> = {
  SUPER_ADMIN_GOD: {
    permissions: {
      "*": true, // PODER TOTAL
      "employees.view": true,
      "employees.edit": true,
      "employees.delete": true,
      "map.view": true,
      "map.edit": true,
      "su.manage": true,
    },
    ui: {
      showAdminMenu: true,
      allowDelete: true,
    },
  },
  SOCIO_DIRETOR: {
    permissions: {
      "employees.view": true,
      "employees.edit": true,
      "employees.delete": true,
      "map.view": true,
      "projects.view": true,
      "financial.view": true,
    },
    ui: {
      showAdminMenu: true,
      allowDelete: true,
    },
  },
  ADMIN: {
    permissions: {
      "employees.view": true,
      "employees.edit": true,
      "employees.delete": false,
      "map.view": true,
      "map.edit": true,
      "viewer_3d.view": true,
    },
    ui: {
      showAdminMenu: true,
      allowDelete: false,
    },
  },
  TI_SOFTWARE: {
    permissions: {
      "*": true,
      "system.debug": true,
    },
    ui: {
      showAdminMenu: true,
      allowDelete: true,
    },
  },
  MANAGER: {
    permissions: {
      "employees.view": true,
      "employees.edit": true,
      "map.view": true,
      "projects.view": true,
    },
    ui: {
      showAdminMenu: true,
      allowDelete: false,
    },
  },
  GESTOR_PROJECT: {
    permissions: {
      "employees.view": true,
      "projects.view": true,
      "map.view": true,
      "viewer_3d.view": true,
    },
    ui: {
      showAdminMenu: false,
      allowDelete: false,
    },
  },
  WORKER: {
    permissions: {
      "employees.view": true,
      "employees.edit": false,
      "employees.delete": false,
      "map.view": true,
    },
    ui: {
      showAdminMenu: false,
      allowDelete: false,
    },
  },
  VIEWER: {
    permissions: {
      "employees.view": true,
      "employees.edit": false,
      "employees.delete": false,
      "map.view": false,
      "viewer_3d.view": false,
    },
    ui: {
      showAdminMenu: false,
      allowDelete: false,
      readOnlyForm: true,
    },
  },
  HELPER_SYSTEM: {
    permissions: {
      "*": true,
    },
    ui: {
      showAdminMenu: true,
    },
  },
};

export async function GET(req: NextRequest): Promise<Response> {
  // Segurança: Só habilitado em desenvolvimento
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Unauthorized in production" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  if (!role || !PERMISSIONS_MAP[role]) {
    return NextResponse.json(
      { error: "Role não encontrada no mapa de simulação" },
      { status: HTTP_STATUS.NOT_FOUND },
    );
  }

  return NextResponse.json(PERMISSIONS_MAP[role]);
}
