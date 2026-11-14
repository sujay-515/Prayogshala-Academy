import React from 'react';
import { FeatureRow } from './FeatureRow';
import { MISTAKE_CLEAR_THRESHOLD } from '../../utils/mistakes';
import {
  CEE_UG_TOTAL_QUESTIONS,
  CEE_UG_DURATION_MINUTES,
  CEE_UG_PENALTY_PER_WRONG,
} from '../../config/ceeUg';
import {
  GRAND_TEST_OPEN_DAY,
  GRAND_TEST_CLOSE_DAY,
} from '../../utils/examWindow';

export const FeaturesSection: React.FC = () => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const grandOpenDay = dayNames[GRAND_TEST_OPEN_DAY];
  const grandCloseDay = dayNames[GRAND_TEST_CLOSE_DAY];

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="text-left max-w-3xl space-y-3 mb-10 sm:mb-16">
        <h2
          id="features-heading"
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
        >
          Everything you need to qualify your medical licensure
        </h2>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Prayogshala Academy replaces rote memorization with structured diagnostic reasoning, paced timed simulations, and strict mistake remediation.
        </p>
      </div>

      <div className="divide-y divide-slate-200/70 dark:divide-white/10 border-t border-slate-200/70 dark:border-white/10">
        {/* Feature 1: Clinical Practice & Rationales */}
        <FeatureRow
          heading="Diagnostic rationales for every option"
          description="Practice curriculum units across laboratory disciplines. Immediate answer checks reveal why the correct diagnosis applies and why alternative differentials are excluded."
          bullets={[
            'Full clinical vignettes covering diagnostic criteria and laboratory methods',
            'Differential rationales explaining distractor options',
            'Reference citations and source materials where available',
          ]}
        />

        {/* Feature 2: Mistakes Recovery */}
        <FeatureRow
          heading="Two consecutive correct answers to clear any mistake"
          description={`Every question answered incorrectly is automatically routed to your personal Mistakes Notebook. A question remains in your remediation queue until you answer it correctly on ${MISTAKE_CLEAR_THRESHOLD} consecutive attempts, eliminating lucky guesses.`}
          bullets={[
            `Rigorous ${MISTAKE_CLEAR_THRESHOLD}-streak clearing requirement prevents premature removal`,
            'Dedicated remediation mode to practice only your active mistake queue',
            'Real-time mistake counter in the navigation bar keeps revision top-of-mind',
          ]}
        />

        {/* Feature 3: Bookmarks & Study Notes */}
        <FeatureRow
          heading="Save questions and record diagnostic notes"
          description="Flag challenging clinical concepts during practice or mock reviews. Attach custom study notes directly to each question to build a high-yield reference library tailored to your weak points."
          bullets={[
            'One-click bookmarking during practice and timed exam reviews',
            'Editable in-place study notes for clinical mnemonics and criteria',
            'Start custom practice sessions filtered directly from your bookmarked items',
          ]}
        />

        {/* Feature 4: Analytics, Pacing & Readiness */}
        <FeatureRow
          heading="Track subject accuracy, pacing, and estimated readiness"
          description="Identify your weakest syllabus sections before exam day. Detailed analytics monitor your average, fastest, and slowest seconds per question, active study streaks, and heuristic score projection."
          bullets={[
            'Discipline breakdown automatically highlights units below 70% accuracy',
            'Pacing metrics measure seconds per item to prevent running out of time',
            'Explainable predicted score based on real practice and mock attempts',
          ]}
        />

        {/* Feature 5: Standardized Timed Mock Exams & Grand Tests */}
        <FeatureRow
          heading="Timed mock sittings and weekly Grand Tests"
          description={`Experience actual test conditions with licensing blueprints, strict countdown timers, and standardized negative marking. Sit the weekly national Grand Test every ${grandOpenDay} through ${grandCloseDay}.`}
          bullets={[
            `CEE-UG Entrance: ${CEE_UG_TOTAL_QUESTIONS} questions, ${CEE_UG_DURATION_MINUTES} minutes, -${CEE_UG_PENALTY_PER_WRONG} negative marking`,
            'Board-specific blueprints for ASCP, NHPC, PSC, DHA, and AIMS',
            `Weekly Grand Test window (${grandOpenDay} 11:00 AM to ${grandCloseDay} midnight)`,
          ]}
        />
      </div>
    </section>
  );
};
