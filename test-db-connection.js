#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");

// Create a test TypeScript file
const testContent = `
import { prisma } from './src/lib/db/prisma';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Try to count existing doctors and patients
    const doctorCount = await prisma.doctor.count();
    const patientCount = await prisma.patient.count();
    
    console.log('✓ Database is connected!');
    console.log(\`  Doctors in DB: \${doctorCount}\`);
    console.log(\`  Patients in DB: \${patientCount}\`);
    
    // Try to verify schema
    const result = await prisma.$queryRaw\`SELECT version();\`;
    console.log('✓ Database query working');
    
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
`;

require("fs").writeFileSync(path.join(__dirname, "test-db.ts"), testContent);

// Run with tsx
const child = spawn("npx", ["tsx", "test-db.ts"], {
	cwd: __dirname,
	stdio: "inherit",
});

child.on("close", (code) => {
	require("fs").unlinkSync(path.join(__dirname, "test-db.ts"));
	process.exit(code);
});
