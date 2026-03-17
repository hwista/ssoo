export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDatabase } = await import('@/server/services/db');
    await initDatabase();
  }
}
