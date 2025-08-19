import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET() {
  const cert = process.env.QZ_PUBLIC_CERT || '';
  return new NextResponse(cert, { headers: { 'content-type': 'text/plain' } });
}
