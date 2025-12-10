const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@supply-chain.com' },
        update: {},
        create: {
            email: 'admin@supply-chain.com',
            password: hashedPassword,
            name: 'System Admin',
            roles: ['ADMIN'],
            isVerified: true,
        },
    });

    console.log('✅ Admin user created:');
    console.log('   Email: admin@supply-chain.com');
    console.log('   Password: admin123');
    console.log('   Roles:', admin.roles);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
