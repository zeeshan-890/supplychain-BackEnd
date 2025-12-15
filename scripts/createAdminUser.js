import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function createAdminUser() {
    try {
        const adminEmail = 'admin@gmail.com';
        const hashedPassword = await bcrypt.hash('Admin123.', 10);

        // Use upsert to create or update admin user
        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                password: hashedPassword,
                role: 'ADMIN',
            },
            create: {
                email: adminEmail,
                password: hashedPassword,
                name: 'System Admin',
                role: 'ADMIN',
            },
        });

        console.log('✅ Admin user ready');
        console.log('   Email: admin@supply.com');
        console.log('   Password: admin123');
        console.log('   Role: ADMIN');
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    }
}
