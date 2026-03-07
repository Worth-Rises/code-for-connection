"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🔍 Testing database connection...\n');
    // Test 1: Count agencies
    const agencyCount = await prisma.agency.count();
    console.log(`✅ Agencies in database: ${agencyCount}`);
    // Test 2: Fetch all facilities
    const facilities = await prisma.facility.findMany({
        include: {
            agency: true
        }
    });
    console.log(`✅ Facilities in database: ${facilities.length}`);
    facilities.forEach(f => {
        console.log(`   - ${f.name} (${f.agency.name})`);
    });
    // Test 3: Get incarcerated persons
    const persons = await prisma.incarceratedPerson.findMany({
        take: 3,
        include: {
            facility: true,
            housingUnit: true
        }
    });
    console.log(`\n✅ Sample incarcerated persons:`);
    persons.forEach(p => {
        console.log(`   - ${p.firstName} ${p.lastName} (${p.externalId}) at ${p.facility.name}, ${p.housingUnit.name}`);
    });
    // Test 4: Get family members
    const familyMembers = await prisma.familyMember.findMany({
        take: 3
    });
    console.log(`\n✅ Sample family members:`);
    familyMembers.forEach(f => {
        console.log(`   - ${f.firstName} ${f.lastName} (${f.email})`);
    });
    // Test 5: Get approved contacts with relationships
    const contacts = await prisma.approvedContact.findMany({
        where: { status: 'approved' },
        take: 3,
        include: {
            incarceratedPerson: true,
            familyMember: true
        }
    });
    console.log(`\n✅ Sample approved contacts:`);
    contacts.forEach(c => {
        console.log(`   - ${c.incarceratedPerson.firstName} ${c.incarceratedPerson.lastName} ↔️ ${c.familyMember.firstName} ${c.familyMember.lastName} (${c.relationship})`);
    });
    console.log('\n🎉 Database is working perfectly!\n');
}
main()
    .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=test-db.js.map