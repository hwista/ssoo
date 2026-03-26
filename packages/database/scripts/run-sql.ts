// Run SQL file or query
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npx ts-node scripts/run-sql.ts --file <path>   Run SQL file');
    console.log('  npx ts-node scripts/run-sql.ts --query "SQL"   Run SQL query');
    process.exit(1);
  }

  try {
    if (args[0] === '--file' && args[1]) {
      const filePath = path.resolve(args[1]);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Executing SQL file: ${filePath}\n`);
      
      // Remove comments and split by semicolon
      const cleanedSql = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');
      
      const statements = cleanedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      let successCount = 0;
      for (const statement of statements) {
        if (statement.length > 0) {
          try {
            await prisma.$executeRawUnsafe(statement);
            successCount++;
          } catch (err: unknown) {
            // Ignore duplicate key errors for ON CONFLICT
            const message = err instanceof Error ? err.message : String(err);
            if (!message.includes('duplicate key')) {
              console.error(`Error in statement: ${statement.substring(0, 100)}...`);
              console.error(message);
            }
          }
        }
      }
      console.log(`✅ ${successCount}/${statements.length} statements executed`);
    } else if (args[0] === '--query' && args[1]) {
      const result = await prisma.$queryRawUnsafe(args[1]);
      console.log(JSON.stringify(result, (_, v) => 
        typeof v === 'bigint' ? v.toString() : v, 2));
    } else {
      console.error('Invalid arguments');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
