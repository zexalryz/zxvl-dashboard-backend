import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Seed users with roles
  const users = [
    { username: 'admin', email: 'admin@example.com', password: 'Admin1234', role: 'ADMIN' },
    { username: 'mod', email: 'mod@example.com', password: 'Mod1234', role: 'MODERATOR' },
    { username: 'donor', email: 'donor@example.com', password: 'Donor1234', role: 'DONATOR' },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { role: u.role },
      create: { username: u.username, email: u.email, password: hashed, role: u.role },
    });
    console.log(`  user: ${u.username} (${u.role})`);
  }

  // Seed invite codes
  const codes = ['INVITE-2024-001', 'INVITE-2024-002', 'INVITE-2024-003', 'INVITE-2024-004', 'INVITE-2024-005'];
  for (const code of codes) {
    await prisma.inviteCode.upsert({
      where: { code },
      update: {},
      create: { code },
    });
  }

  // Seed default tools
  const tools = [
    { slug: 'rest-api-tester', name: 'REST API Tester', description: 'Send HTTP requests and inspect responses — like Postman or Burp Suite', icon: '🧪' },
    { slug: 'guitar-chord-generator', name: 'Guitar Chord Generator', description: 'Generate guitar chord diagrams from chord names', icon: '🎸' },
  ];

  for (const t of tools) {
    await prisma.tool.upsert({
      where: { slug: t.slug },
      update: { name: t.name, description: t.description, icon: t.icon, enabled: true },
      create: { ...t, enabled: false },
    });
  }

  console.log(`Seeded ${users.length} users, ${codes.length} invite codes, and ${tools.length} tools`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
