import fetch from 'node-fetch';

async function test() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "test2@example.com", password: "password123" })
  });
  const { token, user } = await loginRes.json();
  
  const createTask = await fetch('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ title: "Test task", description: "Test", priority: "High", riskLevel: "Low", status: "Pending" })
  });
  const task = await createTask.json();
  console.log("Created task:", task.id);

  const createPlan = await fetch('http://localhost:3000/api/ai/create-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ taskId: task.id, description: "Write a small nodejs test script" })
  });
  console.log("Create Plan status:", createPlan.status);
  const planData = await createPlan.json();
  console.log("Plan output:", planData);
}

test().catch(console.error);
