
import React from 'react';
import { SubjectMeta } from '../types';

interface SubjectCardProps {
  subject: SubjectMeta;
  onClick: (id: string) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onClick }) => {
  return (
    <button
      onClick={() => onClick(subject.id)}
      className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 hover:shadow-lg text-left ${subject.color}`}
    >
      <div className="text-4xl mb-3">{subject.icon}</div>
      <h3 className="text-xl font-bold mb-1">{subject.id}</h3>
      <p className="text-sm opacity-90 leading-tight">{subject.description}</p>
    </button>
  );
};

export default SubjectCard;
