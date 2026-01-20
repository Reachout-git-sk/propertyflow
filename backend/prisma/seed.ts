import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  // 1. Create email whitelist
  await prisma.emailWhitelist.createMany({
    data: [
      { email: 'admin@propertyflow.com', role: 'ADMIN' },
      { email: 'tenant1@example.com', role: 'TENANT' },
      { email: 'tenant2@example.com', role: 'TENANT' },
      { email: 'worker1@example.com', role: 'WORKER' },
      { email: 'worker2@example.com', role: 'WORKER' },
    ],
    skipDuplicates: true,
  });

  // 2. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@propertyflow.com' },
    update: {},
    create: {
      email: 'admin@propertyflow.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+1234567890',
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // 3. Create Property
  const property = await prisma.property.create({
    data: {
      name: 'Sunset Apartments',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      totalUnits: 20,
    },
  });

  console.log('✅ Property created:', property.name);

  // 4. Create Units
  const units = await prisma.unit.createMany({
    data: [
      {
        propertyId: property.id,
        unitNumber: '101',
        floor: 1,
        bedrooms: 2,
        bathrooms: 1,
        squareFeet: 850,
        rentAmount: 1200,
        isOccupied: false,
      },
      {
        propertyId: property.id,
        unitNumber: '102',
        floor: 1,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 650,
        rentAmount: 900,
        isOccupied: false,
      },
      {
        propertyId: property.id,
        unitNumber: '201',
        floor: 2,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1200,
        rentAmount: 1800,
        isOccupied: false,
      },
    ],
  });

  console.log(`✅ ${units.count} units created`);

  // 5. Create sample tenant
  const tenant = await prisma.user.create({
    data: {
      email: 'tenant1@example.com',
      passwordHash: await bcrypt.hash('Tenant@123', 10),
      role: 'TENANT',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1987654321',
    },
  });

  console.log('✅ Sample tenant created:', tenant.email);

  // 6. Create sample worker
  const workerUser = await prisma.user.create({
    data: {
      email: 'worker1@example.com',
      passwordHash: await bcrypt.hash('Worker@123', 10),
      role: 'WORKER',
      firstName: 'Mike',
      lastName: 'Smith',
      phone: '+1555123456',
    },
  });

  const worker = await prisma.worker.create({
    data: {
      userId: workerUser.id,
      companyName: 'Reliable Repairs LLC',
      skills: ['PLUMBING', 'ELECTRICAL'],
      hourlyRate: 75,
      availabilityStatus: 'AVAILABLE',
    },
  });

  console.log('✅ Sample worker created:', workerUser.email);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });