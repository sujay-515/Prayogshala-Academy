import React from 'react';
import { CheckCircle2, BookOpen, ExternalLink } from 'lucide-react';

/**
 * [PLACEHOLDER: Pending user selection between Candidate 1, 2, or 3]
 * Currently rendering Candidate 1 (Clinical Enzymology & Cholestasis).
 * Alternative candidates ready in codebase:
 * - Candidate 2: Hemostasis & Coagulation (Factor VIII / Hemophilia A)
 * - Candidate 3: Diagnostic Microbiology (Pseudomonas aeruginosa)
 */
export const ExplanationCardPreview: React.FC = () => {
  return (
    <div
      className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg border border-slate-200/80 dark:border-white/10 relative overflow-hidden"
      role="region"
      aria-label="Interactive Diagnostic Rationale Preview"
    >
      {/* Decorative top accent line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-400" />

      {/* Header tags */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300 font-semibold text-[11px] border border-cyan-200 dark:border-cyan-800/40">
            Clinical Biochemistry
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            Unit: Hepatic Function &amp; Enzymology
          </span>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Server Verified</span>
        </span>
      </div>

      {/* Clinical Vignette Question */}
      <div className="space-y-1.5">
        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
          A 42-year-old female presents with yellowing of the sclera and dark urine. Laboratory investigations reveal: Total Bilirubin: 8.4 mg/dL, Direct Bilirubin: 6.9 mg/dL, Alkaline Phosphatase: 420 U/L (Ref: 44–147 U/L), ALT: 65 U/L (Ref: 7–56 U/L). Urine analysis shows positive bilirubin and absence of urobilinogen. Which condition is most probable?
        </h4>
      </div>

      {/* Options snippet */}
      <div className="space-y-2 pt-1" role="list">
        <div
          role="listitem"
          className="p-3 rounded-xl border border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5 shadow-xs"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-bold bg-emerald-600 text-white shrink-0 mt-0.5">
            A
          </span>
          <div className="flex-1 text-xs sm:text-sm font-medium">
            Extrahepatic biliary tract obstruction (choledocholithiasis)
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        </div>

        <div
          role="listitem"
          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 flex items-start gap-2.5 text-xs opacity-75"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
            B
          </span>
          <span className="line-through">Acute intravascular hemolytic anemia</span>
        </div>
      </div>

      {/* Diagnostic Rationale Reveal */}
      <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-500/25 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
        <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Diagnostic Rationale</span>
        </div>
        <p className="text-xs sm:text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
          Marked elevation of conjugated (direct) bilirubin and alkaline phosphatase with minimal aminotransferase elevation strongly indicates a post-hepatic cholestatic pattern. Complete biliary obstruction halts urobilinogen synthesis in the intestine, producing dark bilirubinuria and absent urobilinogen.
        </p>
        <div className="pt-1.5 border-t border-emerald-200/60 dark:border-emerald-500/20 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Reference: Henry's Clinical Diagnosis and Management, 24th Ed.</span>
          <span className="text-cyan-700 dark:text-cyan-400 font-medium inline-flex items-center gap-0.5">
            Peer reviewed <ExternalLink className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
