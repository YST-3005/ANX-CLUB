import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: "Decommissioned: The HTTP seed route is permanently disabled for security. Database seeding is only permitted via the development CLI script 'npm run db:seed' and strictly prohibited in production.",
    },
    { status: 410 }
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: "Decommissioned: The HTTP seed route is permanently disabled for security.",
    },
    { status: 410 }
  );
}
