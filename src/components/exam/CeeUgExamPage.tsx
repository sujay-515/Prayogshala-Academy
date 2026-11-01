import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, ArrowRight, ClipboardList, GraduationCap, Info, ListChecks, ShieldCheck } from 'lucide-react';
import { MCQQuestion } from '../../types';
import { SITE_CONFIG } from '../../config/site';
import {
  CEE_UG_DURATION_MINUTES,
  CEE_UG_MARKS_PER_CORRECT,
  CEE_UG_PASSING_PERCENTAGE,
  CEE_UG_PENALTY_PER_WRONG,
  CEE_UG_TITLE,
  CEE_UG_TOTAL_MARKS,
  CEE_UG_TOTAL_QUESTIONS,
} from '../../config/ceeUg';
import { ExamMode } from './ExamMode';
import type { PacingSummary } from '../../utils/pacing';

interface CeeUgExamPageProps {
  questions: MCQQuestion[];
  onCompleteExam: (
    result: {
      title: string;
      score: number;
      correctCount: number;
      total: number;
      timeSpentSeconds: number;
      passed: boolean;
      pacing?: PacingSummary;
    },
    gradedQuestions?: MCQQuestion[],
    userAnswers?: Record<string, string>
  ) => void;
  onBookmarkQuestion: (id: string) => void;
  bookmarkedIds: string[];
}

export const CeeUgExamPage: React.FC<CeeUgExamPageProps> = ({
  questions,
  onCompleteExam,
  onBookmarkQuestion,
  bookmarkedIds,
}) => {
  const [phase, setPhase] = useState<'idle' | 'running' | 'completed'>('idle');
  const showIntro = phase === 'idle';

  return (
    <div className="space-y-5">
      <title>{`${CEE_UG_TITLE} | ${SITE_CONFIG.SITE_NAME}`}</title>
      <meta
        name="description"
        content={`Free ${CEE_UG_TOTAL_QUESTIONS}-question CEE-UG (MECEE-BL) entrance mock: ${CEE_UG_DURATION_MINUTES} minutes, ${CEE_UG_PENALTY_PER_WRONG} negative marking, 200 marks.`}
      />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/cee-ug`} />
      <meta property="og:title" content={`${CEE_UG_TITLE} | ${SITE_CONFIG.SITE_NAME}`} />
      <meta
        property="og:description"
        content={`${CEE_UG_TOTAL_QUESTIONS} questions · ${CEE_UG_DURATION_MINUTES} minutes · −${CEE_UG_PENALTY_PER_WRONG} per wrong answer. Submit your paper and get an instant scorecard.`}
      />
      <meta property="og:url" content={`${SITE_CONFIG.SITE_URL}/cee-ug`} />

      {showIntro && (
        <>
          <section className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 rounded-full px-2.5 py-1">
                  <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                  MECEE-BL / CEE-UG pattern
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">{CEE_UG_TITLE}</h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                  A full-length {CEE_UG_TOTAL_QUESTIONS}-question medical entrance mock built on the official
                  CEE-UG examination blueprint: {CEE_UG_DURATION_MINUTES} minutes (3 hours), one mark per correct answer and
                  −{CEE_UG_PENALTY_PER_WRONG} for every wrong answer.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 text-[11px] text-slate-600 shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-200 px-2.5 py-1">
                  <AlarmClock className="w-3.5 h-3.5 text-cyan-700" aria-hidden="true" />
                  {CEE_UG_DURATION_MINUTES} min · {CEE_UG_TOTAL_MARKS} marks
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-emerald-800 font-medium">
                  Available anytime
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 border-t border-slate-200/70 pt-3">
              This is a standalone practice mock — it is not part of the weekly Grand Test window or its
              leaderboard. Looking for laboratory-medicine board mocks?{' '}
              <Link to="/exam" className="text-cyan-800 font-medium hover:underline">
                Go to Mock Exam
              </Link>
              .
            </p>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-cyan-700" aria-hidden="true" />
                Exam Specification
              </h2>
              <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                <table className="w-full text-xs">
                  <caption className="sr-only">CEE-UG question and mark structure</caption>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-3 py-2 text-slate-600 font-medium">Total Questions</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{CEE_UG_TOTAL_QUESTIONS} MCQs</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-600 font-medium">Total Marks</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{CEE_UG_TOTAL_MARKS} Marks</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-600 font-medium">Examination Duration</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{CEE_UG_DURATION_MINUTES} Minutes (3 Hours)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-600 font-medium">Correct Answer Marking</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">+{CEE_UG_MARKS_PER_CORRECT} Mark</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-600 font-medium">Negative Marking</td>
                      <td className="px-3 py-2 text-right font-semibold text-rose-700">−{CEE_UG_PENALTY_PER_WRONG} Mark</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-600 font-medium">Benchmark Threshold</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{CEE_UG_PASSING_PERCENTAGE}% (100 Marks)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-cyan-700" aria-hidden="true" />
                Marking &amp; rules
              </h2>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="text-slate-900">+1</strong> mark for each correct answer.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="text-slate-900">−{CEE_UG_PENALTY_PER_WRONG}</strong> for each wrong answer.
                    Unanswered questions are never penalised.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="text-slate-900">{CEE_UG_PASSING_PERCENTAGE}%</strong> is the benchmark used
                    on the scorecard; the paper is out of {CEE_UG_TOTAL_MARKS} marks.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0" aria-hidden="true" />
                  <span>
                    The timer auto-submits at {CEE_UG_DURATION_MINUTES} minutes. You can flag questions and
                    revisit them from the review grid before submitting.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                  <span>Answers and explanations are revealed only after you submit.</span>
                </li>
              </ul>
              <p className="text-[11px] text-slate-500 flex items-start gap-1.5 border-t border-slate-200/70 pt-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-700 mt-0.5 shrink-0" aria-hidden="true" />
                Every sitting is graded server-side against a protected answer key, so the score cannot be
                altered from the browser.
              </p>
            </section>
          </div>
        </>
      )}

      <ExamMode
        questions={questions}
        onCompleteExam={onCompleteExam}
        onBookmarkQuestion={onBookmarkQuestion}
        bookmarkedIds={bookmarkedIds}
        preset="cee-ug"
        passingPercentage={CEE_UG_PASSING_PERCENTAGE}
        onPhaseChange={setPhase}
      />

      {showIntro && (
        <p className="text-[11px] text-slate-500 flex items-start gap-1.5 max-w-3xl mx-auto">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          Blueprint reference:{' '}
          <a
            href="https://mec.gov.np/"
            target="_blank"
            rel="noreferrer noopener"
            className="text-cyan-800 font-medium hover:underline"
          >
            Medical Education Commission (Nepal)
          </a>{' '}
          — always confirm the current year&apos;s official notice; section weights can be revised.
        </p>
      )}
    </div>
  );
};
