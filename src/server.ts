import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';

const app = express();
app.use(express.json());

const prisma = new PrismaClient();
const ai = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    }) 
  : null;

// Helper to handle model transient errors and auto-retry/fallback gracefully
async function generateGeminiContentWithRetry(params: {
  contents: any;
  config?: any;
  systemInstruction?: string;
}) {
  if (!ai) throw new Error('Gemini API not configured');
  
  // We prioritize gemini-3.5-flash and fallback to gemini-3.1-flash-lite if overloaded
  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;
  
  for (const model of modelsToTry) {
    let retries = 3;
    let delay = 1000;
    
    while (retries > 0) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            ...params.config,
            ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
          },
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMessage = err.message || '';
        const isTransient = 
          errMessage.includes('503') || 
          errMessage.includes('Service Unavailable') || 
          errMessage.includes('high demand') || 
          errMessage.includes('429') || 
          errMessage.includes('RESOURCE_EXHAUSTED') ||
          errMessage.includes('UNAVAILABLE');
          
        if (isTransient) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
            continue;
          }
        }
        break;
      }
    }
  }
  
  throw lastError || new Error('Failed to generate content from Gemini API');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-for-hackathon-only';
const PORT = 3000;

// --- AUTH MIDDLEWARE ---
export interface AuthRequest extends Request {
  userId?: string;
}

const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- TASK ROUTES ---
app.get('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      include: { aiPlans: true },
      orderBy: [
        { priority: 'asc' }, // Warning: Wait we need better ordering based on aiScore maybe
        { deadline: 'asc' }
      ]
    });
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const task = await prisma.task.create({
      data: {
        ...req.body,
        userId: req.userId
      }
    });
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const task = await prisma.task.update({
      where: { id: req.params.id, userId: req.userId },
      data: req.body
    });
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.task.delete({
      where: { id: req.params.id, userId: req.userId }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI ANALYZE TASK ---
app.post('/api/ai/analyze-task', requireAuth, async (req: AuthRequest, res) => {
  if (!ai) return res.status(500).json({ error: 'Gemini API not configured' });
  try {
    const { text } = req.body;
    const prompt = `Analyze the following task description and extract the details.
Return ONLY a valid JSON object matching this schema:
{
  "title": string (A concise task title, e.g., "Interview Preparation"),
  "description": string (rephrased input or empty),
  "deadline": string (ISO 8601 date, or null),
  "priority": "Critical" | "High" | "Medium" | "Low",
  "difficulty": "High" | "Medium" | "Low",
  "estimatedTime": number (estimated minutes to complete, or null)
}
Input task description: "${text}"`;

    const response = await generateGeminiContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const output = response.text || "{}";
    const parsed = JSON.parse(output);
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI BREAKDOWN TASK ---
app.post('/api/ai/create-plan', requireAuth, async (req: AuthRequest, res) => {
  if (!ai) return res.status(500).json({ error: 'Gemini API not configured' });
  try {
    const { taskId, description } = req.body;
    const prompt = `Break down the following task into 3 to 7 sequential actionable steps.
Task: "${description}"
Return ONLY a valid JSON Array of strings representing the steps. Example: ["Step 1 format", "Step 2 format"]`;
    
    const response = await generateGeminiContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const steps: string[] = JSON.parse(response.text || "[]");
    
    // Save to DB
    const plans = await Promise.all(steps.map(step => 
       prisma.aIPlan.create({
         data: {
           taskId,
           step
         }
       })
    ));

    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- DASHBOARD DATA ---
app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      include: { aiPlans: true }
    });

    // Compute metrics
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
    const today = new Date();
    // Simplified: any task with deadline today or overdue
    const priorityTasks = tasks.filter(t => t.priority === 'Critical' || t.priority === 'High');
    const score = completedTasks * 10 - tasks.filter(t => t.status === 'Overdue').length * 5;

    res.json({
      metrics: {
        score: Math.max(0, score),
        completedCount: completedTasks,
        pendingCount: pendingTasks,
        totalTasks: tasks.length
      },
      priorityTasks,
      recentTasks: tasks.slice(0, 5)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI CHATBOT ---
app.post('/api/ai/chat', requireAuth, async (req: AuthRequest, res) => {
  if (!ai) return res.status(500).json({ error: 'Gemini API not configured' });
  try {
    const { message, history } = req.body;

    const systemInstruction = `You are LifePilot AI, an intelligent agent that plans, predicts, prioritizes, and helps users complete tasks before deadlines. Provide actionable, concise productivity guidance.`;

    const response = await generateGeminiContentWithRetry({
      contents: message,
      systemInstruction
    });

    res.json({ text: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Vite Middleware & Server start ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
