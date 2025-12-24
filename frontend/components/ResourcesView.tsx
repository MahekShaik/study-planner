
import React, { useState, useEffect } from 'react';
import { StudyTask, StudyResource } from '../types';
import { getAIResources } from '../services/geminiService';

interface ResourcesViewProps {
  task: StudyTask | null;
  onBack: () => void;
}

const ResourcesView: React.FC<ResourcesViewProps> = ({ task, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<StudyResource[]>([]);

  useEffect(() => {
    if (task) {
      const load = async () => {
        const res = await getAIResources(task.topic, task.subject);
        setResources(res);
        setLoading(false);
      };
      load();
    }
  }, [task]);

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
       <div className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
            <h1 className="text-3xl font-light text-slate-800">Resources</h1>
            <p className="text-slate-500">Curated materials for {task?.topic}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-400 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">Finding relevant materials via Google Search...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {resources.map((r, i) => (
            <a 
              key={i} 
              href={r.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block p-6 bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                  {r.type}
                </span>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-2 group-hover:text-indigo-900">{r.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{r.description}</p>
            </a>
          ))}
          {resources.length === 0 && (
            <div className="text-center py-20 text-slate-400 italic">
              No specific resources found for this exact topic right now.
            </div>
          )}
        </div>
      )}

      <div className="mt-12 p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100/50">
        <p className="text-xs text-indigo-700 leading-relaxed">
          <strong>Note:</strong> These resources are dynamically sourced using Gemini and Google Search to ensure they match your current curriculum level.
        </p>
      </div>
    </div>
  );
};

export default ResourcesView;
