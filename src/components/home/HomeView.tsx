import React from 'react';
import {
  BookOpen,
  Timer,
  ArrowRight,
} from 'lucide-react';
import { UnitCategory, ExamCategory, MCQQuestion } from '../../types';

interface HomeViewProps {
  categories: UnitCategory[];
  questions: MCQQuestion[];
  onNavigateTab: (tab: 'home' | 'browse' | 'practice' | 'exam' | 'dashboard' | 'admin') => void;
  onOpenDailyQuestion: () => void;
  onSelectUnit: (unitName: string) => void;
  onSelectExam: (exam: ExamCategory) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  categories,
  questions,
  onNavigateTab,
  onOpenDailyQuestion,
  onSelectUnit,
  onSelectExam,
}) => {
  const publishedQuestions = questions.filter((q) => q.status === 'Published');
  const publishedCount = publishedQuestions.length;

  const exams: { code: ExamCategory; title: string; subtitle: string }[] = [
    { code: 'ASCP', title: 'ASCP MLS / MLT', subtitle: 'Generalist & Specialist Licensure' },
    { code: 'NHPC', title: 'NHPC Licensure', subtitle: 'Nepal Health Professional Council' },
    { code: 'PSC', title: 'PSC Medical Lab', subtitle: 'Public Service Commission Syllabus' },
    { code: 'DHA', title: 'DHA Technologist', subtitle: 'Dubai Health Authority Clinical Exam' },
    { code: 'AIMS', title: 'AIMS Professional', subtitle: 'Australian Institute of Medical Scientists' },
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Editorial Overview Section */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Soft liquid glass internal specular highlight */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-100/40 via-teal-50/20 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none blur-2xl" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          <div className="lg:col-span-8 space-y-4">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight leading-snug">
              Structured question bank for licensing and laboratory certification
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Curated multiple-choice questions covering clinical enzymology, hematopathology, bacteriology, and immunohematology. Review individual topics with full diagnostic rationales or sit timed examinations calibrated to licensing standards.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-3">
              <button
                onClick={() => onNavigateTab('practice')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-cyan-900/10 hover:-translate-y-0.5"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Begin Practice</span>
              </button>

              <button
                onClick={() => onNavigateTab('exam')}
                className="glass-card hover:bg-white text-slate-800 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
              >
                <Timer className="w-4 h-4 text-slate-500" />
                <span>Timed Examination</span>
              </button>

              <button
                onClick={onOpenDailyQuestion}
                className="glass-card hover:bg-white text-slate-800 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all text-center cursor-pointer hover:-translate-y-0.5"
              >
                Question of the Day
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 glass-card rounded-xl p-4 text-xs space-y-3">
            <div className="font-semibold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200/80 pb-2">
              Repository Status
            </div>

            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between items-center py-0.5">
                <span>Verified questions:</span>
                <span className="font-semibold text-slate-900">{publishedCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span>Specialty units:</span>
                <span className="font-semibold text-slate-900">{categories.length}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span>Supported examination boards:</span>
                <span className="font-semibold text-slate-900">5 Syllabi</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80">
              <button
                onClick={() => onNavigateTab('browse')}
                className="text-cyan-800 hover:text-cyan-950 font-medium inline-block cursor-pointer"
              >
                Search and filter all items →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-2">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Licensing Examination Syllabi
          </h2>
          <span className="text-xs text-slate-400">Select a syllabus to begin filtered practice</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {exams.map((exam) => {
            const count = questions.filter(
              (q) => q.status === 'Published' && q.examCategories.includes(exam.code)
            ).length;

            return (
              <div
                key={exam.code}
                onClick={() => onSelectExam(exam.code)}
                className="glass-panel glass-panel-hover rounded-xl p-4 cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 group-hover:text-cyan-800 transition-colors">
                      {exam.code}
                    </span>
                    <span className="text-slate-400 text-xs">{count} questions</span>
                  </div>
                  <div className="text-xs font-medium text-slate-800">
                    {exam.title}
                  </div>
                  <div className="text-xs text-slate-500 leading-normal">
                    {exam.subtitle}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-900 font-medium">
                  <span>Open syllabus</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Laboratory Medicine Units Directory */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-slate-200/70 pb-2">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Specialty Units ({categories.length})
          </h2>
          <button
            onClick={() => onNavigateTab('browse')}
            className="text-xs text-slate-600 hover:text-cyan-900 font-medium cursor-pointer"
          >
            View all questions →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const unitQuestions = questions.filter(
              (q) => q.status === 'Published' && q.unit === cat.name
            );

            return (
              <div
                key={cat.id}
                onClick={() => onSelectUnit(cat.name)}
                className="glass-panel glass-panel-hover rounded-xl p-5 cursor-pointer flex flex-col justify-between group space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-700">{unitQuestions.length} MCQs</span>
                    <span>{cat.subjects.length} subjects</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm group-hover:text-cyan-800 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-900 font-medium">
                  <span>Browse subjects</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
