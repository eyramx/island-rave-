import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { config } from '../src/lib/config';
import { generateSlug } from '../src/lib/utils';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Super Admin User
  const adminEmail = config.admin.email || 'admin@islandrave.com';
  const adminPassword = config.admin.password || 'password123';
  
  const hashedPassword = await bcryptjs.hash(adminPassword, 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });
  
  console.log(`✅ Created Admin User: ${adminUser.email}`);

  // 1b. Create Gate Staff Scanner User
  const staffEmail = config.staff?.email || 'gate@islandrave.com';
  const staffPassword = config.staff?.password || 'GateScanner2026!';
  const hashedStaffPassword = await bcryptjs.hash(staffPassword, 12);

  const gateStaffUser = await prisma.user.upsert({
    where: { email: staffEmail },
    update: {},
    create: {
      email: staffEmail,
      passwordHash: hashedStaffPassword,
      firstName: 'Gate',
      lastName: 'Scanner',
      role: 'CHECK_IN_STAFF',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Created Gate Staff User: ${gateStaffUser.email}`);

  // 1c. Create Event Manager User
  const managerEmail = config.manager?.email || 'manager@islandrave.com';
  const managerPassword = config.manager?.password || 'RaveManager2026!';
  const hashedManagerPassword = await bcryptjs.hash(managerPassword, 12);

  const managerUser = await prisma.user.upsert({
    where: { email: managerEmail },
    update: {},
    create: {
      email: managerEmail,
      passwordHash: hashedManagerPassword,
      firstName: 'Event',
      lastName: 'Manager',
      role: 'EVENT_MANAGER',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Created Event Manager User: ${managerUser.email}`);

  // 1d. Create Finance User
  const financeEmail = config.finance?.email || 'finance@islandrave.com';
  const financePassword = config.finance?.password || 'RaveFinance2026!';
  const hashedFinancePassword = await bcryptjs.hash(financePassword, 12);

  const financeUser = await prisma.user.upsert({
    where: { email: financeEmail },
    update: {},
    create: {
      email: financeEmail,
      passwordHash: hashedFinancePassword,
      firstName: 'Finance',
      lastName: 'Lead',
      role: 'FINANCE',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Created Finance User: ${financeUser.email}`);

  // 2. Create Initial Event
  const eventName = 'Island Rave';
  
  const event = await prisma.event.upsert({
    where: { slug: generateSlug(eventName) },
    update: {},
    create: {
      name: eventName,
      slug: generateSlug(eventName),
      description: 'Event description will be provided by the organizer.',
      shortDescription: 'The ultimate tropical event experience.',
      venueName: 'La Plage Beach Club, Accra',
      venueAddress: 'La Plage Beachfront, Laboma Beach Road, Accra',
      city: 'Accra',
      country: 'Ghana',
      startTime: '8:00 PM GMT',
      endTime: '4:00 AM GMT',
      totalCapacity: 5000,
      organizerName: 'Organizer information coming soon',
      contactEmail: 'contact details coming soon',
      status: 'PUBLISHED',
      isFeatured: true,
      refundPolicy: 'Refund policy will be provided by the organizer.',
      termsConditions: 'Terms and conditions will be provided by the organizer.',
    },
  });

  console.log(`✅ Created Event: ${event.name}`);

  // 3. Create Early-Bird Ticket Type
  const ticketTypeName = 'Early-Bird';
  
  const ticketType = await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: ticketTypeName,
      description: 'Limited early access ticket',
      price: 150.00,
      currency: 'GHS',
      totalQuantity: 500, // Placeholder quantity
      maxPerCustomer: 5,
      sortOrder: 1,
      isEarlyBird: true,
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Created Ticket Type: ${ticketType.name} - GHS ${ticketType.price}`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
