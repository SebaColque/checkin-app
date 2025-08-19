import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const toSign = await req.text(); // QZ manda el string a firmar tal cual
  const key = process.env.QZ_PRIVATE_KEY || '';
  const signer = crypto.createSign('SHA1');        // QZ espera SHA1 por compatibilidad
  signer.update(toSign);
  const signature = signer.sign(key, 'base64');    // devolver en base64
  return new NextResponse(signature, { headers: { 'content-type': 'text/plain' } });
}
