
import { SubjectMeta } from './types';

export const SUBJECTS: SubjectMeta[] = [
  { 
    id: 'Mathematics', 
    icon: '📐', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Master Algebra, Geometry, and Business Math.' 
  },
  { 
    id: 'English Language', 
    icon: '📚', 
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    description: 'Grammar, essays, and literature comprehension.' 
  },
  { 
    id: 'Integrated Science', 
    icon: '🔬', 
    color: 'bg-green-100 text-green-700 border-green-200',
    description: 'Biology, Chemistry, Physics, and Agriculture.' 
  },
  { 
    id: 'Social Studies', 
    icon: '🌍', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    description: 'Environment, Governance, and Culture.' 
  },
  { 
    id: 'ICT', 
    icon: '💻', 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Basic computing and software applications.' 
  },
  { 
    id: 'RME', 
    icon: '🙏', 
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    description: 'Religious and Moral Education values.' 
  },
  { 
    id: 'French', 
    icon: '🇫🇷', 
    color: 'bg-pink-100 text-pink-700 border-pink-200',
    description: 'Basic French communication and grammar.' 
  }
];

export const SYSTEM_INSTRUCTION = `
You are BECE Master, an expert AI tutor for Ghanaian Junior High School (JHS) students preparing for the BECE (Basic Education Certificate Examination). 
Your goal is to solve questions and provide deep, syllabus-aligned explanations.

Guidelines:
1. Always follow the GES (Ghana Education Service) JHS syllabus.
2. For Mathematics and Science, provide step-by-step working.
3. Use simple, encouraging language suitable for 12-15 year olds.
4. If a question is in an exam format (Objective/Section A), explain why the correct answer is right and why others are wrong.
5. If an image is provided, analyze it carefully to solve the diagrams or text within it.
6. Occasionally use Ghanaian contexts (e.g., cedi, local names like Kofi/Ama, regions of Ghana) to make learning relatable.
`;
