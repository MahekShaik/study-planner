import React, { useState, useRef, useEffect } from 'react';
import { StudyTask, Message } from '../types';
import { chatWithAI } from '../services/geminiService';

interface ChatViewProps {
  task: StudyTask | null;
  onBack: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ task, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Initialize with context-aware greeting
  useEffect(() => {
    if (task) {
      const greeting = `Hi! I'm your AI study assistant. I see we're working on **${task.topic}** (${task.subject}). Where shall we begin? I can explain the core concepts, give you an example, or test your knowledge.`;
      setMessages([{ role: 'model', text: greeting }]);

      // Optionally trigger immediate explanation if this is the first time entering
      // For now, let's just leave the greeting and let user choose a chip or ask.
    } else {
      setMessages([{ role: 'model', text: `Hi! I'm your AI study assistant. How can I help you with your studies today?` }]);
    }
  }, [task?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string = input, isSystemAction: boolean = false) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMsg = { role: 'user' as const, text: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Map display labels to specific tutor prompts if they are system actions
      let prompt = messageText;
      if (isSystemAction && task) {
        if (messageText === "Explain this simply") {
          prompt = `Please explain the topic "${task.topic}" from "${task.subject}" in very simple terms using a helpful analogy.`;
        } else if (messageText === "Give an example") {
          prompt = `Give me a clear, practical example that illustrates the concept of "${task.topic}".`;
        } else if (messageText === "Ask me a question") {
          prompt = `Ask me a single practice question about "${task.topic}" to check my understanding.`;
        } else if (messageText === "Summarize this topic") {
          prompt = `Summarize the most important points of "${task.topic}" in a concise bulleted list.`;
        }
      }

      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chatWithAI(history, prompt);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I'm having trouble connecting. Let's try again in a moment." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "Explain this simply",
    "Give an example",
    "Ask me a question",
    "Summarize this topic"
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col p-6 animate-fade-in bg-[#FBFCFB]">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">AI Study Assistant</h2>
          <p className="text-sm text-slate-400 font-light">Ask doubts, revise concepts, or get explanations instantly</p>
        </div>
      </div>

      {/* Context Badge */}
      <div className="mb-10 flex px-2 text-slate-800">
        <div className="bg-[#EAF0EA] border border-[#DCE4DC] py-1.5 px-4 rounded-full flex items-center gap-3">
          <svg className="w-4 h-4 text-[#5F855F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <span className="text-xs font-medium tracking-tight">Context: {task?.subject} — {task?.topic} — {task?.subtopic}</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-8 px-2 mb-8 scrollbar-hide">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {!m.role.includes('user') && (
                <div className="w-8 h-8 rounded-full bg-[#EAF0EA] flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-[#5F855F]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                </div>
              )}
              <div className={`p-5 rounded-2xl ${m.role === 'user'
                ? 'bg-[#5F855F] text-white shadow-sm'
                : 'bg-white border border-[#E8EDE8] text-slate-700 shadow-sm'
                }`}>
                {m.role === 'model' && i === 0 && <p className="text-[10px] font-bold text-[#8FB38F] uppercase tracking-wider mb-2">AI Assistant</p>}
                <p className="text-[14px] leading-relaxed font-light">{m.text}</p>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#EAF0EA] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#5F855F] animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
            <div className="bg-white border border-[#E8EDE8] p-4 rounded-2xl shadow-sm flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Action Chips */}
      <div className="flex flex-wrap gap-3 mb-6 px-2">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s, true)}
            className="bg-[#EAF0EA] text-[#334139] border border-[#DCE4DC] px-5 py-2 rounded-full text-[13px] font-medium transition-all hover:bg-[#DCE4DC] active:scale-95"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex gap-4 items-center bg-white p-2.5 pl-6 rounded-full border border-slate-200 shadow-sm focus-within:border-[#5F855F] focus-within:ring-2 focus-within:ring-[#5F855F]/10 transition-all">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question about your topic..."
          className="flex-1 bg-transparent py-2.5 focus:outline-none text-[15px] font-light text-slate-700"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className={`p-3 rounded-full transition-all flex items-center justify-center ${input.trim() ? 'bg-[#5F855F] text-white shadow-md hover:opacity-90 active:scale-90' : 'bg-slate-100 text-slate-300'
            }`}
        >
          <svg className="w-5 h-5 rotate-45 transform -translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="mt-4 text-center">
        <p className="text-[10px] text-slate-300 font-medium">Press Enter to send • AI responses are generated to help with your current topic</p>
      </div>
    </div>
  );
};

export default ChatView;
