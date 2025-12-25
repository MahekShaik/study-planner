
import React, { useState, useEffect } from 'react';
import { StudyTask, QuizQuestion, QuizResult } from '../types';
import { generateQuiz, evaluateQuizPerformance } from '../services/geminiService';

interface QuizScreenProps {
  task: StudyTask;
  onFinish: (result: QuizResult) => void;
  examDate?: string;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ task, onFinish, examDate }) => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [currentShortAnswer, setCurrentShortAnswer] = useState('');
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const q = await generateQuiz(task.subject, task.topic);
        setQuestions(q);
        setLoading(false);
      } catch (e) {
        console.error("Failed to load quiz", e);
      }
    };
    loadQuiz();
  }, [task]);

  const handleMCQSelect = (option: string) => {
    const isCorrect = option === questions[currentIndex].correctAnswer;
    setUserAnswers([...userAnswers, { questionId: questions[currentIndex].id, isCorrect }]);
    nextQuestion();
  };

  const handleShortAnswerSubmit = () => {
    const isCorrect = currentShortAnswer.toLowerCase().includes(questions[currentIndex].correctAnswer.toLowerCase());
    setUserAnswers([...userAnswers, { questionId: questions[currentIndex].id, isCorrect }]);
    setCurrentShortAnswer('');
    nextQuestion();
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setLoading(true);
    try {
      const evalResult = await evaluateQuizPerformance(
        task.subject,
        task.topic,
        questions,
        userAnswers,
        examDate
      );
      setResult(evalResult);
    } catch (e) {
      console.error("Evaluation failed", e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in bg-[#FBFCFB]">
        <div className="w-12 h-12 border-4 border-[#EAF0EA] border-t-[#5F855F] rounded-full animate-spin mb-6"></div>
        <p className="text-slate-400 font-light text-sm">Reviewing your session...</p>
        <p className="text-[#8FB38F] text-[10px] uppercase tracking-widest mt-2">Gemini Study Assistant</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 animate-fade-in">
        <div className="bg-white border border-[#E8EDE8] rounded-[40px] p-12 shadow-sm text-center">
          <div className="w-24 h-24 bg-[#F1F5F1] rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl">✨</span>
          </div>
          <h2 className="text-3xl font-bold text-[#2D3E35] tracking-tight mb-3">Great Progress</h2>
          <div className="inline-block px-4 py-1.5 bg-[#EAF0EA] text-[#5F855F] rounded-full font-bold uppercase tracking-widest text-[10px] mb-8">
            Score: {result.score} / {result.total}
          </div>
          <p className="text-slate-600 leading-relaxed mb-12 text-[17px] font-light">
            {result.insight}
          </p>
          <button
            onClick={() => onFinish(result)}
            className="w-full bg-[#5F855F] text-white py-4.5 px-8 rounded-2xl font-semibold hover:bg-[#4E6D4E] transition-all shadow-[0_10px_20px_rgba(95,133,95,0.15)] active:scale-[0.98]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in bg-[#FBFCFB] px-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-slate-500 font-medium">Unable to load quiz questions.</p>
        <p className="text-slate-400 text-sm mt-2 mb-6">Please try again or contact support.</p>
        <button
          onClick={() => onFinish({ score: 0, total: 0, insight: "Quiz skipped due to error.", weakSubtopics: [], stableSubtopics: [] })}
          className="text-indigo-600 font-bold hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-xl mx-auto py-16 px-6 animate-fade-in">
      <div className="mb-14 text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="text-[#8FB38F] text-[11px] font-bold uppercase tracking-[0.2em]">Check-in</span>
          <div className="w-1 h-1 bg-[#8FB38F] rounded-full"></div>
          <span className="text-slate-400 text-[11px] font-medium uppercase tracking-[0.2em]">Question {currentIndex + 1} of {questions.length}</span>
        </div>
        <h2 className="text-2xl font-bold text-[#2D3E35] leading-snug tracking-tight">{currentQ.question}</h2>

        <div className="mt-8 flex justify-center">
          <div className="h-1.5 w-40 bg-[#EAF0EA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5F855F] transition-all duration-700 ease-out"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {currentQ.type === 'mcq' ? (
          currentQ.options?.map((option, i) => (
            <button
              key={i}
              onClick={() => handleMCQSelect(option)}
              className="w-full text-left p-6 border border-[#E8EDE8] rounded-[24px] bg-white hover:border-[#5F855F] hover:bg-[#F8FAF8] transition-all text-slate-700 font-medium group"
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                <div className="w-5 h-5 rounded-full border border-slate-200 group-hover:border-[#5F855F] group-hover:bg-[#5F855F] transition-all flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="space-y-6">
            <textarea
              value={currentShortAnswer}
              onChange={(e) => setCurrentShortAnswer(e.target.value)}
              placeholder="Type your explanation..."
              className="w-full p-6 border border-[#E8EDE8] rounded-[24px] bg-white focus:outline-none focus:ring-4 focus:ring-[#5F855F]/5 focus:border-[#5F855F] min-h-[160px] text-slate-700 placeholder:text-slate-300 transition-all"
            />
            <button
              onClick={handleShortAnswerSubmit}
              disabled={!currentShortAnswer.trim()}
              className="w-full bg-[#5F855F] text-white py-4.5 px-8 rounded-2xl font-semibold hover:bg-[#4E6D4E] shadow-[0_10px_20px_rgba(95,133,95,0.1) hover:shadow-xl transition-all disabled:opacity-30 disabled:scale-100 active:scale-[0.98]"
            >
              Submit Answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizScreen;
