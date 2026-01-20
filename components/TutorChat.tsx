
import React, { useState, useRef, useEffect } from 'react';
import { solveQuestion, generateSpeech, StudyAIError } from '../services/geminiService';
import { ChatMessage, Subject } from '../types';

interface TutorChatProps {
  subject: Subject;
  onBack: () => void;
}

// Helper: Decode base64 to Uint8Array
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Decode raw PCM data to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const EXPLANATION_MARKER = '[EXPLANATION]';

// Speech Recognition setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const TutorChat: React.FC<TutorChatProps> = ({ subject, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [revealedExplanations, setRevealedExplanations] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, revealedExplanations]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Auto-focus the input field on mount
  useEffect(() => {
    textInputRef.current?.focus();
  }, []);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch(e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const playAudio = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      setIsPaused(false);

      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
      
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch(e) { /* ignore already stopped */ }
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        currentSourceRef.current = null;
      };

      setIsSpeaking(true);
      currentSourceRef.current = source;
      source.start(0);
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const speakText = async (text: string) => {
    if (!isTTSEnabled) return;
    const cleanText = text.replace(EXPLANATION_MARKER, '. Next, the explanation: ');
    const speechData = await generateSpeech(cleanText);
    if (speechData) {
      await playAudio(speechData);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !image) return;

    if (isListening) {
      recognitionRef.current.stop();
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: image || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setImage(null);
    setLoading(true);

    if (isTTSEnabled) {
      speakText("Checking that for you...");
    }

    try {
      const aiResponse = await solveQuestion(currentInput, subject, userMessage.image);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponse,
      };

      setMessages(prev => [...prev, botMessage]);
      setLoading(false);

      if (isTTSEnabled && aiResponse) {
        const answerPart = aiResponse.split(EXPLANATION_MARKER)[0];
        speakText(answerPart);
      }
    } catch (error: any) {
      setLoading(false);
      let errorText = "I'm sorry, I couldn't process your request right now.";
      let errorType = 'unknown';

      if (error instanceof StudyAIError) {
        errorText = error.message;
        errorType = error.type;
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `ERROR_MODE[${errorType}]${errorText}`, // Special prefix to handle UI
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      if (isTTSEnabled) {
        speakText(errorText);
      }
    } finally {
      textInputRef.current?.focus();
    }
  };

  const toggleTTS = () => {
    if (isTTSEnabled && currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch(e) {}
    }
    setIsTTSEnabled(!isTTSEnabled);
    setIsPaused(false);
  };

  const togglePauseResume = async () => {
    if (!audioContextRef.current || !isSpeaking) return;
    
    if (audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
      setIsPaused(true);
    } else if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      setIsPaused(false);
    }
  };

  const handleReveal = (msgId: string, explanationText: string) => {
    setRevealedExplanations(prev => {
      const next = new Set(prev);
      next.add(msgId);
      return next;
    });

    if (isTTSEnabled) {
      speakText("Here is the explanation: " + explanationText);
    }
  };

  const handleCopy = (msgId: string, text: string) => {
    const answer = text.split(EXPLANATION_MARKER)[0].trim();
    navigator.clipboard.writeText(answer).then(() => {
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <h2 className="font-bold text-slate-800">{subject} AI Tutor</h2>
        </div>
        <div className="flex items-center gap-2">
          {isSpeaking && isTTSEnabled && (
            <button 
              onClick={togglePauseResume}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              title={isPaused ? "Resume Audio" : "Pause Audio"}
            >
              {isPaused ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
          <button 
            onClick={toggleTTS}
            className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
              isTTSEnabled 
                ? 'bg-blue-100 text-blue-600 border border-blue-200' 
                : 'bg-slate-200 text-slate-500 border border-transparent'
            }`}
          >
            {isTTSEnabled ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSpeaking && !isPaused ? 'animate-pulse' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 14.828a1 1 0 01-1.414-1.414 5 5 0 000-7.072 1 1 0 011.414-1.414 7 7 0 010 9.9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M17.485 17.657a1 1 0 01-1.414-1.414 9 9 0 000-12.728 1 1 0 111.414-1.414 11 11 0 010 15.556z" clipRule="evenodd" />
                </svg>
                Voice ON
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Voice OFF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl">💡</div>
            <p>Ask me any {subject} question or upload a photo from your textbook!</p>
          </div>
        )}
        {messages.map((m) => {
          const isError = m.text.startsWith('ERROR_MODE[');
          let displayContent = m.text;
          let errorType = 'unknown';

          if (isError) {
            const match = m.text.match(/ERROR_MODE\[(.*?)\](.*)/);
            if (match) {
              errorType = match[1];
              displayContent = match[2];
            }
          }

          const parts = displayContent.split(EXPLANATION_MARKER);
          const answer = parts[0];
          const explanation = parts[1];
          const isRevealed = revealedExplanations.has(m.id);
          const isCopied = copiedId === m.id;

          return (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : isError
                    ? 'bg-red-50 text-red-800 rounded-tl-none border border-red-200'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none shadow-sm border border-slate-200'
              }`}>
                {m.image && <img src={m.image} className="rounded-lg mb-2 max-h-64 object-contain bg-black/5" alt="Uploaded question" />}
                
                <div className="flex flex-col gap-2">
                  {isError && (
                    <div className="flex items-center gap-2 mb-1">
                      {errorType === 'network' && <span className="text-xl">🌐</span>}
                      {errorType === 'timeout' && <span className="text-xl">⌛</span>}
                      {errorType === 'server' && <span className="text-xl">⚠️</span>}
                      {errorType === 'safety' && <span className="text-xl">🛡️</span>}
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                        {errorType} Error
                      </span>
                    </div>
                  )}
                  <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap">
                    {answer}
                  </div>
                </div>
                
                {explanation && m.role === 'model' && !isError && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    {!isRevealed ? (
                      <button 
                        onClick={() => handleReveal(m.id, explanation)}
                        className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors py-2 px-3 bg-blue-50 rounded-lg border border-blue-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Reveal Explanation
                      </button>
                    ) : (
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Detailed Explanation
                        </div>
                        <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap text-slate-700 italic leading-relaxed">
                          {explanation.trim()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {m.role === 'model' && !isError && (
                  <div className="mt-2 flex items-center gap-3">
                    <button 
                      onClick={() => speakText(displayContent)}
                      className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 14.828a1 1 0 01-1.414-1.414 5 5 0 000-7.072 1 1 0 011.414-1.414 7 7 0 010 9.9z" clipRule="evenodd" />
                      </svg>
                      Replay Audio
                    </button>
                    <button 
                      onClick={() => handleCopy(m.id, displayContent)}
                      className={`text-[10px] flex items-center gap-1 transition-colors ${isCopied ? 'text-green-500 font-bold' : 'text-slate-400 hover:text-blue-500'}`}
                    >
                      {isCopied ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                          Copy Answer
                        </>
                      )}
                    </button>
                  </div>
                )}

                {isError && (
                  <button 
                    onClick={() => {
                      // Remove last error message and retry last user input
                      const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user');
                      if (lastUserMsg) {
                        setMessages(prev => prev.filter(msg => msg.id !== m.id));
                        setInput(lastUserMsg.text);
                        setImage(lastUserMsg.image || null);
                        // We'll let the user click send again to modify if they want, 
                        // or we could auto-trigger handleSend.
                      }
                    }}
                    className="mt-3 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Try Re-sending
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-slate-50">
        {image && (
          <div className="relative inline-block mb-2">
            <img src={image} className="h-20 w-20 object-cover rounded-lg border-2 border-blue-500" alt="Preview" />
            <button 
              onClick={() => setImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 shadow-sm"
            title="Scan question"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <button 
            onClick={toggleListening}
            className={`p-3 border rounded-xl transition-all shadow-sm flex items-center justify-center ${
              isListening 
                ? 'bg-red-100 border-red-300 text-red-600 animate-pulse ring-2 ring-red-200' 
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
            title={isListening ? "Stop Listening" : "Speak your question"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <input 
            type="text" 
            ref={textInputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening..." : "Type your question here..."}
            className={`flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white shadow-sm transition-all ${
              isListening ? 'border-red-300 ring-2 ring-red-50' : 'border-slate-300'
            }`}
          />
          <button 
            onClick={handleSend}
            disabled={loading || (!input && !image)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md flex items-center gap-2"
          >
            <span>Ask</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorChat;
