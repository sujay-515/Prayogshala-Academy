/**
 * Representative Laboratory Medicine PDF content & pre-extracted test bundles
 * allows instant testing of the PDF-to-MCQ staging workflow as specified in requirements
 */

export const SAMPLE_MEDICINE_PDF_TEXT = `
BOARD REVIEW IN LABORATORY MEDICINE & PATHOLOGY
EXAMINATION REVISION SERIES 2026

Question 1:
A 42-year-old female presents with yellowing of the sclera and dark tea-colored urine. Laboratory investigations reveal: Total Bilirubin: 8.4 mg/dL, Direct (Conjugated) Bilirubin: 6.9 mg/dL, Alkaline Phosphatase: 420 U/L (Ref: 44-147 U/L), ALT: 65 U/L (Ref: 7-56 U/L). Urine analysis shows positive bilirubin and absence of urobilinogen. Which condition is most probable?
A) Extrahepatic biliary tract obstruction (choledocholithiasis)
B) Acute intravascular hemolytic anemia
C) Gilbert syndrome (UGT1A1 mutation)
D) Crigler-Najjar syndrome Type I
Answer: A
Explanation: Marked elevation of conjugated (direct) bilirubin and alkaline phosphatase with minimal aminotransferase elevation strongly indicates a post-hepatic obstructive etiology (cholestasis). Complete biliary obstruction prevents bilirubin from reaching the intestine, leading to absent urobilinogen in urine and pale stools.
Reference: Henry's Clinical Diagnosis and Management by Laboratory Methods, 24th Ed.

Question 2:
In clinical hemostasis, which factor deficiency is inherited as an X-linked recessive bleeding disorder and is characterized by a prolonged activated partial thromboplastin time (aPTT) with a normal prothrombin time (PT) and normal platelet count?
A) Factor VIII deficiency (Hemophilia A)
B) Factor VII deficiency
C) Factor X deficiency
D) Factor XIII deficiency
Answer: A
Explanation: Hemophilia A is caused by congenital deficiency or dysfunction of clotting Factor VIII, encoded on the X chromosome (Xq28). Because Factor VIII functions within the intrinsic tenase complex, its deficiency prolongs the aPTT, leaving the extrinsic (PT) and common pathway tests within normal limits. Factor XIII deficiency produces normal routine PT and aPTT tests (detected via 5M urea clot solubility).
Reference: Rodak's Hematology: Clinical Principles and Applications, 6th Ed.

Question 3:
A medical technologist performs a routine peripheral blood smear review on a 30-year-old male with fever, splenomegaly, and headache returning from West Africa. Intraerythrocytic delicate ring-form trophozoites are seen, several showing double chromatin dots and multiple rings per red blood cell, with appliqué (marginal) forms present. No Schüffner dots are observed. What is the parasite?
A) Plasmodium falciparum
B) Plasmodium vivax
C) Plasmodium malariae
D) Babesia microti
Answer: A
Explanation: Plasmodium falciparum classically displays high parasitemia, delicate small ring forms, multiple rings within a single erythrocyte, double chromatin dots, and accole/appliqué forms adhering to the erythrocyte margin. The absence of enlarged host RBCs and Schüffner dots distinguishes it from P. vivax.
Reference: CDC DPDx - Laboratory Identification of Parasites of Public Health Concern.

Question 4:
Which of the following clinical findings or laboratory interferences will produce a falsely decreased glycated hemoglobin (HbA1c) measurement when assayed via high-performance liquid chromatography (HPLC)?
A) Shortened erythrocyte lifespan due to chronic hemolytic anemia or recent blood transfusion
B) Severe iron deficiency anemia
C) Asplenia or splenectomy
D) High levels of carbamylated hemoglobin in chronic uremia
Answer: A
Explanation: Glycated hemoglobin (HbA1c) reflects average plasma glucose over the ~120-day lifespan of red blood cells. Any clinical condition that shortens erythrocyte survival (such as hemolytic anemia, acute blood loss, or splenomegaly) or dilutes older cells with fresh transfused donor blood will falsely lower HbA1c values, masking hyperglycemia.
Reference: ADA Standards of Medical Care in Diabetes - Laboratory Diagnostics.

Question 5:
An unknown Gram-negative non-fermenting bacillus is isolated from the sputum of a cystic fibrosis patient. It is motile, oxidase-positive, produces a grape-like sweet odor (2-aminoacetophenone), and produces blue-green pigments (pyocyanin and pyoverdine) on Mueller-Hinton agar. What is the organism?
A) Pseudomonas aeruginosa
B) Burkholderia cepacia
C) Stenotrophomonas maltophilia
D) Acinetobacter baumannii
Answer: A
Explanation: Pseudomonas aeruginosa is a strictly aerobic, motile Gram-negative rod that is oxidase-positive and catalase-positive. The blue-green pigment pyocyanin is unique to P. aeruginosa, which along with pyoverdine produces the characteristic coloration and fruity corn-tortilla/grape aroma.
Reference: Bailey & Scott's Diagnostic Microbiology, 15th Edition.
`;

export const REPRESENTATIVE_PDF_FILES = [
  {
    id: 'pdf-chem-hema-2026',
    name: 'Clinical_Pathology_Board_Review_2026.pdf',
    size: '1.8 MB',
    pages: 12,
    category: 'Comprehensive',
    textSnippet: SAMPLE_MEDICINE_PDF_TEXT,
  },
  {
    id: 'pdf-sample-licensure',
    name: 'Laboratory_Medicine_Licensure_Exam.pdf',
    size: '420 KB',
    pages: 7,
    category: 'Diagnostic Review Sample',
    textSnippet: SAMPLE_MEDICINE_PDF_TEXT,
  },
];
