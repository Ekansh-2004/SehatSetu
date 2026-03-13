import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDuplicatePatients() {
  console.log('🔍 Checking for duplicate patients...\n')

  // Find duplicate emails first
  const emailDuplicates = await prisma.$queryRaw<Array<{ email: string; count: number }>>`
    SELECT email, COUNT(*) as count 
    FROM patients 
    GROUP BY email 
    HAVING COUNT(*) > 1
  `

  // Find duplicate phones
  const phoneDuplicates = await prisma.$queryRaw<Array<{ phone: string; count: number }>>`
    SELECT phone, COUNT(*) as count 
    FROM patients 
    GROUP BY phone 
    HAVING COUNT(*) > 1
  `

  console.log(`Found ${emailDuplicates.length} duplicate emails`)
  console.log(`Found ${phoneDuplicates.length} duplicate phone numbers\n`)

  if (emailDuplicates.length === 0 && phoneDuplicates.length === 0) {
    console.log('✅ No duplicates found!')
    return
  }

  // Handle email duplicates first
  for (const dup of emailDuplicates) {
    console.log(`📧 Processing duplicate email: ${dup.email}`)
    
    const patients = await prisma.patient.findMany({
      where: { email: dup.email },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`   Found ${patients.length} patients with this email`)
    console.log(`   Keeping: ${patients[0].name} (${patients[0].phone}) - ID: ${patients[0].id}`)

    for (let i = 1; i < patients.length; i++) {
      const patient = patients[i]
      const newEmail = `${patient.email}_dup${i}`
      const newPhone = `${patient.phone}_dup${i}`
      
      console.log(`   Updating: ${patient.name}`)
      console.log(`     Email: ${patient.email} → ${newEmail}`)
      console.log(`     Phone: ${patient.phone} → ${newPhone}`)
      
      await prisma.patient.update({
        where: { id: patient.id },
        data: { 
          email: newEmail,
          phone: newPhone
        }
      })
      
      console.log(`   ✓ Updated patient ID: ${patient.id}\n`)
    }
  }

  // Handle each duplicate phone
  for (const dup of phoneDuplicates) {
    console.log(`📱 Processing duplicate phone: ${dup.phone}`)
    
    // Get all patients with this phone, ordered by creation date
    const patients = await prisma.patient.findMany({
      where: { phone: dup.phone },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`   Found ${patients.length} patients with this phone`)
    console.log(`   Keeping: ${patients[0].name} (${patients[0].email}) - ID: ${patients[0].id}`)

    // Keep the first one, update the rest
    for (let i = 1; i < patients.length; i++) {
      const patient = patients[i]
      const newPhone = `${patient.phone}_dup${i}`
      const newEmail = patient.email.includes('_dup') ? patient.email : `${patient.email}_dup${i}`
      
      console.log(`   Updating: ${patient.name} (${patient.email})`)
      console.log(`     Phone: ${patient.phone} → ${newPhone}`)
      console.log(`     Email: ${patient.email} → ${newEmail}`)
      
      await prisma.patient.update({
        where: { id: patient.id },
        data: { 
          phone: newPhone,
          email: newEmail
        }
      })
      
      console.log(`   ✓ Updated patient ID: ${patient.id}\n`)
    }
  }


  console.log('\n✅ Cleanup complete!')
  console.log('\nNow you can run: npx prisma db push')
}

cleanDuplicatePatients()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
