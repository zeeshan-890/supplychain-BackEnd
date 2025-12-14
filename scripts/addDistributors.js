import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
    log: ['error']
});

const distributors = [
    {
        email: 'distributor1@example.com',
        password: 'Qw@12345',
        name: 'Ahmed Khan',
        businessName: 'Khan Distribution Services',
        businessAddress: 'Plot 45, Industrial Area, Karachi',
        contactNumber: '+92-300-1234567',
        serviceArea: 'Karachi, Sindh'
    },
    {
        email: 'distributor2@example.com',
        password: 'Qw@12345',
        name: 'Fatima Ali',
        businessName: 'Ali Logistics Hub',
        businessAddress: 'Block B, Model Town, Lahore',
        contactNumber: '+92-301-2345678',
        serviceArea: 'Lahore, Punjab'
    },
    {
        email: 'distributor3@example.com',
        password: 'Qw@12345',
        name: 'Hassan Raza',
        businessName: 'Raza Distribution Network',
        businessAddress: 'Sector F-10, Islamabad',
        contactNumber: '+92-302-3456789',
        serviceArea: 'Islamabad, ICT'
    },
    {
        email: 'distributor4@example.com',
        password: 'Qw@12345',
        name: 'Sara Malik',
        businessName: 'Malik Supply Chain Co.',
        businessAddress: 'University Road, Peshawar',
        contactNumber: '+92-303-4567890',
        serviceArea: 'Peshawar, KPK'
    },
    {
        email: 'distributor5@example.com',
        password: 'Qw@12345',
        name: 'Bilal Ahmed',
        businessName: 'Ahmed Wholesale Distributors',
        businessAddress: 'Satellite Town, Quetta',
        contactNumber: '+92-304-5678901',
        serviceArea: 'Quetta, Balochistan'
    }
];

async function addDistributors() {
    try {
        // Check if distributors already exist
        const existingCount = await prisma.distributorProfile.count();

        if (existingCount >= 5) {
            console.log('✅ Distributors already exist. Skipping initialization.');
            return;
        }

        console.log('🚀 Initializing default distributors...\n');

        for (let i = 0; i < distributors.length; i++) {
            const dist = distributors[i];
            console.log(`📦 Creating distributor ${i + 1}: ${dist.businessName}`);

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: dist.email }
            });

            if (existingUser) {
                console.log(`   ⚠️  User with email ${dist.email} already exists. Skipping...\n`);
                continue;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(dist.password, 10);

            // Create user with distributor profile
            const user = await prisma.user.create({
                data: {
                    email: dist.email,
                    password: hashedPassword,
                    name: dist.name,
                    role: 'DISTRIBUTOR',
                    distributorProfile: {
                        create: {
                            businessName: dist.businessName,
                            businessAddress: dist.businessAddress,
                            contactNumber: dist.contactNumber,
                            serviceArea: dist.serviceArea
                        }
                    }
                },
                include: {
                    distributorProfile: true
                }
            });

            console.log(`   ✅ Created user: ${user.email}`);
            console.log(`   ✅ Created distributor: ${user.distributorProfile.businessName}`);
            console.log(`   📍 Location: ${user.distributorProfile.serviceArea}\n`);
        }

        console.log('✅ Default distributors initialized successfully!\n');

    } catch (error) {
        console.error('❌ Error adding distributors:', error);
    }
}

// Export for use in server startup
export default addDistributors;

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    addDistributors()
        .then(async () => {
            console.log('\n📋 All Distributors:');
            console.log('━'.repeat(60));

            const allDistributors = await prisma.distributorProfile.findMany({
                include: { user: true }
            });

            allDistributors.forEach((dist, index) => {
                console.log(`${index + 1}. ${dist.businessName}`);
                console.log(`   Email: ${dist.user.email}`);
                console.log(`   Password: Qw@12345`);
                console.log(`   Contact: ${dist.user.name} (${dist.contactNumber})`);
                console.log(`   Location: ${dist.serviceArea}`);
                console.log('');
            });

            console.log('━'.repeat(60));
            console.log('\n✨ You can now login with any of these distributor accounts!');
            await prisma.$disconnect();
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}
