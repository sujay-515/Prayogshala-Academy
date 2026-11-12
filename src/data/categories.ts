import { SubjectCategory, SubjectUnit } from '../types';

export const INITIAL_CATEGORIES: SubjectCategory[] = [
  {
    id: 'subject-micro',
    name: 'Microbiology',
    description: 'Diagnostic bacteriology, antimicrobial susceptibility (AST), clinical mycology, virology, and culture techniques.',
    icon: 'Microscope',
    units: [
      {
        id: 'micro-bact',
        name: 'Diagnostic Bacteriology',
        topics: ['Gram-Positive Cocci Identification', 'Enterobacterales & Non-Fermenters', 'Fastidious Pathogens & Anaerobes', 'Mycobacterium tuberculosis & AFB Staining'],
      },
      {
        id: 'micro-ast',
        name: 'Antimicrobial Susceptibility Testing (AST)',
        topics: ['CLSI / EUCAST Breakpoints & Kirby-Bauer', 'ESBL & Carbapenemase Detection', 'MRSA & Vancomycin Resistance', 'MIC Determinations & E-test'],
      },
      {
        id: 'micro-myco-viro',
        name: 'Clinical Mycology & Virology',
        topics: ['Yeasts & Candida Identification', 'Dermatophytes & Dimorphic Fungi', 'Viral Diagnostic Methods & Cell Culture', 'Opportunistic Fungal Infections'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-biochem',
    name: 'Clinical Biochemistry',
    description: 'Clinical enzymology, cardiac & lipid markers, renal & liver function tests, electrolytes, and endocrinology.',
    icon: 'FlaskConical',
    units: [
      {
        id: 'biochem-hepatic',
        name: 'Hepatic Function & Clinical Enzymology',
        topics: ['Transaminases (ALT/AST)', 'Alkaline Phosphatase & GGT', 'Bilirubin Metabolism & Jaundice', 'Amylase & Lipase Isoenzymes'],
      },
      {
        id: 'biochem-renal',
        name: 'Renal Function & Electrolytes',
        topics: ['Serum Creatinine & eGFR', 'Blood Urea Nitrogen (BUN)', 'Electrolyte Imbalances & Anion Gap', 'Blood Gas & Acid-Base Balance'],
      },
      {
        id: 'biochem-cardiac',
        name: 'Lipid & Cardiac Markers',
        topics: ['High-Sensitivity Troponin', 'CK-MB & Myoglobin', 'Natriuretic Peptides (BNP/NT-proBNP)', 'Lipoprotein Fractions & Atherosclerosis'],
      },
      {
        id: 'biochem-endocrine',
        name: 'Endocrinology & Metabolic Disorders',
        topics: ['Glycemic Monitoring & HbA1c', 'Thyroid Function (TSH, FT3, FT4)', 'Adrenal Cortical Steroids', 'Calcium & Parathyroid Regulation'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-hema-bank',
    name: 'Hematology and Blood Banking',
    description: 'Morphologic hematology, anemias, leukemias, coagulation cascades, immunohematology, and transfusion medicine.',
    icon: 'Droplets',
    units: [
      {
        id: 'hema-erythro',
        name: 'Erythrocytes & Anemias',
        topics: ['Iron Deficiency vs Anemia of Chronic Disease', 'Megaloblastic & Pernicious Anemia', 'Hemoglobinopathies & Sickle Cell', 'Hemolytic Anemias & RBC Indices'],
      },
      {
        id: 'hema-leuko',
        name: 'Leukocytes & Hematologic Malignancies',
        topics: ['Acute Myeloid Leukemia (AML)', 'Acute Lymphoblastic Leukemia (ALL)', 'Chronic Myelogenous Leukemia (CML)', 'Myelodysplastic Syndromes & Lymphomas'],
      },
      {
        id: 'hema-coag',
        name: 'Platelets & Hemostasis',
        topics: ['PT/INR & Extrinsic Pathway', 'aPTT & Intrinsic Pathway', 'von Willebrand Factor & Platelet Function', 'Anticoagulant Monitoring (DOACs, Heparin)'],
      },
      {
        id: 'hema-bank-transfusion',
        name: 'Immunohematology & Blood Transfusion',
        topics: ['ABO/Rh Discrepancies & Resolutions', 'Unexpected Antibody Identification', 'Crossmatching & Antiglobulin Testing (DAT/IAT)', 'Transfusion Reactions & Blood Component Therapy'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-histo-cyto',
    name: 'Histopathology and Cytopathology',
    description: 'Tissue processing, microtomy, routine H&E staining, special histochemical stains, cytology, and immunohistochemistry.',
    icon: 'Layers',
    units: [
      {
        id: 'histo-processing',
        name: 'Tissue Fixation & Processing',
        topics: ['Fixatives (Formalin, Bouin, Carnoy)', 'Dehydration & Clearing Agents', 'Paraffin Infiltration & Embedding', 'Tissue Decalcification Methods'],
      },
      {
        id: 'histo-microtomy-stain',
        name: 'Microtomy & Staining Techniques',
        topics: ['Rotary Microtomy & Knife Geometry', 'Routine Hematoxylin & Eosin (H&E)', 'Special Stains (PAS, ZN, Masson, Reticulin)', 'Mounting Media & Artifacts'],
      },
      {
        id: 'histo-cyto-ihc',
        name: 'Cytopathology & Immunohistochemistry',
        topics: ['Exfoliative Cytology & Pap Smears', 'Fine Needle Aspiration Cytology (FNAC)', 'Cryostat Sectioning & Frozen Sections', 'Antigen Retrieval & Diagnostic IHC Markers'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-anat-phys',
    name: 'Anatomy and Physiology',
    description: 'Human structural anatomy, cardiovascular, renal, respiratory, and endocrine organ system physiology.',
    icon: 'Activity',
    units: [
      {
        id: 'anat-circ-hemo',
        name: 'Circulatory & Hematopoietic Systems',
        topics: ['Cardiac Conduction & Blood Pressure Regulation', 'Major Blood Vessels & Phlebotomy Anatomy', 'Bone Marrow & Hematopoiesis'],
      },
      {
        id: 'anat-renal-resp',
        name: 'Renal, Respiratory & Digestive Systems',
        topics: ['Nephron Structure & Glomerular Filtration', 'Pulmonary Gas Exchange & Transport', 'Gastrointestinal Tract & Hepatobiliary System'],
      },
      {
        id: 'anat-endo-nerv',
        name: 'Endocrine & Nervous Homeostasis',
        topics: ['Hypothalamic-Pituitary Endocrine Axes', 'Autonomic Nervous System', 'Electrolyte, Fluid & Thermal Homeostasis'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-clin-path',
    name: 'Clinical Pathology',
    description: 'Routine and microscopic urinalysis, body fluids analysis (CSF, pleural, ascetic, synovial), and semen examination.',
    icon: 'TestTubes',
    units: [
      {
        id: 'path-urine',
        name: 'Clinical Urinalysis',
        topics: ['Physical Examination & Specific Gravity', 'Reagent Strip Reactions & Interferences', 'Urine Sediment Casts, Crystals & Cells', 'Proteinuria & Glomerulopathies'],
      },
      {
        id: 'path-fluids',
        name: 'Extravascular Body Fluids',
        topics: ['Cerebrospinal Fluid (CSF) Differential & Chemistry', 'Transudates vs Exudates (Light\'s Criteria)', 'Synovial Fluid Crystal Analysis', 'Pleural, Peritoneal & Ascitic Fluids'],
      },
      {
        id: 'path-semen-stool',
        name: 'Semen Analysis & Clinical Microscopy',
        topics: ['Semen Volume, Sperm Count & Motility', 'Sperm Morphology & Viability Testing', 'Fecal Occult Blood & Microscopic Examination'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-parasit',
    name: 'Parasitology',
    description: 'Medical protozoology, helminthology, vector identification, parasitic life cycles, and diagnostic microscopy.',
    icon: 'Bug',
    units: [
      {
        id: 'parasit-blood',
        name: 'Blood & Tissue Parasites',
        topics: ['Plasmodium Species & Malaria Microscopy', 'Leishmania Donovani & Kala-Azar', 'Filarial Nematodes & Microfilariae', 'Trypanosoma & Babesia Diagnostics'],
      },
      {
        id: 'parasit-protozoa',
        name: 'Intestinal & Urogenital Protozoa',
        topics: ['Entamoeba Histolytica vs E. Dispar', 'Giardia Lamblia & Coccidia', 'Trichomonas Vaginalis & Stool Concentrates'],
      },
      {
        id: 'parasit-helminths',
        name: 'Medical Helminthology',
        topics: ['Intestinal Nematodes (Ascaris, Hookworm, Trichuris)', 'Cestodes (Taenia, Echinococcus Granulosus)', 'Trematodes (Fasciola, Schistosoma)'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-immuno-sero',
    name: 'Immunology and Serology',
    description: 'Innate & adaptive immunity, antigen-antibody reactions, serological tests for infectious diseases, and autoimmune disorders.',
    icon: 'ShieldCheck',
    units: [
      {
        id: 'immuno-basic',
        name: 'Basic Immunology & Complement',
        topics: ['Innate vs Adaptive Immunity', 'Immunoglobulin Classes & Functions', 'Complement Pathways (Classical & Alternative)', 'Hypersensitivity Reactions (Types I-IV)'],
      },
      {
        id: 'immuno-infect',
        name: 'Infectious Disease Serology',
        topics: ['Hepatitis B & C Serologic Markers', 'HIV 4th Gen Antigen/Antibody Testing', 'Syphilis Serology Algorithms (VDRL, TPHA, FTA-ABS)', 'Febrile Agglutinins & Widal Test'],
      },
      {
        id: 'immuno-auto',
        name: 'Autoimmune & Rheumatologic Serology',
        topics: ['Antinuclear Antibodies (ANA Patterns & Titers)', 'Rheumatoid Factor & Anti-CCP', 'ANCA Vasculitides', 'C-Reactive Protein (CRP) & ASO Titers'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-lab-mgmt',
    name: 'Laboratory Management and QMS',
    description: 'ISO 15189 standards, Westgard rules, internal & external quality control, laboratory safety, biosafety, and biomedical waste.',
    icon: 'ClipboardCheck',
    units: [
      {
        id: 'mgmt-quality-control',
        name: 'Quality Assurance & Statistical QC',
        topics: ['Internal Quality Control (IQC) & Westgard Multirules', 'Levey-Jennings Chart Analysis', 'External Quality Assessment Scheme (EQAS)', 'Pre-analytical, Analytical & Post-analytical Errors'],
      },
      {
        id: 'mgmt-biosafety',
        name: 'Laboratory Safety & Biosafety',
        topics: ['Biosafety Levels (BSL 1 to 4)', 'Chemical, Radiation & Biological Hazards', 'Biomedical Waste Segregation & Color Coding', 'Spill Clean-up & Post-Exposure Prophylaxis'],
      },
      {
        id: 'mgmt-iso',
        name: 'ISO 15189 & Laboratory Organization',
        topics: ['Standard Operating Procedures (SOPs)', 'Specimen Acceptance & Rejection Criteria', 'Equipment Maintenance & Calibration Logs', 'Laboratory Information Systems (LIS) & Audits'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-instrument',
    name: 'Instrumentation and Automation',
    description: 'Principles, operation, calibration, and troubleshooting of spectrophotometers, automated analyzers, and laboratory equipment.',
    icon: 'Cpu',
    units: [
      {
        id: 'instrument-photometry',
        name: 'Photometry, Spectrophotometry & Optics',
        topics: ['Beer-Lambert Law & Absorption Spectrophotometry', 'Colorimeters, Fluorometers & Turbidimetry', 'Refractometers & Flame Photometry'],
      },
      {
        id: 'instrument-automated',
        name: 'Automated Clinical Analyzers',
        topics: ['Automated Clinical Chemistry Analyzers', 'Automated Hematology 3-Part & 5-Part Counters', 'Chemiluminescence (CLIA) & ELISA Readers', 'Coagulation Analyzers & Flow Cytometers'],
      },
      {
        id: 'instrument-separation',
        name: 'Microscopy & Separation Equipment',
        topics: ['Brightfield, Darkfield & Fluorescent Microscopy', 'Centrifugation Physics, RCF & Rotor Maintenance', 'Electrophoresis (Agarose & Cellulose Acetate)', 'Chromatography Fundamentals (TLC, HPLC)'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-research-stats',
    name: 'Research Methodology and Biostatistics',
    description: 'Diagnostic test accuracy (sensitivity, specificity, ROC), clinical study designs, hypothesis testing, and biostatistics.',
    icon: 'BarChart3',
    units: [
      {
        id: 'stats-diagnostic',
        name: 'Diagnostic Test Accuracy & Evaluation',
        topics: ['Sensitivity, Specificity & Diagnostic Accuracy', 'Positive & Negative Predictive Values (PPV, NPV)', 'Receiver Operating Characteristic (ROC) Curves', 'Likelihood Ratios & Reference Intervals'],
      },
      {
        id: 'stats-biostatistics',
        name: 'Biostatistics & Hypothesis Testing',
        topics: ['Measures of Central Tendency & Dispersion', 'Normal Distribution & Standard Error', 'Parametric Tests (t-Test, ANOVA)', 'Non-Parametric Tests (Chi-Square, Mann-Whitney)'],
      },
      {
        id: 'stats-methodology',
        name: 'Clinical Study Designs & Ethics',
        topics: ['Cross-Sectional, Case-Control & Cohort Studies', 'Randomized Controlled Trials (RCT)', 'Sampling Methods & Bias Control', 'Ethical Approval & Informed Consent (IRC/NHRC)'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-pub-health',
    name: 'Public Health',
    description: 'Epidemiological principles, infectious disease surveillance, national health programs, vaccination, and vector control.',
    icon: 'Users',
    units: [
      {
        id: 'public-epi',
        name: 'Epidemiology & Disease Surveillance',
        topics: ['Incidence, Prevalence & Attack Rates', 'Epidemic Curve & Outbreak Investigation Steps', 'Notifiable Diseases & Integrated Disease Surveillance'],
      },
      {
        id: 'public-programs',
        name: 'National Health Programs & Immunization',
        topics: ['National Immunization Program (NIP/EPI)', 'National Tuberculosis & Leprosy Elimination', 'Vector-Borne Disease Control (Malaria, Dengue, Kala-Azar)', 'Maternal, Newborn & Child Health (MNCH)'],
      },
      {
        id: 'public-environ',
        name: 'Environmental & Occupational Health',
        topics: ['Drinking Water Quality Testing & MPN Coliform', 'Hospital Acquired Infections (HAI) Surveillance', 'Occupational Health Hazards in Diagnostic Labs'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-pharm',
    name: 'Pharmacology',
    description: 'Antimicrobial pharmacology, drug mechanisms, therapeutic drug monitoring (TDM), and toxicological principles.',
    icon: 'Pill',
    units: [
      {
        id: 'pharm-antimicrobial',
        name: 'Antimicrobial Agents & Resistance',
        topics: ['Beta-Lactams, Glycopeptides & Aminoglycosides', 'Macrolides, Fluoroquinolones & Tetracyclines', 'Antifungal, Antiviral & Antimalarial Drugs', 'Mechanisms of Microbial Drug Resistance'],
      },
      {
        id: 'pharm-tdm',
        name: 'Therapeutic Drug Monitoring (TDM)',
        topics: ['Peak vs Trough Serum Concentrations', 'Therapeutic Index & Clearance', 'Digoxin, Aminoglycosides & Vancomycin TDM', 'Antiepileptic & Lithium Therapeutic Monitoring'],
      },
      {
        id: 'pharm-toxicology',
        name: 'Clinical Toxicology & Drug Screenings',
        topics: ['Drugs of Abuse Screening Assays', 'Acetaminophen & Salicylate Toxicity', 'Heavy Metal Poisoning (Lead, Arsenic, Mercury)'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-health-policy',
    name: 'Health Policy',
    description: 'National health policy, health care delivery system, laboratory regulations, health insurance, and strategic healthcare plans.',
    icon: 'FileText',
    units: [
      {
        id: 'policy-system',
        name: 'Health Care Delivery System',
        topics: ['Three-Tier Healthcare Hierarchy in Nepal', 'Primary Health Care (PHC) & Basic Health Services', 'Referral Network & Public-Private Partnerships'],
      },
      {
        id: 'policy-national',
        name: 'National Health & Laboratory Policies',
        topics: ['National Health Policy Principles & Priorities', 'National Laboratory Policy & Diagnostic Standards', 'Sustainable Development Goals (SDG-3 Targets)'],
      },
      {
        id: 'policy-financing',
        name: 'Health Financing, Insurance & Regulation',
        topics: ['Social Health Insurance Scheme (HIB)', 'Drug Regulatory Authority (DDA)', 'International Health Regulations (IHR) & Emergency Response'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
  {
    id: 'subject-nhpc-ethics',
    name: 'NHPC and Ethics',
    description: 'Nepal Health Professional Council Act, code of medical laboratory ethics, professional licensing, and medico-legal responsibilities.',
    icon: 'Award',
    units: [
      {
        id: 'nhpc-regulations',
        name: 'NHPC Act, Rules & Licensing',
        topics: ['Nepal Health Professional Council (NHPC) Act 2053', 'Licensing Examination Guidelines & Syllabi', 'Registration Categories (Levels & Degrees)', 'Continuing Professional Development (CPD)'],
      },
      {
        id: 'nhpc-ethics-code',
        name: 'Code of Ethics & Professional Conduct',
        topics: ['Code of Ethics for Medical Laboratory Professionals', 'Patient Confidentiality, Privacy & Data Protection', 'Informed Consent & Professional Integrity', 'Conflict of Interest & Reporting Obligations'],
      },
      {
        id: 'nhpc-medico-legal',
        name: 'Medico-Legal & Jurisprudential Issues',
        topics: ['Chain of Custody in Forensic Laboratory Samples', 'Retention of Laboratory Records & Specimens', 'Medical Negligence, Malpractice & Legal Accountability'],
      },
    ],
    get subjects(): SubjectUnit[] {
      return this.units ?? [];
    },
  },
];
