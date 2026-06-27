import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: "Test User", email: "test2@example.com", password: "password123" })
  });
  console.log(res.status);
  const data = await res.json();
  console.log(data);
}

test().catch(console.error);
