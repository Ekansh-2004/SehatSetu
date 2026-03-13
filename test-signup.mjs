import fetch from 'node-fetch'; // NextJS global fetch is usually available or we use node built-in
import { writeFileSync } from 'fs';
// Using native fetch in node 20+

async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/patient/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "test.fail@example.com",
        phone: null,
        countryCode: "+1",
        dateOfBirth: "1990-01-01",
        gender: "female",
        password: "password123",
        consentToAlerts: false
      })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    writeFileSync('test-out.json', text);
    console.log("Wrote to test-out.json");
  } catch (err) {
    console.error(err);
  }
}

run();
