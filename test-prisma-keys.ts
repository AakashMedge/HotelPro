import { prisma } from './lib/db';

console.log('--- PRISMA MODELS CHECK ---');
const keys = Object.keys(prisma).filter(k => !k.startsWith('$'));
console.log(keys);

try {
    const count = await (prisma as any).client.count();
    console.log('Client count works:', count);
} catch (e: any) {
    console.log('Client count failed:', e.message);
}

try {
    const count = await (prisma as any).Client.count();
    console.log('Capital Client count works:', count);
} catch (e: any) {
    console.log('Capital Client count failed:', e.message);
}
