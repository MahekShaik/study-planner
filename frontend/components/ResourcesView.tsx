
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
        // User requested task.subtopic be used instead of task.topic for search
        const res = await getAIResources(task.subtopic || task.topic, task.subject);
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
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-indigo-200 hover:shadow-lg transition-all h-full"
            >
              <div className="relative aspect-video bg-slate-100 w-full overflow-hidden">
                {r.thumbnail ? (
                  <img src={r.thumbnail} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                )}
                {r.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    {r.duration}
                  </div>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-800 mb-2 group-hover:text-indigo-600 line-clamp-2 leading-tight">{r.title}</h3>
                <div className="mt-auto flex items-center gap-3 text-[10px] text-slate-400">
                  {r.views && <span>{r.views}</span>}
                  <span className="flex items-center gap-1 text-indigo-500 font-medium">
                    Watch on YouTube
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </span>
                </div>
              </div>
            </a>
          ))}
          {resources.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400 italic">
              No specific video resources found for this topic.
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
