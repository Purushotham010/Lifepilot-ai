import { useState, useEffect } from 'react';
import { fetchAPI } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { Target, Activity, CheckSquare, Clock, ArrowRight, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAPI('/dashboard')
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-off-white">Good morning, {user?.name ? user.name.split(' ')[0] : 'User'}</h1>
        <p className="text-slate-400 mt-1">Here is your productivity snapshot for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-deep-space-violet/40 p-6 rounded-[20px] border border-rich-violet/60 backdrop-blur-sm shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-300 font-sans">Productivity Score</h3>
            <div className="p-2 bg-bright-teal/10 rounded-lg"><Activity className="w-5 h-5 text-bright-teal" /></div>
          </div>
          <div className="text-4xl font-bold text-off-white">{data.metrics.score}</div>
          <p className="text-sm text-slate-400 mt-2 flex items-center">
             Based on completion rate
          </p>
        </div>

        <div className="bg-deep-space-violet/40 p-6 rounded-[20px] border border-rich-violet/60 backdrop-blur-sm shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-300 font-sans">Pending Tasks</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg"><Clock className="w-5 h-5 text-amber-400" /></div>
          </div>
          <div className="text-4xl font-bold text-off-white">{data.metrics.pendingCount}</div>
          <p className="text-sm text-slate-400 mt-2">Active items on your plate</p>
        </div>

        <div className="bg-deep-space-violet/40 p-6 rounded-[20px] border border-rich-violet/60 backdrop-blur-sm shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-300 font-sans">Completed Tasks</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckSquare className="w-5 h-5 text-emerald-400" /></div>
          </div>
          <div className="text-4xl font-bold text-off-white">{data.metrics.completedCount}</div>
          <p className="text-sm text-slate-400 mt-2">Great job staying on track!</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-rich-violet/20 via-deep-space-violet to-rich-violet/10 rounded-[20px] p-8 text-off-white flex flex-col md:flex-row items-center justify-between border border-bright-teal/20 shadow-none">
        <div className="mb-6 md:mb-0 max-w-lg">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-bright-teal" />
            AI Daily Briefing
          </h2>
          <p className="text-slate-300 leading-relaxed">
            You have <strong className="text-bright-teal bg-bright-teal/10 px-1.5 py-0.5 rounded border border-bright-teal/20">{data.priorityTasks.length} high priority</strong> tasks today. 
            I recommend starting with "{data.priorityTasks[0]?.title || 'planning your day'}" to maximize your uninterrupted focus blocks.
          </p>
        </div>
        <Link to="/tasks" className="px-6 py-3 bg-bright-teal text-deep-space-violet font-semibold rounded-lg hover:bg-bright-teal/90 transition flex items-center gap-2 shrink-0 shadow-none">
          View Agenda <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
