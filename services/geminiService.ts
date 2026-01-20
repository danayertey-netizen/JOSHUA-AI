
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export class StudyAIError extends Error {
  constructor(public type: 'network' | 'timeout' | 'server' | 'safety' | 'unknown', message: string) {
    super(message);
    this.name = 'StudyAIError';
  }
}

export const solveQuestion = async (
  prompt: string, 
  subject: string, 
  image?: string
): Promise<string> => {
  const ai = getAIClient();
  const model = 'gemini-3-pro-preview'; 
  
  if (!navigator.onLine) {
    throw new StudyAIError('network', 'You appear to be offline. Please check your internet connection.');
  }

  const contents: any[] = [{ 
    text: `Subject: ${subject}
Question: ${prompt}

IMPORTANT: Please structure your response in two parts. 
Part 1: The direct answer or solution.
Part 2: The detailed explanation, step-by-step working, and context.
Separate the two parts clearly with the marker: [EXPLANATION]` 
  }];
  
  if (image) {
    contents.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: image.split(',')[1]
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    if (!response.text) {
      // Check for safety finish reason
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new StudyAIError('safety', 'This content was flagged by safety filters. Please try rephrasing your question.');
      }
      throw new StudyAIError('server', 'The AI returned an empty response. Please try again.');
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error instanceof StudyAIError) throw error;

    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to execute')) {
      throw new StudyAIError('network', 'Network connection failed. Please check your internet.');
    }
    if (msg.includes('deadline') || msg.includes('timeout') || msg.includes('exceeded')) {
      throw new StudyAIError('timeout', 'The request took too long. The server might be busy.');
    }
    if (msg.includes('429') || msg.includes('quota') || msg.includes('too many requests')) {
      throw new StudyAIError('server', 'AI capacity reached. Please wait a minute and try again.');
    }
    
    throw new StudyAIError('server', 'The study server encountered an error. Please try again later.');
  }
};

export const generatePastPaper = async (subject: string, year: string): Promise<string> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate a COMPREHENSIVE Examination Booklet for BECE ${subject} for the year ${year}. 
      This is a high-stakes simulation for student revision.
      
      The document MUST include the following sections in order:
      1. INSTRUCTIONS TO CANDIDATES: Standard examination header.
      2. SECTION A (OBJECTIVES): 30 Multiple Choice Questions (A-D) covering the ${year} syllabus.
      3. SECTION B (THEORY): 6 detailed questions with parts (a, b, c) as per WAEC format.
      4. SECTION A ANSWER KEY: A simple list of correct letters (1-30).
      5. SECTION B MARKING SCHEME: Detailed point-by-point marking guide and model answers for all theory questions.
      6. CHIEF EXAMINER'S REMARKS: For each section, provide specific professional insights on:
         - Common mistakes students made in ${year}.
         - Strengths observed in candidate answers.
         - Recommendations for candidates to score higher marks.
      
      Format with bold headers, numbered lists, and professional spacing. The remarks should be at the very end as a "Post-Exam Review" section.`,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2
      }
    });
    return response.text || "Failed to generate full past paper.";
  } catch (error) {
    console.error("Error generating past paper:", error);
    return "Error: Could not retrieve the full question set for this year. Please try again.";
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("Speech Generation Error:", error);
    return null;
  }
};
