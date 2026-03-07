"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}
async function hashPin(pin) {
    return bcrypt.hash(pin, 10);
}
async function main() {
    console.log('🌱 Starting seed...');
    // Clear existing data
    await prisma.flaggedContent.deleteMany();
    await prisma.keywordAlert.deleteMany();
    await prisma.dailyUsage.deleteMany();
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
            clearanceLevel: client_1.ClearanceLevel.general,
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
            clearanceLevel: client_1.ClearanceLevel.minimum,
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
            clearanceLevel: client_1.ClearanceLevel.restricted,
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
                status: client_1.PersonStatus.active,
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
                status: client_1.PersonStatus.active,
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
                status: client_1.PersonStatus.active,
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
                status: client_1.PersonStatus.active,
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
                status: client_1.PersonStatus.active,
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
                status: client_1.PersonStatus.active,
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
                status: client_1.PersonStatus.active,
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
                status: client_1.PersonStatus.active,
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
                status: client_1.PersonStatus.active,
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
                status: client_1.PersonStatus.active,
            },
        }),
    ]);
    console.log('👨‍👩‍👧 Creating family members...');
    // Create Family Members
    const familyMembers = await Promise.all([
        prisma.familyMember.create({
            data: {
                email: 'alice@example.com',
                phone: '+15551234001',
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
                phone: '+15551234008',
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
            role: client_1.AdminRole.agency_admin,
            agencyId: agency.id,
        },
    });
    const singSingAdmin = await prisma.adminUser.create({
        data: {
            email: 'admin@singsingcf.gov',
            passwordHash: await hashPassword('admin123'),
            firstName: 'Sing Sing',
            lastName: 'Admin',
            role: client_1.AdminRole.facility_admin,
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
            role: client_1.AdminRole.facility_admin,
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
                status: client_1.ContactStatus.approved,
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
                status: client_1.ContactStatus.approved,
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
                status: client_1.ContactStatus.approved,
                reviewedAt: new Date(),
                reviewedBy: singSingAdmin.id,
            },
        }),
        prisma.approvedContact.create({
            data: {
                incarceratedPersonId: incarceratedPersons[1].id,
                familyMemberId: familyMembers[2].id,
                relationship: 'sibling',
                status: client_1.ContactStatus.pending,
            },
        }),
        // Robert Johnson's contacts
        prisma.approvedContact.create({
            data: {
                incarceratedPersonId: incarceratedPersons[2].id,
                familyMemberId: familyMembers[2].id,
                relationship: 'spouse',
                status: client_1.ContactStatus.approved,
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
                status: client_1.ContactStatus.approved,
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
                status: client_1.ContactStatus.approved,
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
                status: client_1.ContactStatus.approved,
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
                status: client_1.ContactStatus.approved,
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
                status: client_1.ContactStatus.approved,
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
                status: client_1.ContactStatus.pending,
            },
        }),
        // Michelle Taylor's contacts
        prisma.approvedContact.create({
            data: {
                incarceratedPersonId: incarceratedPersons[9].id,
                familyMemberId: familyMembers[1].id,
                relationship: 'mother',
                status: client_1.ContactStatus.approved,
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
                status: client_1.ContactStatus.denied,
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
                status: client_1.VoiceCallStatus.completed,
                startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                connectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000),
                endedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 1800000),
                durationSeconds: 1770,
                endedBy: client_1.CallEndedBy.time_limit,
            },
        }),
        prisma.voiceCall.create({
            data: {
                incarceratedPersonId: incarceratedPersons[1].id,
                familyMemberId: familyMembers[1].id,
                facilityId: singSing.id,
                status: client_1.VoiceCallStatus.completed,
                startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                connectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 20000),
                endedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 900000),
                durationSeconds: 880,
                endedBy: client_1.CallEndedBy.caller,
            },
        }),
        prisma.voiceCall.create({
            data: {
                incarceratedPersonId: incarceratedPersons[5].id,
                familyMemberId: familyMembers[4].id,
                facilityId: bedfordHills.id,
                status: client_1.VoiceCallStatus.missed,
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
                status: client_1.VideoCallStatus.completed,
                scheduledStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
                scheduledEnd: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1800000),
                actualStart: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60000),
                actualEnd: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1800000),
                durationSeconds: 1740,
                requestedBy: familyMembers[0].id,
                approvedBy: singSingAdmin.id,
                endedBy: client_1.VideoEndedBy.time_limit,
            },
        }),
        prisma.videoCall.create({
            data: {
                incarceratedPersonId: incarceratedPersons[5].id,
                familyMemberId: familyMembers[4].id,
                facilityId: bedfordHills.id,
                status: client_1.VideoCallStatus.scheduled,
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
                status: client_1.VideoCallStatus.requested,
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
                senderType: client_1.SenderType.incarcerated,
                senderId: incarceratedPersons[0].id,
                body: 'Hi Alice, I hope you are doing well. I miss you.',
                status: client_1.MessageStatus.delivered,
                deliveredAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
                readAt: new Date(Date.now() - 47 * 60 * 60 * 1000),
            },
        }),
        prisma.message.create({
            data: {
                conversationId: conversation1.id,
                senderType: client_1.SenderType.family,
                senderId: familyMembers[0].id,
                body: 'I miss you too! The kids are doing great in school.',
                status: client_1.MessageStatus.delivered,
                deliveredAt: new Date(Date.now() - 46 * 60 * 60 * 1000),
                readAt: new Date(Date.now() - 45 * 60 * 60 * 1000),
            },
        }),
        prisma.message.create({
            data: {
                conversationId: conversation1.id,
                senderType: client_1.SenderType.incarcerated,
                senderId: incarceratedPersons[0].id,
                body: 'That is wonderful to hear. Can we schedule a video call for this weekend?',
                status: client_1.MessageStatus.delivered,
                deliveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                readAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
            },
        }),
        prisma.message.create({
            data: {
                conversationId: conversation2.id,
                senderType: client_1.SenderType.family,
                senderId: familyMembers[4].id,
                body: 'Mom, I got the job! Starting next week.',
                status: client_1.MessageStatus.pending_review,
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
            scope: client_1.BlockedScope.agency,
            agencyId: agency.id,
            reason: 'Spam caller',
            blockedBy: agencyAdmin.id,
        },
    });
    console.log('🔍 Creating keyword alerts...');
    await Promise.all([
        prisma.keywordAlert.create({
            data: {
                keyword: 'heroin',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'fentanyl',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'methamphetamine',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'cocaine',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'crack',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'molly',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'ecstasy',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'xanax',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'percocet',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'oxycodone',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'suboxone',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'marijuana',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'kush',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'edibles',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'shank',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.violence,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'shiv',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.violence,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'weapon',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.violence,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'gun',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.violence,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'knife',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.violence,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'kill',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.violence,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'murder',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.violence,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'stab',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.blacklist,
                category: client_1.WordCategory.violence,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'take care of',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.coded_threat,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'handle the situation',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.coded_threat,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'deal with him',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.coded_threat,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'make it right',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.coded_threat,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'send him a message',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.coded_threat,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'green light',
                isRegex: false,
                severity: client_1.AlertSeverity.high,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.coded_threat,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'candy',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'snow',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'ice',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'package',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'care package',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'vitamins',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'supplements',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.drug,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'throw it over',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.contraband,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'the bird',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.contraband,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'drone',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.contraband,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'drop',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.contraband,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'mailroom',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.greylist,
                category: client_1.WordCategory.contraband,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'hood',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.watchlist,
                category: client_1.WordCategory.gang,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'set',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.watchlist,
                category: client_1.WordCategory.gang,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'gang',
                isRegex: false,
                severity: client_1.AlertSeverity.medium,
                tier: client_1.WordTier.watchlist,
                category: client_1.WordCategory.gang,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'turf',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.watchlist,
                category: client_1.WordCategory.gang,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'colors',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.watchlist,
                category: client_1.WordCategory.gang,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
        prisma.keywordAlert.create({
            data: {
                keyword: 'represent',
                isRegex: false,
                severity: client_1.AlertSeverity.low,
                tier: client_1.WordTier.watchlist,
                category: client_1.WordCategory.gang,
                agencyId: agency.id,
                createdBy: agencyAdmin.id,
            },
        }),
    ]);
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
//# sourceMappingURL=seed.js.map