
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });

async function quickSeed() {
    console.log('🌱 Quick Seeding Admin User...');
    const prisma = new PrismaClient();

    try {
        const email = 'juliano@gestaovirtual.com';
        const password = 'orion123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Limpar se existir (opcional, mas bom pra teste limpo)
        // await prisma.authCredential.deleteMany({ where: { email } });

        const user = await prisma.user.create({
            data: {
                name: 'Juliano Freitas',
                authCredential: {
                    create: {
                        email: email,
                        password: hashedPassword,
                        role: 'SUPER_ADMIN_GOD',
                        status: 'ACTIVE',
                        systemUse: true
                    }
                }
            }
        });

        console.log('✅ Admin user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);

    } catch (error) {
        console.error('❌ Error during quick seed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

quickSeed();
