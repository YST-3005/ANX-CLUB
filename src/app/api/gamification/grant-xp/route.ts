import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json(
    {
      error: 'Decommissioned: Direct client-initiated XP grants via HTTP are permanently disabled for security. XP awards are only permitted through verified server-side repositories with unique ledger constraint validation.',
    },
    { status: 410 }
  );
}

export async function GET(req: Request) {
  return NextResponse.json(
    {
      error: 'Decommissioned: The XP grant HTTP endpoint is permanently disabled for security.',
    },
    { status: 410 }
  );
}
