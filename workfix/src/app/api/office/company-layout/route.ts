import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  fetchCurrentUser,
  fetchOfficeLayoutByCompany,
  getOkestriaApiBaseUrl,
  upsertOfficeLayoutByCompany,
} from "@/lib/auth/api";

const ACCESS_COOKIE = "okestria_access_token";

const getAuthToken = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value ?? null;
};

const resolveCompanyAccess = async () => {
  const token = await getAuthToken();
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const currentUser = await fetchCurrentUser(token);
    if (!currentUser.companyId) {
      return {
        error: NextResponse.json(
          { error: "No company linked to current user." },
          { status: 400 },
        ),
      };
    }

    return { token, companyId: currentUser.companyId };
  } catch (error) {
    return {
      error: NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to resolve current company.",
        },
        { status: 500 },
      ),
    };
  }
};

export async function GET() {
  const access = await resolveCompanyAccess();
  if ("error" in access) return access.error;

  try {
    const layout = await fetchOfficeLayoutByCompany(access.companyId, access.token);
    return NextResponse.json({ layout });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load office layout.";
    if (/404/.test(message) || /status 404/i.test(message)) {
      return NextResponse.json({ layout: null }, { status: 200 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const access = await resolveCompanyAccess();
  if ("error" in access) return access.error;

  try {
    const body = (await request.json()) as {
      layoutJson?: string;
      version?: number;
      name?: string;
      workspaceId?: number | null;
    };

    if (!body.layoutJson?.trim()) {
      return NextResponse.json({ error: "layoutJson is required." }, { status: 400 });
    }

    const layout = await upsertOfficeLayoutByCompany(
      access.companyId,
      {
        layoutJson: body.layoutJson,
        version: body.version,
        name: body.name,
        workspaceId: typeof body.workspaceId === "number" ? body.workspaceId : undefined,
      },
      access.token,
    );

    return NextResponse.json({ layout });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save office layout.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  const access = await resolveCompanyAccess();
  if ("error" in access) return access.error;

  try {
    const response = await fetch(
      `${getOkestriaApiBaseUrl()}/api/OfficeLayouts/company/${access.companyId}/reset`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access.token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reset office layout.",
      },
      { status: 500 },
    );
  }
}
