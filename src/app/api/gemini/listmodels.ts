import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const apiKey = 'AIzaSyBiQlQTNkQF3uO7V5ttiQm6oDCa2obGkHk';
  const url = 'https://generativelanguage.googleapis.com/v1/models?key=' + apiKey;
  try {
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    const errorMsg = typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : String(err);
    return new Response(JSON.stringify({ error: errorMsg }), { status: 500 });
  }
}

