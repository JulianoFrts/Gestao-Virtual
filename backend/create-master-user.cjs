const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'master@gestaovirtual.com.br';
  const password = 'master123';
  const hashedPassword = await bcrypt.hash(password, 12);

  console.log(`Checking/Creating master user: ${email}`);

  try {
    // 1. Check if credential exists
    let credential = await prisma.authCredential.findUnique({
      where: { email },
      include: { user: true }
    });

    if (!credential) {
      console.log('Credential not found, creating new user and credential...');
      // 2. Create User first
      const user = await prisma.user.create({
        data: {
          name: 'Administrador Mestre',
          isSystemAdmin: true,
          hierarchyLevel: 10,
        }
      });

      // 3. Create AuthCredential
      credential = await prisma.authCredential.create({
        data: {
          userId: user.id,
          email: email,
          password: hashedPassword,
          role: 'ADMIN',
          status: 'ACTIVE',
          systemUse: true,
        }
      });
      console.log('Master user and credentials created successfully!');
    } else {
      console.log('Credential exists, updating password and status...');
      await prisma.authCredential.update({
        where: { id: credential.id },
        data: {
          password: hashedPassword,
          status: 'ACTIVE',
          systemUse: true,
          role: 'ADMIN'
        }
      });
      
      await prisma.user.update({
        where: { id: credential.userId },
        data: { isSystemAdmin: true }
      });
      console.log('Master user updated successfully!');
    }

    console.log('Login Details:');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (err) {
    console.error('Error during master user operation:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
