import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'public/brand/screenshots');

const sampleQuestions = [
  {
    id: "bm-1",
    code: "MCQ-MIC-001",
    question: "Which test differentiates Staphylococcus aureus from other catalase-positive Gram-positive cocci?",
    options: [
      { id: "A", text: "Coagulase test" },
      { id: "B", text: "Bacitracin susceptibility" },
      { id: "C", text: "Optochin susceptibility" },
      { id: "D", text: "Bile esculin hydrolysis" }
    ],
    subject: "Microbiology",
    unit: "Diagnostic Bacteriology",
    topic: "Gram-Positive Cocci Identification",
    difficulty: "Medium",
    status: "Published",
    examCategories: ["ASCP", "NHPC", "PSC"],
    explanation: "Staphylococcus aureus produces coagulase (both bound clumping factor and free extracellular staphylocoagulase), converting fibrinogen to fibrin and distinguishing it from coagulase-negative staphylococci (CoNS).",
    reference: "Bailey & Scott's Diagnostic Microbiology, 15th Edition."
  },
  {
    id: "bm-2",
    code: "MCQ-HEM-002",
    question: "Which laboratory finding distinguishes true antibody-mediated red cell agglutination from rouleaux formation?",
    options: [
      { id: "A", text: "Dispersion after saline replacement" },
      { id: "B", text: "Microscopic stacking like coins" },
      { id: "C", text: "Persists after saline replacement" },
      { id: "D", text: "Direct antiglobulin test negativity" }
    ],
    subject: "Immunohematology",
    unit: "Blood Banking Principles",
    topic: "Agglutination vs Pseudoagglutination",
    difficulty: "Medium",
    status: "Published",
    examCategories: ["ASCP", "NHPC"],
    explanation: "Rouleaux formation is caused by high plasma protein levels (e.g. multiple myeloma) reducing the zeta potential, which disperses when red cells are washed or diluted with saline. True antigen-antibody agglutination lattice bonds are unaffected by saline replacement.",
    reference: "Technical Manual of the AABB, 20th Edition."
  },
  {
    id: "rev-1",
    code: "MCQ-BIO-003",
    question: "A 42-year-old female presents with obstructive jaundice. Total bilirubin is 8.4 mg/dL, direct bilirubin is 6.9 mg/dL, alkaline phosphatase is 420 U/L, and urine urobilinogen is absent. Which condition is most probable?",
    options: [
      { id: "A", text: "Extrahepatic biliary tract obstruction" },
      { id: "B", text: "Acute intravascular hemolytic anemia" },
      { id: "C", text: "Gilbert syndrome" },
      { id: "D", text: "Crigler-Najjar syndrome Type I" }
    ],
    subject: "Clinical Biochemistry",
    unit: "Hepatic Function & Clinical Enzymology",
    topic: "Bilirubin Metabolism & Jaundice",
    difficulty: "Hard",
    status: "Published",
    examCategories: ["ASCP", "NHPC", "PSC", "CEE-UG"],
    explanation: "Marked elevation of direct (conjugated) bilirubin and alkaline phosphatase with minimal transaminase elevation indicates post-hepatic obstruction (cholestasis). Complete biliary obstruction prevents bilirubin from entering the bowel, resulting in absent urine urobilinogen.",
    reference: "Henry's Clinical Diagnosis and Management by Laboratory Methods, 24th Ed."
  },
  {
    id: "rev-2",
    code: "MCQ-HEM-004",
    question: "Which coagulation factor deficiency is inherited as an X-linked recessive disorder and manifests with prolonged aPTT and normal PT?",
    options: [
      { id: "A", text: "Factor VIII deficiency (Hemophilia A)" },
      { id: "B", text: "Factor VII deficiency" },
      { id: "C", text: "Factor X deficiency" },
      { id: "D", text: "Factor XIII deficiency" }
    ],
    subject: "Clinical Hematology",
    unit: "Hemostasis & Coagulation Pathways",
    topic: "Intrinsic Pathway Coagulopathies",
    difficulty: "Medium",
    status: "Published",
    examCategories: ["ASCP", "NHPC", "PSC"],
    explanation: "Factor VIII is an essential cofactor in the intrinsic tenase complex. Its deficiency prolongs the intrinsic pathway screening test (aPTT) while the extrinsic (PT) and common pathways remain unaffected.",
    reference: "Rodak's Hematology: Clinical Principles and Applications, 6th Ed."
  }
];

const throwawayStats = {
  totalQuestionsAttempted: 184,
  correctAnswersCount: 149,
  streakDays: 8,
  lastStudyDate: new Date().toISOString().split('T')[0],
  examRecords: [
    {
      examId: "mock-ascp-1",
      title: "ASCP Licensure Practice Paper 1",
      examType: "ASCP",
      score: 82,
      totalQuestions: 100,
      passingPercentage: 70,
      passed: true,
      completedAt: new Date(Date.now() - 86400000).toISOString(),
      pacing: {
        totalSeconds: 3840,
        averageSecondsPerQuestion: 38,
        fastestSeconds: 14,
        slowestSeconds: 76,
        label: "Paced for Licensure"
      }
    }
  ],
  subjectPerformance: {
    "Clinical Biochemistry": { attempted: 55, correct: 46, accuracy: 84 },
    "Microbiology": { attempted: 45, correct: 35, accuracy: 78 },
    "Clinical Hematology": { attempted: 50, correct: 44, accuracy: 88 },
    "Immunohematology": { attempted: 34, correct: 24, accuracy: 71 }
  },
  bookmarkedIds: ["bm-1", "bm-2"],
  bookmarkMeta: {
    "bm-1": {
      bookmarkedAt: new Date(Date.now() - 172800000).toISOString(),
      note: "Bound coagulase (slide) vs free coagulase (tube test)."
    },
    "bm-2": {
      bookmarkedAt: new Date(Date.now() - 86400000).toISOString(),
      note: "Saline replacement test: rouleaux disperses, agglutination persists."
    }
  },
  revisionQueueIds: ["rev-1", "rev-2"],
  mistakeStreaks: {
    "rev-1": 1,
    "rev-2": 0
  }
};

const throwawayUser = {
  id: "usr-demo",
  username: "candidate_demo",
  email: "candidate@prayogshala.test",
  role: "student",
  displayName: "Candidate Learner",
  emailVerified: true
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('[Capture] Ensuring screenshot destination directory exists...');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('[Capture] Starting Vite preview server on port 4173...');
  const previewProc = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    cwd: rootDir,
    stdio: 'ignore',
  });

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const tmpProfile = `/tmp/chrome_ss_profile_${Date.now()}`;
  console.log('[Capture] Launching Headless Chrome on port 9333...');
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9333',
    '--window-size=1280,800',
    '--disable-gpu',
    `--user-data-dir=${tmpProfile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  // Poll until Chrome responds
  let pageTarget = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://127.0.0.1:9333/json/list');
      const list = await res.json();
      pageTarget = list.find((t) => t.type === 'page');
      if (pageTarget) break;
    } catch {}
  }

  if (!pageTarget) {
    throw new Error('Failed to find Chrome page target');
  }

  console.log('[Capture] Connected to Chrome page at:', pageTarget.webSocketDebuggerUrl);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let msgId = 0;
  const pendingPromises = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingPromises.has(data.id)) {
      const { resolve, reject } = pendingPromises.get(data.id);
      pendingPromises.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise((resolve) => ws.onopen = resolve);

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      pendingPromises.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const targets = [
    { name: 'practice', path: '/practice' },
    { name: 'analytics', path: '/dashboard' },
    { name: 'mistakes', path: '/mistakes' },
    { name: 'exams', path: '/exam' },
    { name: 'bookmarks', path: '/bookmarks' },
  ];

  try {
    for (const theme of ['light', 'dark']) {
      console.log(`\n--- Capturing theme: ${theme} ---`);

      // Seed localStorage at root URL
      await sendCommand('Page.navigate', { url: `http://localhost:4173/?theme=${theme}` });
      await sleep(1500);

      const setupScript = `
        try {
          localStorage.setItem('prayogshala_theme_v1', '${theme}');
          localStorage.setItem('prayogshala_current_user_v1', JSON.stringify(${JSON.stringify(throwawayUser)}));
          localStorage.setItem('prayogshala_stats_v2', JSON.stringify(${JSON.stringify(throwawayStats)}));
          localStorage.setItem('prayogshala_questions_v2', JSON.stringify(${JSON.stringify(sampleQuestions)}));
          document.documentElement.classList.toggle('dark', '${theme}' === 'dark');
        } catch (e) {}
      `;
      await sendCommand('Runtime.evaluate', { expression: setupScript });

      for (const target of targets) {
        console.log(`Capturing ${target.name} (${theme})...`);
        await sendCommand('Page.navigate', { url: `http://localhost:4173${target.path}?theme=${theme}` });
        await sleep(2000);

        // Ensure theme class and suppress any animations
        await sendCommand('Runtime.evaluate', {
          expression: `
            document.documentElement.classList.toggle('dark', '${theme}' === 'dark');
          `,
        });
        await sleep(500);

        const screenshot = await sendCommand('Page.captureScreenshot', {
          format: 'png',
          clip: { x: 0, y: 0, width: 1280, height: 800, scale: 1 },
        });

        const rawPngPath = `/tmp/${target.name}-${theme}.png`;
        fs.writeFileSync(rawPngPath, Buffer.from(screenshot.data, 'base64'));

        const webpPath = path.join(outDir, `${target.name}-${theme}.webp`);
        await new Promise((resolve, reject) => {
          const conv = spawn('cwebp', ['-q', '85', '-resize', '1280', '800', rawPngPath, '-o', webpPath]);
          conv.on('close', (code) => code === 0 ? resolve() : reject(new Error(`cwebp exited with ${code}`)));
        });

        const stat = fs.statSync(webpPath);
        const kbSize = (stat.size / 1024).toFixed(1);
        console.log(`  -> Saved ${target.name}-${theme}.webp (${kbSize} KB)`);
        fs.unlinkSync(rawPngPath);
      }
    }

    ws.close();
    console.log('\n[Capture] All 10 screenshots generated successfully!');
  } finally {
    try { chromeProc.kill(); } catch {}
    try { previewProc.kill(); } catch {}
    try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch {}
  }
}

run().catch((err) => {
  console.error('[Capture Error]', err);
  process.exit(1);
});
