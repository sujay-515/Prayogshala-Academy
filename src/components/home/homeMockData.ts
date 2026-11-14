import type { ExamCategory } from '../../types';

export type OptionId = 'A' | 'B' | 'C' | 'D';

export interface LabAnalyteRow {
  analyte: string;
  value: string;
  reference: string;
  flag?: 'H' | 'L' | 'R' | 'Pos' | 'Abn' | 'Normal';
}

export interface ClinicalDemoCase {
  id: string;
  code: string;
  discipline: string;
  unit: string;
  boards: ExamCategory[];
  patientSummary: string;
  labPanel: LabAnalyteRow[];
  questionStem: string;
  options: {
    id: OptionId;
    text: string;
    rationale: string;
  }[];
  correctAnswer: OptionId;
  summaryExplanation: string;
  reference: string;
}

export const CLINICAL_DEMO_CASES: ClinicalDemoCase[] = [
  {
    id: 'demo-hem-104',
    code: 'LAB-HEM-104',
    discipline: 'Hematology & Coagulation',
    unit: 'Platelets & Hemostasis',
    boards: ['ASCP', 'NHPC', 'DHA'],
    patientSummary:
      'A 34-year-old woman presents with acute confusion, petechiae, fever (38.4 °C), and dark urine.',
    labPanel: [
      { analyte: 'Platelet Count', value: '18 × 10⁹/L', reference: '150–400', flag: 'L' },
      { analyte: 'Hemoglobin', value: '7.8 g/dL', reference: '12.0–15.5', flag: 'L' },
      { analyte: 'PT / INR', value: '11.8 s / 1.0', reference: '11.0–13.5 s', flag: 'Normal' },
      { analyte: 'Peripheral Smear', value: '4+ Schistocytes', reference: 'None', flag: 'H' },
    ],
    questionStem:
      'Which confirmatory laboratory assay best establishes the primary diagnosis?',
    options: [
      {
        id: 'A',
        text: 'ADAMTS13 activity assay (< 10%)',
        rationale:
          'Microangiopathic hemolytic anemia with severe thrombocytopenia and normal PT/INR indicates Thrombotic Thrombocytopenic Purpura (TTP), driven by severe deficiency of vWF-cleaving protease ADAMTS13 (< 10%).',
      },
      {
        id: 'B',
        text: 'D-dimer & fibrinogen consumption panel',
        rationale:
          'Normal PT/INR argues against Disseminated Intravascular Coagulation (DIC), where coagulation factor consumption prolongs PT and aPTT alongside elevated D-dimer.',
      },
      {
        id: 'C',
        text: 'Direct antiglobulin test (DAT, IgG/C3d)',
        rationale:
          'DAT evaluates immune-mediated hemolytic anemia (typically presenting with spherocytes), rather than mechanical RBC fragmentation with profound thrombocytopenia.',
      },
      {
        id: 'D',
        text: 'Bone marrow megakaryocyte biopsy',
        rationale:
          'Immune thrombocytopenia (ITP) is an isolated platelet disorder without schistocytes, fever, or neurological findings, and marrow biopsy is not indicated here.',
      },
    ],
    correctAnswer: 'A',
    summaryExplanation:
      'Severe thrombocytopenia paired with microangiopathic schistocytes and intact coagulation times (normal PT/INR) points to TTP rather than DIC or ITP. Confirming ADAMTS13 activity < 10% supports immediate plasma exchange.',
    reference: "Rodak's Hematology: Clinical Principles and Applications, 6th Ed., Ch. 39",
  },
  {
    id: 'demo-mic-218',
    code: 'LAB-MIC-218',
    discipline: 'Diagnostic Microbiology',
    unit: 'Antimicrobial Susceptibility Testing (AST)',
    boards: ['ASCP', 'PSC', 'AIMS'],
    patientSummary:
      'A Klebsiella pneumoniae isolate from an ICU blood culture exhibits carbapenem resistance on broth microdilution.',
    labPanel: [
      { analyte: 'Meropenem MIC', value: '≥ 16 µg/mL', reference: '≤ 1 µg/mL', flag: 'R' },
      { analyte: 'mCIM (No EDTA)', value: '6 mm zone', reference: '≥ 19 mm Neg', flag: 'Pos' },
      { analyte: 'eCIM (+ 5 mM EDTA)', value: '22 mm zone', reference: '≥ 5 mm gain', flag: 'Pos' },
      { analyte: 'Ceftazidime-Avibactam', value: 'Resistant', reference: 'Susceptible', flag: 'R' },
    ],
    questionStem:
      'Based on the CLSI mCIM/eCIM phenotypic profile, which carbapenemase class is present?',
    options: [
      {
        id: 'A',
        text: 'Ambler Class A serine carbapenemase (KPC)',
        rationale:
          'KPC enzymes rely on serine at the active site and are inhibited by avibactam or boronic acid, not EDTA; therefore eCIM remains negative (< 5 mm zone difference).',
      },
      {
        id: 'B',
        text: 'Ambler Class B metallo-β-lactamase (NDM / VIM / IMP)',
        rationale:
          'Metallo-β-lactamases require zinc ions for catalysis. Adding EDTA chelates zinc, restoring meropenem zone diameter (≥ 5 mm increase over mCIM), and avibactam fails to inhibit Class B enzymes.',
      },
      {
        id: 'C',
        text: 'Ambler Class D oxacillinase (OXA-48-like)',
        rationale:
          'OXA-48-like enzymes are serine carbapenemases unaffected by EDTA chelation, giving a positive mCIM but negative eCIM.',
      },
      {
        id: 'D',
        text: 'ESBL hyperproduction with outer-membrane porin loss',
        rationale:
          'Porin loss paired with ESBLs typically tests mCIM-negative because ESBLs do not rapidly hydrolyze meropenem during the 4-hour inactivation step.',
      },
    ],
    correctAnswer: 'B',
    summaryExplanation:
      'A positive mCIM paired with an eCIM zone increase ≥ 5 mm demonstrates zinc-dependent metallo-β-lactamase activity (Class B: NDM, VIM, or IMP), explaining concurrent ceftazidime-avibactam resistance.',
    reference: 'CLSI M100 Performance Standards for Antimicrobial Susceptibility Testing, Sec. 3C',
  },
  {
    id: 'demo-bio-309',
    code: 'LAB-BIO-309',
    discipline: 'Clinical Biochemistry',
    unit: 'Renal Function & Electrolytes',
    boards: ['ASCP', 'NHPC', 'DHA'],
    patientSummary:
      'An unconscious 42-year-old man arrives in the emergency department with tachypnea and acute flank tenderness.',
    labPanel: [
      { analyte: 'Arterial pH / HCO₃⁻', value: '7.21 / 10 mmol/L', reference: '7.35–7.45', flag: 'L' },
      { analyte: 'Anion Gap', value: '26 mmol/L', reference: '8–12 mmol/L', flag: 'H' },
      { analyte: 'Osmolal Gap', value: '28 mOsm/kg', reference: '< 10 mOsm/kg', flag: 'H' },
      { analyte: 'Urine Microscopy', value: 'Envelope crystals', reference: 'None', flag: 'Abn' },
    ],
    questionStem:
      'Which toxic ingestion accounts for both the elevated osmolal gap and the urinary crystal morphology?',
    options: [
      {
        id: 'A',
        text: 'Methanol (formic acid accumulation)',
        rationale:
          'Methanol raises the osmolal gap and causes high-anion-gap metabolic acidosis with optic nerve toxicity, but it is metabolized to formate rather than oxalate.',
      },
      {
        id: 'B',
        text: 'Isopropanol (acetone ketonemia)',
        rationale:
          'Isopropanol increases the osmolal gap and yields positive serum/urine ketones, yet does not generate organic acid metabolites or a high anion gap.',
      },
      {
        id: 'C',
        text: 'Ethylene glycol (oxalic acid metabolism)',
        rationale:
          'Alcohol dehydrogenase oxidizes ethylene glycol into glycolic and oxalic acids, driving severe HAGMA, an elevated osmolal gap, and envelope-shaped calcium oxalate dihydrate crystals.',
      },
      {
        id: 'D',
        text: 'Salicylate overdose',
        rationale:
          'Salicylates typically induce mixed respiratory alkalosis and high-anion-gap acidosis without raising the osmolal gap or forming oxalate crystals.',
      },
    ],
    correctAnswer: 'C',
    summaryExplanation:
      'Concurrent high-anion-gap metabolic acidosis, an elevated osmolal gap, and calcium oxalate crystalluria (envelope dihydrate or dumbbell monohydrate) are hallmark laboratory findings in ethylene glycol poisoning.',
    reference: 'Tietz Textbook of Clinical Chemistry and Molecular Diagnostics, 7th Ed., Ch. 42',
  },
];

export interface BillingPlanPreview {
  id: string;
  name: string;
  durationDays: number;
  priceNpr: number;
  currency: string;
}

/** Mirrors seeded catalog in src/server/db.ts (lines 422-424) while /api/billing/plans loads. */
export const DEFAULT_BILLING_PLANS: BillingPlanPreview[] = [
  { id: 'plan-1m', name: '1 Month Full Access', durationDays: 30, priceNpr: 500, currency: 'NPR' },
  { id: 'plan-3m', name: '3 Months Full Access', durationDays: 90, priceNpr: 1200, currency: 'NPR' },
  { id: 'plan-6m', name: '6 Months Full Access', durationDays: 180, priceNpr: 2000, currency: 'NPR' },
];

/** Mirrors FREE_PRACTICE_PER_UNIT and FREE_MOCK_EXAMS in src/server/billing.ts. */
export const FREE_TIER_LIMITS = {
  practicePerUnit: 20,
  freeMockExams: 1,
} as const;

export const FALLBACK_SUBJECT_PREVIEWS = [
  { id: 'hem', name: 'Hematology', unitsCount: 8, icon: 'Microscope' },
  { id: 'mic', name: 'Microbiology', unitsCount: 9, icon: 'Bug' },
  { id: 'bio', name: 'Clinical Biochemistry', unitsCount: 10, icon: 'FlaskConical' },
  { id: 'bbk', name: 'Blood Bank & Serology', unitsCount: 6, icon: 'Droplets' },
  { id: 'his', name: 'Histopathology', unitsCount: 5, icon: 'Layers' },
  { id: 'par', name: 'Parasitology', unitsCount: 5, icon: 'Dna' },
] as const;

export interface BoardSpecification {
  code: ExamCategory;
  title: string;
  governingBody: string;
  jurisdiction: string;
  focus: string;
  keyDomains: string;
}

export const BOARD_SPECIFICATIONS: Record<ExamCategory, BoardSpecification> = {
  ASCP: {
    code: 'ASCP',
    title: 'ASCP International (MLS)',
    governingBody: 'American Society for Clinical Pathology',
    jurisdiction: 'International',
    focus: 'Lab correlation, troubleshooting & QC operations.',
    keyDomains: 'Blood Bank · Chemistry · Hematology · Micro',
  },
  NHPC: {
    code: 'NHPC',
    title: 'NHPC Licensure Exam',
    governingBody: 'Nepal Health Professional Council',
    jurisdiction: 'Nepal',
    focus: 'BMLT & CMLT licensing competency coverage.',
    keyDomains: 'Clinical Path · Bacteriology · Biochemistry',
  },
  PSC: {
    code: 'PSC',
    title: 'PSC / Lok Sewa (Lab)',
    governingBody: 'Public Service Commission',
    jurisdiction: 'Nepal Civil Service',
    focus: 'National lab guidelines, biosafety & diagnostics.',
    keyDomains: 'Public Health · Quality Systems · Diagnostics',
  },
  DHA: {
    code: 'DHA',
    title: 'DHA Licensure Exam',
    governingBody: 'Dubai Health Authority',
    jurisdiction: 'UAE / Gulf',
    focus: 'Applied pathology, analyzer QC & Westgard rules.',
    keyDomains: 'Chemistry · Immunohematology · QA/QC',
  },
  AIMS: {
    code: 'AIMS',
    title: 'AIMS Assessment',
    governingBody: 'Australian Institute of Medical Scientists',
    jurisdiction: 'Australia',
    focus: 'Multi-discipline diagnostics & laboratory safety.',
    keyDomains: 'Anatomical · Transfusion · Microbiology',
  },
  'CEE-UG': {
    code: 'CEE-UG',
    title: 'CEE-UG Medical Mock',
    governingBody: 'Medical Education Commission',
    jurisdiction: 'Nepal Entrance',
    focus: '200-item timed exam with -0.25 negative marking.',
    keyDomains: 'Biology · Chemistry · Physics · MAT',
  },
};

export const CEE_UG_BLUEPRINT_DOMAINS = [
  { label: 'Biology (Botany & Zoology)', questions: 80, sharePct: 40, barClass: 'bg-cyan-700 dark:bg-cyan-400' },
  { label: 'Chemistry (Org / Inorg / Phys)', questions: 50, sharePct: 25, barClass: 'bg-emerald-600 dark:bg-emerald-400' },
  { label: 'Physics & Mechanics', questions: 50, sharePct: 25, barClass: 'bg-blue-600 dark:bg-blue-400' },
  { label: 'Mental Agility Test (MAT)', questions: 20, sharePct: 10, barClass: 'bg-amber-600 dark:bg-amber-400' },
];

export interface TelemetryProfile {
  id: 'balanced' | 'rushing' | 'overthinking';
  label: string;
  avgSeconds: number;
  fastestSeconds: number;
  slowestSeconds: number;
  accuracyPct: number;
  readinessBand: string;
  pacingVerdict: string;
  pacingAdvice: string;
  weakUnits: { unit: string; accuracy: number }[];
}

export const TELEMETRY_DEMO_PROFILES: TelemetryProfile[] = [
  {
    id: 'balanced',
    label: 'Balanced Pacing',
    avgSeconds: 46,
    fastestSeconds: 19,
    slowestSeconds: 78,
    accuracyPct: 81,
    readinessBand: '78–84% Projected Readiness',
    pacingVerdict: 'Optimal exam tempo',
    pacingAdvice: 'Time per vignette aligns well with 54 s/item board pacing without late-exam fatigue.',
    weakUnits: [
      { unit: 'Antimicrobial Susceptibility Testing (AST)', accuracy: 66 },
      { unit: 'Immunohematology & Blood Transfusion', accuracy: 74 },
      { unit: 'Hepatic Function & Clinical Enzymology', accuracy: 86 },
    ],
  },
  {
    id: 'rushing',
    label: 'Rushing (<18 s/item)',
    avgSeconds: 16,
    fastestSeconds: 7,
    slowestSeconds: 31,
    accuracyPct: 58,
    readinessBand: '54–62% Projected Readiness',
    pacingVerdict: 'Fast-error pattern detected',
    pacingAdvice: 'Incorrect responses average 14 s — slowing down to verify lab reference intervals reduces preventable misses.',
    weakUnits: [
      { unit: 'Platelets & Hemostasis', accuracy: 52 },
      { unit: 'Renal Function & Electrolytes', accuracy: 59 },
      { unit: 'Diagnostic Bacteriology', accuracy: 64 },
    ],
  },
  {
    id: 'overthinking',
    label: 'Over-Deliberating (>85 s/item)',
    avgSeconds: 92,
    fastestSeconds: 44,
    slowestSeconds: 148,
    accuracyPct: 73,
    readinessBand: '68–75% Projected Readiness',
    pacingVerdict: 'Time-budget risk on 200-Q mocks',
    pacingAdvice: 'Flag uncertain items after 60 s and move on to prevent unanswered questions at timer expiry.',
    weakUnits: [
      { unit: 'Clinical Mycology & Virology', accuracy: 63 },
      { unit: 'Endocrinology & Metabolic Disorders', accuracy: 69 },
      { unit: 'Erythrocytes & Anemias', accuracy: 82 },
    ],
  },
];
