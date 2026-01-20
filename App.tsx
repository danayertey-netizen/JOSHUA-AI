
import React, { useState } from 'react';
import { SUBJECTS } from './constants';
import { Subject } from './types';
import SubjectCard from './components/SubjectCard';
import TutorChat from './components/TutorChat';
import QuestionDownloader from './components/QuestionDownloader';

const App: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<'study' | 'mock' | 'progress'>('study');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedSubject(null); setActiveTab('study'); }}>
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-xl text-red-700 shadow-sm transition-transform hover:scale-110">
              GH
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 hidden sm:block">
              BECE <span className="text-red-600">Master</span>
            </h1>
          </div>
          
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['study', 'mock', 'progress'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab !== 'study') setSelectedSubject(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'mock' ? 'Past Papers' : tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {activeTab === 'study' && (
          <>
            {!selectedSubject ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 text-center sm:text-left">
                  <h2 className="text-3xl font-black text-slate-900 mb-2">Akwaaba! 👋</h2>
                  <p className="text-slate-600">Select a subject to start your BECE masterclass. AI-powered explanations are just a click away.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {SUBJECTS.map((subject) => (
                    <SubjectCard 
                      key={subject.id} 
                      subject={subject} 
                      onClick={(id) => setSelectedSubject(id as Subject)} 
                    />
                  ))}
                </div>

                <section className="mt-12 p-8 bg-gradient-to-br from-red-500 via-yellow-500 to-green-600 rounded-3xl text-white shadow-xl overflow-hidden relative">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-2">Ready for BECE 2025?</h3>
                    <p className="max-w-md opacity-90 mb-6">Access a decade of past questions instantly to test your readiness.</p>
                    <button 
                      onClick={() => setActiveTab('mock')}
                      className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-slate-50 transition-all shadow-lg"
                    >
                      Browse Past Papers
                    </button>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-10 translate-y-10">
                    <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
                    </svg>
                  </div>
                </section>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <TutorChat 
                  subject={selectedSubject} 
                  onBack={() => setSelectedSubject(null)} 
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'mock' && <QuestionDownloader />}
        
        {activeTab === 'progress' && (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-slate-700">Coming Soon!</h3>
            <p className="max-w-xs text-center">In our next update, we will track your scores from mock exams to show your progress!</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t py-6">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} BECE Master Ghana. Powered by Google Gemini AI.
          </p>
          <p className="text-slate-400 text-xs mt-1 italic">
            Developed to support the Ghana Education Service (GES) JHS curriculum.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
