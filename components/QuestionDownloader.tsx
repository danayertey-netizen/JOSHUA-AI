
import React, { useState, useRef, useEffect } from 'react';
import { generatePastPaper } from '../services/geminiService';
import { Subject, BECEYear } from '../types';
import { SUBJECTS } from '../constants';

const YEARS: BECEYear[] = Array.from({ length: 15 }, (_, i) => (2024 - i).toString());

const QuestionDownloader: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Mathematics');
  const [selectedYear, setSelectedYear] = useState<BECEYear>(YEARS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeReadingSection, setActiveReadingSection] = useState<string>('top');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Cache for generated papers to avoid re-generating when switching back
  const [paperCache, setPaperCache] = useState<Record<string, string>>({});

  const contentRef = useRef<HTMLDivElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const currentPaperKey = `${selectedSubject}-${selectedYear}`;
  const paperContent = paperCache[currentPaperKey];

  // Monitor full-screen changes to sync local state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleGenerate = async (year: BECEYear) => {
    setSelectedYear(year);
    const key = `${selectedSubject}-${year}`;
    
    if (paperCache[key]) {
      setActiveReadingSection('top');
      return;
    }

    setIsGenerating(true);
    try {
      const content = await generatePastPaper(selectedSubject, year);
      setPaperCache(prev => ({
        ...prev,
        [key]: content
      }));
      setActiveReadingSection('top');
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveReadingSection(sectionId);
    if (!contentRef.current) return;
    contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFullScreen = () => {
    if (!readerContainerRef.current) return;

    if (!document.fullscreenElement) {
      readerContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = () => {
    if (!paperContent) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>BECE ${selectedYear} ${selectedSubject} - FULL EXAM BUNDLE</title>
        <style>
          body { font-family: 'Times New Roman', serif; line-height: 1.5; color: #000; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 4px double #000; padding-bottom: 20px; }
          .confidential { color: #cc0000; text-align: center; font-weight: bold; font-size: 11pt; text-transform: uppercase; letter-spacing: 4px; border: 2px solid #cc0000; padding: 5px 15px; display: inline-block; }
          .content { font-size: 12pt; white-space: pre-wrap; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div style="text-align:center"><div class='confidential'>STRICTLY CONFIDENTIAL - EXAMINATION ARCHIVE</div></div>
        <div class='header'>
          <h1>BECE ${selectedYear}</h1>
          <h2>${selectedSubject.toUpperCase()}</h2>
        </div>
        <div class='content'>${paperContent.replace(/\n/g, '<br/>')}</div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BECE_${selectedYear}_${selectedSubject}_Full_Bundle.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8 animate-in fade-in duration-500">
      {/* Search & Config Header */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-red-900 p-10 text-white relative">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-tighter">OFFICIAL</span>
              <span className="text-blue-300 font-bold text-sm tracking-widest uppercase">WAEC Digital Library</span>
            </div>
            <h2 className="text-4xl font-black mb-3">Master Archive</h2>
            <p className="text-slate-300 max-w-xl text-lg leading-relaxed">
              Explore complete <span className="text-white font-bold">BECE Papers</span> with full questions, marking schemes, and examiner feedback.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-8 space-y-8">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">Select Subject</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubject(s.id as Subject)}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all border-2 text-sm ${
                    selectedSubject === s.id 
                      ? 'bg-red-600 border-red-600 text-white shadow-lg' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {s.id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">Exam Year</label>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {YEARS.map(y => {
                const isCached = !!paperCache[`${selectedSubject}-${y}`];
                return (
                  <button
                    key={y}
                    onClick={() => handleGenerate(y)}
                    disabled={isGenerating}
                    className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${
                      selectedYear === y 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105' 
                        : isCached
                          ? 'bg-blue-50 border-blue-100 text-blue-600'
                          : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white'
                    } disabled:opacity-50`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="p-20 text-center bg-slate-50 border-t">
            <div className="inline-block w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-black text-slate-900">Retrieving Full Bundle...</h3>
            <p className="text-slate-500 text-sm">Compiling all sections and examiner remarks.</p>
          </div>
        )}

        {/* Read Online Mode */}
        {paperContent && !isGenerating && (
          <div 
            ref={readerContainerRef}
            className={`border-t bg-slate-50 flex flex-col ${isFullscreen ? 'h-screen w-screen fixed top-0 left-0 z-[100]' : 'min-h-[800px]'}`}
          >
            {/* Top Toolbar */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 text-red-700 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm leading-none uppercase">{selectedSubject} {selectedYear}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Full Examination Document</p>
                </div>
              </div>

              {/* Document Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                {['Overview', 'Questions', 'Answers', 'Remarks'].map((section) => (
                  <button
                    key={section}
                    onClick={() => scrollToSection(section.toLowerCase())}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeReadingSection === section.toLowerCase()
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleFullScreen}
                  className="bg-slate-100 text-slate-600 p-2.5 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                  title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                >
                  {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 011-1h4a1 1 0 110 2h-2.414l2.293 2.293a1 1 0 11-1.414 1.414L15 6.414V8a1 1 0 11-2 0V5zM3 12a1 1 0 011 1v1.586l2.293-2.293a1 1 0 111.414 1.414L5.414 15H7a1 1 0 110 2H3v-4a1 1 0 011-1zm14 0a1 1 0 011 1v4h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 011-1h4a1 1 0 110 2h-2.414l2.293 2.293a1 1 0 11-1.414 1.414L15 6.414V8a1 1 0 11-2 0V5zM3 12a1 1 0 011-1v1.586l2.293-2.293a1 1 0 111.414 1.414L5.414 15H7a1 1 0 110 2H3v-4a1 1 0 011-1zm14 0a1 1 0 011 1v4h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" />
                    </svg>
                  )}
                </button>
                <button 
                  onClick={handleDownload}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-black transition-all shadow-md active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Save as Word
                </button>
              </div>
            </div>

            {/* Document Reader Area */}
            <div className={`flex-1 flex flex-col md:flex-row p-6 gap-6 ${isFullscreen ? 'h-full overflow-hidden' : 'h-[800px]'}`}>
              {/* Document Body */}
              <div 
                ref={contentRef}
                className={`flex-1 bg-white rounded-3xl shadow-inner border border-slate-200 overflow-y-auto p-10 sm:p-16 font-serif relative scroll-smooth no-scrollbar ${isFullscreen ? 'max-h-full' : ''}`}
              >
                {/* Paper Content Display */}
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-16 border-b-4 border-double border-slate-900 pb-10">
                    <p className="text-[10px] font-black tracking-[0.3em] text-red-600 mb-4 uppercase">Republic of Ghana • National Assessment Portal</p>
                    <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">BECE {selectedYear}</h1>
                    <h2 className="text-2xl font-bold text-slate-700 uppercase">{selectedSubject}</h2>
                  </div>
                  
                  <div className="prose prose-slate prose-lg max-w-none whitespace-pre-wrap leading-relaxed text-slate-800 antialiased">
                    {paperContent}
                  </div>

                  <div className="mt-20 pt-10 border-t border-dashed border-slate-200 text-center text-slate-400 text-xs italic">
                    End of Online Reader Session • Generated for Revision Purposes
                  </div>
                </div>
              </div>

              {/* Sidebar Quick-Stats / Tools */}
              {!isFullscreen && (
                <div className="w-full md:w-64 space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3">Document Info</h5>
                    <ul className="space-y-3">
                      <li className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Status</span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Verified</span>
                      </li>
                      <li className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Sections</span>
                        <span className="font-bold">4 Modules</span>
                      </li>
                      <li className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Subject</span>
                        <span className="font-bold">{selectedSubject}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-indigo-600 p-5 rounded-2xl text-white shadow-lg shadow-indigo-100">
                    <h5 className="text-[10px] font-black text-indigo-200 uppercase mb-2">Study Tip</h5>
                    <p className="text-xs leading-relaxed font-medium">
                      Try solving the 30 objective questions first under 45 mins before checking the answer key.
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3">Recently Viewed</h5>
                    <div className="space-y-2">
                      {Object.keys(paperCache).slice(-3).map(key => (
                        <button 
                          key={key}
                          onClick={() => {
                            const [subj, year] = key.split('-');
                            setSelectedSubject(subj as Subject);
                            setSelectedYear(year);
                          }}
                          className="w-full text-left text-[10px] font-bold py-2 px-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
                        >
                          {key.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: '📱', title: 'Read Anywhere', desc: 'No need to download files. Study directly on your phone or laptop with our reader.' },
          { icon: '📁', title: 'Persistent Cache', desc: 'Papers you open stay available instantly during your study session.' },
          { icon: '📝', title: 'Full Access', desc: 'Includes Section A, Section B, Marking Schemes and Examiner Reports in one view.' }
        ].map((f, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4 bg-slate-50 w-14 h-14 flex items-center justify-center rounded-2xl">{f.icon}</div>
            <h5 className="font-black text-lg mb-2 text-slate-900">{f.title}</h5>
            <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default QuestionDownloader;
