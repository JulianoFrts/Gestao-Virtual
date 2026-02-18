const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const backupPath = path.join(__dirname, 'prisma', 'seeds-backup', 'backup-20260208-auth-credentials.json');
  console.log(`Reading backup from: ${backupPath}`);
  
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found!');
    return;
  }

  const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log(`Found ${data.length} credentials. Starting restoration...`);

  let count = 0;
  for (const cred of data) {
    try {
      // 1. Ensure User exists
      await prisma.user.upsert({
        where: { id: cred.userId },
        update: {},
        create: {
          id: cred.userId,
          name: cred.email.split('@')[0], // Placeholder name
          isSystemAdmin: cred.role === 'ADMIN' || cred.role === 'SUPER_ADMIN_GOD',
        }
      });

      // 2. Upsert AuthCredential
      await prisma.authCredential.upsert({
        where: { userId: cred.userId },
        update: {
          email: cred.email,
          password: cred.password,
          login: cred.login,
          role: cred.role,
          status: cred.status,
          systemUse: cred.systemUse,
          mfaEnabled: cred.mfaEnabled,
          mfaSecret: cred.mfaSecret,
        },
        create: {
          id: cred.id,
          userId: cred.userId,
          email: cred.email,
          password: cred.password,
          login: cred.login,
          role: cred.role,
          status: cred.status,
          systemUse: cred.systemUse,
          mfaEnabled: cred.mfaEnabled,
          mfaSecret: cred.mfaSecret,
        }
      });

      count++;
      if (count % 100 === 0) {
        console.log(`Restored ${count}/${data.length}...`);
      }
    } catch (err) {
      console.error(`Error restoring credential for ${cred.email}:`, err.message);
    }
  }

  console.log(`Restoration complete! Total: ${count} users restored.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
