import { PrismaClient, PersonStatus, AdminRole, ContactStatus, BlockedScope, VoiceCallStatus, CallEndedBy, VideoCallStatus, VideoEndedBy, SenderType, MessageStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.systemConfiguration.deleteMany();
  await prisma.messageAttachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.videoCallTimeSlot.deleteMany();
  await prisma.videoCall.deleteMany();
  await prisma.voiceCall.deleteMany();
  await prisma.blockedNumber.deleteMany();
  await prisma.approvedContact.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.incarceratedPerson.deleteMany();
  await prisma.housingUnit.deleteMany();
  await prisma.housingUnitType.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.agency.deleteMany();

  console.log('📦 Creating agency...');

  // Create Agency
  const agency = await prisma.agency.create({
    data: {
      name: 'New York State DOCS',
      state: 'NY',
    },
  });

  console.log('🏛️ Creating housing unit types...');

  // Create Housing Unit Types
  const generalPop = await prisma.housingUnitType.create({
    data: {
      agencyId: agency.id,
      name: 'General Population',
      voiceCallDurationMinutes: 30,
      videoCallDurationMinutes: 30,
      callingHoursStart: '08:00',
      callingHoursEnd: '22:00',
      maxContacts: 25,
      videoSlotDurationMinutes: 30,
      maxConcurrentVideoCalls: 10,
    },
  });

  const minSecurity = await prisma.housingUnitType.create({
    data: {
      agencyId: agency.id,
      name: 'Minimum Security',
      voiceCallDurationMinutes: 30,
      videoCallDurationMinutes: 45,
      callingHoursStart: '07:00',
      callingHoursEnd: '23:00',
      maxContacts: 30,
      videoSlotDurationMinutes: 45,
      maxConcurrentVideoCalls: 15,
    },
  });

  const restrictive = await prisma.housingUnitType.create({
    data: {
      agencyId: agency.id,
      name: 'Restrictive Housing',
      voiceCallDurationMinutes: 15,
      videoCallDurationMinutes: 15,
      callingHoursStart: '10:00',
      callingHoursEnd: '16:00',
      maxContacts: 5,
      videoSlotDurationMinutes: 15,
      maxConcurrentVideoCalls: 2,
    },
  });

  console.log('🏢 Creating facilities...');

  // Create Facilities
  const singSing = await prisma.facility.create({
    data: {
      agencyId: agency.id,
      name: 'Sing Sing Correctional Facility',
      announcementText: 'This call is from an incarcerated individual at Sing Sing Correctional Facility. This call may be monitored and recorded.',
      announcementAudioUrl: null,
    },
  });

  const bedfordHills = await prisma.facility.create({
    data: {
      agencyId: agency.id,
      name: 'Bedford Hills Correctional Facility',
      announcementText: 'This call is from an incarcerated individual at Bedford Hills Correctional Facility. This call may be monitored and recorded.',
      announcementAudioUrl: null,
    },
  });

  console.log('🏠 Creating housing units...');

  // Create Housing Units - Sing Sing
  const singSingUnitA = await prisma.housingUnit.create({
    data: {
      facilityId: singSing.id,
      unitTypeId: generalPop.id,
      name: 'Unit A',
    },
  });

  const singSingUnitB = await prisma.housingUnit.create({
    data: {
      facilityId: singSing.id,
      unitTypeId: minSecurity.id,
      name: 'Unit B',
    },
  });

  const singSingSHU = await prisma.housingUnit.create({
    data: {
      facilityId: singSing.id,
      unitTypeId: restrictive.id,
      name: 'Special Housing Unit',
    },
  });

  // Create Housing Units - Bedford Hills
  const bedfordUnitA = await prisma.housingUnit.create({
    data: {
      facilityId: bedfordHills.id,
      unitTypeId: generalPop.id,
      name: 'Unit A',
    },
  });

  const bedfordUnitB = await prisma.housingUnit.create({
    data: {
      facilityId: bedfordHills.id,
      unitTypeId: minSecurity.id,
      name: 'Unit B',
    },
  });

  const bedfordSHU = await prisma.housingUnit.create({
    data: {
      facilityId: bedfordHills.id,
      unitTypeId: restrictive.id,
      name: 'Special Housing Unit',
    },
  });

  console.log('👤 Creating incarcerated persons...');

  // Create Incarcerated Persons
  const incarceratedPersons = await Promise.all([
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: singSing.id,
        housingUnitId: singSingUnitA.id,
        firstName: 'John',
        lastName: 'Doe',
        pin: await hashPin('1234'),
        externalId: 'SS-001',
        status: PersonStatus.active,
      },
    }),
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: singSing.id,
        housingUnitId: singSingUnitA.id,
        firstName: 'Michael',
        lastName: 'Smith',
        pin: await hashPin('5678'),
        externalId: 'SS-002',
        status: PersonStatus.active,
      },
    }),
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: singSing.id,
        housingUnitId: singSingUnitB.id,
        firstName: 'Robert',
        lastName: 'Johnson',
        pin: await hashPin('9012'),
        externalId: 'SS-003',
        status: PersonStatus.active,
      },
    }),
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: singSing.id,
        housingUnitId: singSingSHU.id,
        firstName: 'David',
        lastName: 'Williams',
        pin: await hashPin('3456'),
        externalId: 'SS-004',
        status: PersonStatus.active,
      },
    }),
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: singSing.id,
        housingUnitId: singSingUnitA.id,
        firstName: 'James',
        lastName: 'Brown',
        pin: await hashPin('7890'),
        externalId: 'SS-005',
        status: PersonStatus.active,
      },
    }),
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: bedfordHills.id,
        housingUnitId: bedfordUnitA.id,
        firstName: 'Sarah',
        lastName: 'Davis',
        pin: await hashPin('2345'),
        externalId: 'BH-001',
        status: PersonStatus.active,
      },
    }),
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: bedfordHills.id,
        housingUnitId: bedfordUnitA.id,
        firstName: 'Emily',
        lastName: 'Miller',
        pin: await hashPin('6789'),
        externalId: 'BH-002',
        status: PersonStatus.active,
      },
    }),
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: bedfordHills.id,
        housingUnitId: bedfordUnitB.id,
        firstName: 'Jessica',
        lastName: 'Wilson',
        pin: await hashPin('0123'),
        externalId: 'BH-003',
        status: PersonStatus.active,
      },
    }),
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: bedfordHills.id,
        housingUnitId: bedfordSHU.id,
        firstName: 'Amanda',
        lastName: 'Moore',
        pin: await hashPin('4567'),
        externalId: 'BH-004',
        status: PersonStatus.active,
      },
    }),
    prisma.incarceratedPerson.create({
      data: {
        agencyId: agency.id,
        facilityId: bedfordHills.id,
        housingUnitId: bedfordUnitA.id,
        firstName: 'Michelle',
        lastName: 'Taylor',
        pin: await hashPin('8901'),
        externalId: 'BH-005',
        status: PersonStatus.active,
      },
    }),
  ]);

  console.log('👨‍👩‍👧 Creating family members...');

  // Create Family Members
  const familyMembers = await Promise.all([
    prisma.familyMember.create({
      data: {
        email: 'alice@example.com',
        phone: '+13478636959',
        firstName: 'Alice',
        lastName: 'Doe',
        passwordHash: await hashPassword('password123'),
      },
    }),
    prisma.familyMember.create({
      data: {
        email: 'bob@example.com',
        phone: '+15551234002',
        firstName: 'Bob',
        lastName: 'Smith',
        passwordHash: await hashPassword('password123'),
      },
    }),
    prisma.familyMember.create({
      data: {
        email: 'carol@example.com',
        phone: '+15551234003',
        firstName: 'Carol',
        lastName: 'Johnson',
        passwordHash: await hashPassword('password123'),
      },
    }),
    prisma.familyMember.create({
      data: {
        email: 'diana@example.com',
        phone: '+15551234004',
        firstName: 'Diana',
        lastName: 'Williams',
        passwordHash: await hashPassword('password123'),
      },
    }),
    prisma.familyMember.create({
      data: {
        email: 'eva@example.com',
        phone: '+15551234005',
        firstName: 'Eva',
        lastName: 'Davis',
        passwordHash: await hashPassword('password123'),
      },
    }),
    prisma.familyMember.create({
      data: {
        email: 'frank@example.com',
        phone: '+15551234006',
        firstName: 'Frank',
        lastName: 'Miller',
        passwordHash: await hashPassword('password123'),
      },
    }),
    prisma.familyMember.create({
      data: {
        email: 'grace@example.com',
        phone: '+15551234007',
        firstName: 'Grace',
        lastName: 'Wilson',
        passwordHash: await hashPassword('password123'),
      },
    }),
    prisma.familyMember.create({
      data: {
        email: 'attorney@lawfirm.com',
        phone: '+19175966881',
        firstName: 'Henry',
        lastName: 'Attorney',
        passwordHash: await hashPassword('password123'),
      },
    }),
  ]);

  console.log('👮 Creating admin users...');

  // Create Admin Users
  const agencyAdmin = await prisma.adminUser.create({
    data: {
      email: 'admin@nydocs.gov',
      passwordHash: await hashPassword('admin123'),
      firstName: 'System',
      lastName: 'Administrator',
      role: AdminRole.agency_admin,
      agencyId: agency.id,
    },
  });

  const singSingAdmin = await prisma.adminUser.create({
    data: {
      email: 'admin@singsingcf.gov',
      passwordHash: await hashPassword('admin123'),
      firstName: 'Sing Sing',
      lastName: 'Admin',
      role: AdminRole.facility_admin,
      agencyId: agency.id,
      facilityId: singSing.id,
    },
  });

  const bedfordAdmin = await prisma.adminUser.create({
    data: {
      email: 'admin@bedfordhillscf.gov',
      passwordHash: await hashPassword('admin123'),
      firstName: 'Bedford Hills',
      lastName: 'Admin',
      role: AdminRole.facility_admin,
      agencyId: agency.id,
      facilityId: bedfordHills.id,
    },
  });

  console.log('🤝 Creating approved contacts...');

  // Create Approved Contacts
  const contacts = await Promise.all([
    // John Doe's contacts
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[0].id,
        familyMemberId: familyMembers[0].id,
        relationship: 'spouse',
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: singSingAdmin.id,
      },
    }),
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[0].id,
        familyMemberId: familyMembers[7].id,
        relationship: 'attorney',
        isAttorney: true,
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: singSingAdmin.id,
      },
    }),
    // Michael Smith's contacts
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[1].id,
        familyMemberId: familyMembers[1].id,
        relationship: 'mother',
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: singSingAdmin.id,
      },
    }),
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[1].id,
        familyMemberId: familyMembers[2].id,
        relationship: 'sibling',
        status: ContactStatus.pending,
      },
    }),
    // Robert Johnson's contacts
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[2].id,
        familyMemberId: familyMembers[2].id,
        relationship: 'spouse',
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: singSingAdmin.id,
      },
    }),
    // David Williams's contacts
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[3].id,
        familyMemberId: familyMembers[3].id,
        relationship: 'mother',
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: singSingAdmin.id,
      },
    }),
    // Sarah Davis's contacts
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[5].id,
        familyMemberId: familyMembers[4].id,
        relationship: 'daughter',
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: bedfordAdmin.id,
      },
    }),
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[5].id,
        familyMemberId: familyMembers[7].id,
        relationship: 'attorney',
        isAttorney: true,
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: bedfordAdmin.id,
      },
    }),
    // Emily Miller's contacts
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[6].id,
        familyMemberId: familyMembers[5].id,
        relationship: 'father',
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: bedfordAdmin.id,
      },
    }),
    // Jessica Wilson's contacts
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[7].id,
        familyMemberId: familyMembers[6].id,
        relationship: 'spouse',
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: bedfordAdmin.id,
      },
    }),
    // Amanda Moore - pending contact
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[8].id,
        familyMemberId: familyMembers[0].id,
        relationship: 'friend',
        status: ContactStatus.pending,
      },
    }),
    // Michelle Taylor's contacts
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[9].id,
        familyMemberId: familyMembers[1].id,
        relationship: 'mother',
        status: ContactStatus.approved,
        reviewedAt: new Date(),
        reviewedBy: bedfordAdmin.id,
      },
    }),
    // Denied contact example
    prisma.approvedContact.create({
      data: {
        incarceratedPersonId: incarceratedPersons[4].id,
        familyMemberId: familyMembers[3].id,
        relationship: 'friend',
        status: ContactStatus.denied,
        reviewedAt: new Date(),
        reviewedBy: singSingAdmin.id,
      },
    }),
  ]);

  console.log('📞 Creating sample voice calls...');

  // Create Sample Voice Calls
  const voiceCalls = await Promise.all([
    prisma.voiceCall.create({
      data: {
        incarceratedPersonId: incarceratedPersons[0].id,
        familyMemberId: familyMembers[0].id,
        facilityId: singSing.id,
        status: VoiceCallStatus.completed,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        connectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000),
        endedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 1800000),
        durationSeconds: 1770,
        endedBy: CallEndedBy.time_limit,
      },
    }),
    prisma.voiceCall.create({
      data: {
        incarceratedPersonId: incarceratedPersons[1].id,
        familyMemberId: familyMembers[1].id,
        facilityId: singSing.id,
        status: VoiceCallStatus.completed,
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        connectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 20000),
        endedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 900000),
        durationSeconds: 880,
        endedBy: CallEndedBy.caller,
      },
    }),
    prisma.voiceCall.create({
      data: {
        incarceratedPersonId: incarceratedPersons[5].id,
        familyMemberId: familyMembers[4].id,
        facilityId: bedfordHills.id,
        status: VoiceCallStatus.missed,
        startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log('📹 Creating sample video calls...');

  // Create Sample Video Calls
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const videoCalls = await Promise.all([
    prisma.videoCall.create({
      data: {
        incarceratedPersonId: incarceratedPersons[0].id,
        familyMemberId: familyMembers[0].id,
        facilityId: singSing.id,
        status: VideoCallStatus.completed,
        scheduledStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1800000),
        actualStart: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60000),
        actualEnd: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1800000),
        durationSeconds: 1740,
        requestedBy: familyMembers[0].id,
        approvedBy: singSingAdmin.id,
        endedBy: VideoEndedBy.time_limit,
      },
    }),
    prisma.videoCall.create({
      data: {
        incarceratedPersonId: incarceratedPersons[5].id,
        familyMemberId: familyMembers[4].id,
        facilityId: bedfordHills.id,
        status: VideoCallStatus.scheduled,
        scheduledStart: tomorrow,
        scheduledEnd: new Date(tomorrow.getTime() + 1800000),
        requestedBy: familyMembers[4].id,
        approvedBy: bedfordAdmin.id,
      },
    }),
    prisma.videoCall.create({
      data: {
        incarceratedPersonId: incarceratedPersons[6].id,
        familyMemberId: familyMembers[5].id,
        facilityId: bedfordHills.id,
        status: VideoCallStatus.requested,
        scheduledStart: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        scheduledEnd: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000 + 1800000),
        requestedBy: familyMembers[5].id,
      },
    }),
  ]);

  console.log('💬 Creating sample conversations and messages...');

  // Create Sample Conversations and Messages
  const conversation1 = await prisma.conversation.create({
    data: {
      incarceratedPersonId: incarceratedPersons[0].id,
      familyMemberId: familyMembers[0].id,
    },
  });

  const conversation2 = await prisma.conversation.create({
    data: {
      incarceratedPersonId: incarceratedPersons[5].id,
      familyMemberId: familyMembers[4].id,
    },
  });

  // Create Messages
  await Promise.all([
    prisma.message.create({
      data: {
        conversationId: conversation1.id,
        senderType: SenderType.incarcerated,
        senderId: incarceratedPersons[0].id,
        body: 'Hi Alice, I hope you are doing well. I miss you.',
        status: MessageStatus.delivered,
        deliveredAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        readAt: new Date(Date.now() - 47 * 60 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversation1.id,
        senderType: SenderType.family,
        senderId: familyMembers[0].id,
        body: 'I miss you too! The kids are doing great in school.',
        status: MessageStatus.delivered,
        deliveredAt: new Date(Date.now() - 46 * 60 * 60 * 1000),
        readAt: new Date(Date.now() - 45 * 60 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversation1.id,
        senderType: SenderType.incarcerated,
        senderId: incarceratedPersons[0].id,
        body: 'That is wonderful to hear. Can we schedule a video call for this weekend?',
        status: MessageStatus.delivered,
        deliveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        readAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversation2.id,
        senderType: SenderType.family,
        senderId: familyMembers[4].id,
        body: 'Mom, I got the job! Starting next week.',
        status: MessageStatus.pending_review,
      },
    }),
  ]);

  console.log('📅 Creating video call time slots...');

  // Create Video Call Time Slots
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    // General population slots
    await prisma.videoCallTimeSlot.create({
      data: {
        facilityId: singSing.id,
        housingUnitTypeId: generalPop.id,
        dayOfWeek,
        startTime: '09:00',
        endTime: '12:00',
        maxConcurrent: 10,
      },
    });
    await prisma.videoCallTimeSlot.create({
      data: {
        facilityId: singSing.id,
        housingUnitTypeId: generalPop.id,
        dayOfWeek,
        startTime: '14:00',
        endTime: '17:00',
        maxConcurrent: 10,
      },
    });
    await prisma.videoCallTimeSlot.create({
      data: {
        facilityId: bedfordHills.id,
        housingUnitTypeId: generalPop.id,
        dayOfWeek,
        startTime: '09:00',
        endTime: '12:00',
        maxConcurrent: 10,
      },
    });
    await prisma.videoCallTimeSlot.create({
      data: {
        facilityId: bedfordHills.id,
        housingUnitTypeId: generalPop.id,
        dayOfWeek,
        startTime: '14:00',
        endTime: '17:00',
        maxConcurrent: 10,
      },
    });
  }

  console.log('🚫 Creating blocked number example...');

  // Create a Blocked Number
  await prisma.blockedNumber.create({
    data: {
      phoneNumber: '+15559999999',
      scope: BlockedScope.agency,
      agencyId: agency.id,
      reason: 'Spam caller',
      blockedBy: agencyAdmin.id,
    },
  });

  console.log('⚙️  Creating system configuration...');

  // Create default system configuration
  await prisma.systemConfiguration.create({
    data: {
      key: 'sms_send_setting',
      value: 'NO_SMS',
      description: 'Controls SMS before voice calls: NO_SMS, SEND_SMS (no inmate name), SEND_SMS_WITH_NAME (includes inmate name and facility)',
    },
  });

  await prisma.systemConfiguration.create({
    data: {
      key: 'announcement_include_name',
      value: 'YES',
      description: 'Controls whether to include the person\'s name in the announcement: YES, NO',
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('========================');
  console.log('');
  console.log('Incarcerated Person PINs:');
  console.log('  John Doe (SS-001): 1234');
  console.log('  Michael Smith (SS-002): 5678');
  console.log('  Robert Johnson (SS-003): 9012');
  console.log('  David Williams (SS-004): 3456');
  console.log('  James Brown (SS-005): 7890');
  console.log('  Sarah Davis (BH-001): 2345');
  console.log('  Emily Miller (BH-002): 6789');
  console.log('  Jessica Wilson (BH-003): 0123');
  console.log('  Amanda Moore (BH-004): 4567');
  console.log('  Michelle Taylor (BH-005): 8901');
  console.log('');
  console.log('Family Members:');
  console.log('  alice@example.com / password123');
  console.log('  bob@example.com / password123');
  console.log('  carol@example.com / password123');
  console.log('  diana@example.com / password123');
  console.log('  eva@example.com / password123');
  console.log('  frank@example.com / password123');
  console.log('  grace@example.com / password123');
  console.log('  attorney@lawfirm.com / password123');
  console.log('');
  console.log('Admin Users:');
  console.log('  Agency Admin: admin@nydocs.gov / admin123');
  console.log('  Sing Sing Admin: admin@singsingcf.gov / admin123');
  console.log('  Bedford Hills Admin: admin@bedfordhillscf.gov / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
