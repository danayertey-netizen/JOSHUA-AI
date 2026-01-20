
export type Subject = 
  | 'Mathematics' 
  | 'English Language' 
  | 'Integrated Science' 
  | 'Social Studies' 
  | 'ICT' 
  | 'RME' 
  | 'French';

export type BECEYear = string;

export interface SubjectMeta {
  id: Subject;
  icon: string;
  color: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
}

export interface ExamQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface PastPaper {
  subject: Subject;
  year: BECEYear;
  content: string;
}
