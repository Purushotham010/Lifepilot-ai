import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../lib/api';
import { Plus, Sparkles, Loader2, Calendar, Target, Clock, AlertCircle, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInput, setAiInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [breakingDown, setBreakingDown] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await fetchAPI('/tasks');
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAiCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setAnalyzing(true);
    try {
      const analyzed = await fetchAPI('/ai/analyze-task', {
        method: 'POST',
        body: JSON.stringify({ text: aiInput })
      });
      
      const newTask = await fetchAPI('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: analyzed.title || 'Untitled Task',
          description: analyzed.description || '',
          priority: analyzed.priority || 'Medium',
          difficulty: analyzed.difficulty || 'Medium',
          estimatedTime: analyzed.estimatedTime || 60,
          deadline: analyzed.deadline ? new Date(analyzed.deadline).toISOString() : null
        })
      });

      setTasks(prev => [...prev, newTask]);
      setAiInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBreakdown = async (taskId: string, description: string) => {
    setBreakingDown(taskId);
    try {
      await fetchAPI('/ai/create-plan', {
        method: 'POST',
        body: JSON.stringify({ taskId, description })
      });
      await loadTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setBreakingDown(null);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await fetchAPI(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      loadTasks();
    } catch(err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-bright-teal" /></div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-off-white">Task Intelligence</h1>
        <p className="text-slate-400">Plan, capture, and break down your goals automatically.</p>
      </div>

      <div className="bg-deep-space-violet/40 p-6 rounded-[20px] border border-rich-violet/60 backdrop-blur-sm shadow-none">
        <h2 className="text-lg font-semibold flex items-center mb-4 text-off-white">
          <Sparkles className="w-5 h-5 text-bright-teal mr-2 animate-pulse" />
          AI Task Capture
        </h2>
        <form onSubmit={handleAiCreate} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            placeholder="e.g. I have an interview on June 25th and need preparation"
            className="flex-1 px-4 py-3 bg-deep-space-violet border border-rich-violet/80 text-off-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-bright-teal focus:border-transparent transition-all"
          />
          <button 
            type="submit" 
            disabled={analyzing || !aiInput.trim()}
            className="px-6 py-3 bg-bright-teal text-deep-space-violet font-medium rounded-lg disabled:opacity-50 hover:bg-bright-teal/90 transition-colors shadow-none"
          >
            {analyzing ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-deep-space-violet" /> : 'Analyze & Add'}
          </button>
        </form>
      </div>

      <div className="grid gap-4">
        <AnimatePresence>
          {tasks.map(task => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={task.id} 
              className={`bg-deep-space-violet/40 rounded-[20px] p-5 border backdrop-blur-sm transition-all shadow-none ${
                task.priority === 'Critical' ? 'border-rose-500/30 bg-rose-950/10' : 'border-rich-violet/60 hover:border-rich-violet/90'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`text-lg font-semibold ${task.status === 'Completed' ? 'line-through text-slate-500' : 'text-off-white'}`}>{task.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${task.priority === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                        task.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                        'bg-rich-violet/30 text-slate-300 border border-rich-violet/60'}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{task.description}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                  {task.deadline && (
                    <div className="flex items-center gap-1.5 bg-deep-space-violet/60 px-3 py-1.5 rounded-lg border border-rich-violet/60">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      {new Date(task.deadline).toLocaleDateString()}
                    </div>
                  )}
                  {task.estimatedTime && (
                    <div className="flex items-center gap-1.5 bg-deep-space-violet/60 px-3 py-1.5 rounded-lg border border-rich-violet/60">
                      <Clock className="w-4 h-4 text-slate-500" />
                      {task.estimatedTime}m
                    </div>
                  )}
                  <select 
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                    className="bg-deep-space-violet border border-rich-violet/80 text-slate-300 text-sm rounded-lg focus:ring-bright-teal focus:border-bright-teal block px-2.5 py-1.5"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* AI Plan Section */}
              <div className="mt-5 border-t border-rich-violet/60 pt-4">
                {task.aiPlans && task.aiPlans.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-bright-teal" /> Action Plan
                    </h4>
                    <ul className="space-y-2">
                      {task.aiPlans.map((plan: any) => (
                        <li key={plan.id} className="flex items-start text-sm text-slate-300 bg-deep-space-violet/40 px-3 py-2 rounded-lg border border-rich-violet/40">
                          <CheckSquare className="w-4 h-4 mr-2 mt-0.5 text-bright-teal shrink-0" />
                          <span>{plan.step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleBreakdown(task.id, task.description || task.title)}
                    disabled={breakingDown === task.id}
                    className="text-sm font-medium text-bright-teal hover:text-bright-teal/80 flex items-center gap-1.5 transition-colors"
                  >
                    {breakingDown === task.id ? <Loader2 className="w-4 h-4 animate-spin text-bright-teal" /> : <Sparkles className="w-4 h-4" />}
                    Break down with AI
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="text-center py-20 bg-deep-space-violet/20 rounded-[20px] border border-dashed border-rich-violet/60">
            <h3 className="text-lg font-medium text-slate-300">No tasks yet</h3>
            <p className="text-slate-500 mt-1">Use the AI capture above to plan your first project.</p>
          </div>
        )}
      </div>
    </div>
  );
}
