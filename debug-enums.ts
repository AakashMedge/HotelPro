import { AuditAction } from '@prisma/client';

console.log('--- ENUM CHECK ---');
for (const key of Object.keys(AuditAction)) {
    console.log(`- ${key}`);
}
console.log('------------------');
