import { UnitCategory } from '../types';
import { CEE_UG_CATEGORY_UNITS } from '../config/ceeUg';

export const INITIAL_CATEGORIES: UnitCategory[] = [
  {
    id: 'unit-chem',
    name: 'Clinical Chemistry',
    description: 'Biochemical markers, enzymology, endocrinology, toxicological monitoring, and blood gas analysis.',
    subjects: [
      {
        id: 'chem-enzymes',
        name: 'Clinical Enzymology & Hepatic Function',
        topics: ['Transaminases (ALT/AST)', 'Alkaline Phosphatase & GGT', 'Amylase & Lipase', 'Isoenzymes'],
      },
      {
        id: 'chem-cardiac',
        name: 'Lipid & Cardiac Markers',
        topics: ['High-Sensitivity Troponin', 'CK-MB & Myoglobin', 'Natriuretic Peptides (BNP/NT-proBNP)', 'Lipoprotein Fractions'],
      },
      {
        id: 'chem-renal',
        name: 'Renal Function & Electrolytes',
        topics: ['Creatinine Clearance & eGFR', 'Blood Urea Nitrogen', 'Electrolyte Imbalances', 'Blood Gas & Acid-Base'],
      },
      {
        id: 'chem-endocrine',
        name: 'Endocrinology & Metabolism',
        topics: ['Glycemic Control & HbA1c', 'Thyroid Function (TSH, FT4)', 'Adrenal Cortical Steroids', 'Calcium & Parathyroid'],
      },
    ],
  },
  {
    id: 'unit-hema',
    name: 'Hematology & Hemostasis',
    description: 'Morphologic hematology, flow cytometry, hemoglobinopathies, and coagulation cascades.',
    subjects: [
      {
        id: 'hema-erythro',
        name: 'Erythrocytes & Anemias',
        topics: ['Iron Deficiency vs ACD', 'Megaloblastic & Pernicious Anemia', 'Hemoglobinopathies & Sickle Cell', 'Hemolytic Anemias'],
      },
      {
        id: 'hema-leuko',
        name: 'Leukocytes & Leukemias',
        topics: ['Acute Myeloid Leukemia (AML)', 'Acute Lymphoblastic Leukemia (ALL)', 'Chronic Myelogenous Leukemia (CML)', 'Myelodysplastic Syndromes'],
      },
      {
        id: 'hema-coag',
        name: 'Platelets & Hemostasis',
        topics: ['PT/INR & Extrinsic Pathway', 'aPTT & Intrinsic Pathway', 'von Willebrand Factor & Platelet Function', 'Anticoagulant Monitoring (DOACs, Heparin)'],
      },
    ],
  },
  {
    id: 'unit-micro',
    name: 'Clinical Microbiology & Parasitology',
    description: 'Diagnostic bacteriology, antimicrobial susceptibility (AST), mycology, and parasitic identification.',
    subjects: [
      {
        id: 'micro-bact',
        name: 'Diagnostic Bacteriology',
        topics: ['Gram-Positive Cocci Identification', 'Enterobacterales & Non-Fermenters', 'Fastidious Pathogens (Neisseria, Haemophilus)', 'Mycobacterium tuberculosis & AFB'],
      },
      {
        id: 'micro-ast',
        name: 'Antimicrobial Susceptibility',
        topics: ['CLSI Breakpoints & Kirby-Bauer', 'ESBL & Carbapenemase Detection', 'MRSA & Vancomycin Resistance', 'MIC Determinations'],
      },
      {
        id: 'micro-parasit',
        name: 'Diagnostic Parasitology & Mycology',
        topics: ['Blood Parasites (Plasmodium, Babesia)', 'Intestinal Protozoa & Helminths', 'Dimorphic Systemic Fungi', 'Opportunistic Yeasts & Molds'],
      },
    ],
  },
  {
    id: 'unit-immuno',
    name: 'Immunology & Serology',
    description: 'Immune response mechanisms, autoantibodies, infectious serology, and flow cytometry.',
    subjects: [
      {
        id: 'immuno-auto',
        name: 'Autoimmune & Rheumatologic Serology',
        topics: ['Antinuclear Antibodies (ANA Patterns)', 'Rheumatoid Factor & Anti-CCP', 'ANCA Vasculitides', 'Celiac Disease Serology'],
      },
      {
        id: 'immuno-infect',
        name: 'Infectious Disease Serology',
        topics: ['Hepatitis B & C Serologic Markers', 'HIV 4th Gen Antigen/Antibody', 'Syphilis Algorithms (Traditional vs Reverse)', 'TORCH Panel'],
      },
    ],
  },
  {
    id: 'unit-bank',
    name: 'Immunohematology (Blood Banking)',
    description: 'Transfusion medicine, blood group antigen-antibody interactions, and donor compatibility.',
    subjects: [
      {
        id: 'bank-systems',
        name: 'Blood Group Systems & Transfusion',
        topics: ['ABO/Rh Discrepancies & Resolutions', 'Unexpected Antibody Identification', 'Crossmatching & Direct Antiglobulin Test (DAT)', 'Transfusion Reactions & Workup'],
      },
    ],
  },
  {
    id: 'unit-fluids',
    name: 'Urinalysis & Body Fluids',
    description: 'Physical, chemical, and microscopic evaluation of urine, CSF, synovial, and serous fluids.',
    subjects: [
      {
        id: 'fluids-urine',
        name: 'Clinical Urinalysis',
        topics: ['Reagent Strip Reactions & Interferences', 'Urine Sediment Crystals & Casts', 'Renal Tubular Epithelial Cells', 'Proteinuria Classification'],
      },
      {
        id: 'fluids-serous',
        name: 'Extravascular Body Fluids',
        topics: ['Cerebrospinal Fluid (CSF) Differential', 'Transudates vs Exudates (Light\'s Criteria)', 'Synovial Crystal Identification', 'Peritoneal Fluid Biomarkers'],
      },
    ],
  },
  {
    id: 'unit-mol',
    name: 'Molecular Diagnostics',
    description: 'Nucleic acid amplification, Sanger and NGS sequencing, and genetic variant interpretations.',
    subjects: [
      {
        id: 'mol-tech',
        name: 'Molecular Techniques & Applications',
        topics: ['Real-Time Quantitative PCR', 'Target Amplification vs Signal Amplification', 'Viral Load Monitoring (HIV, HCV)', 'Pharmacogenomics Testing'],
      },
    ],
  },
  {
    id: 'unit-qa',
    name: 'Laboratory Operations & QA',
    description: 'Quality control, Westgard multirules, pre-analytical variability, safety, and ISO 15189 standards.',
    subjects: [
      {
        id: 'qa-rules',
        name: 'Statistical Quality Control',
        topics: ['Westgard Multirule Evaluation', 'Levey-Jennings Chart Analysis', 'Systematic vs Random Error', 'Method Validation & Calibration Verification'],
      },
    ],
  },
  // CEE-UG (MECEE-BL) entrance subjects — Physics, Chemistry, Biology, Mental Ability
  ...CEE_UG_CATEGORY_UNITS,
];
