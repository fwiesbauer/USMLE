export function buildQuestionGenerationPrompt(
  sourceText: string,
  questionCount: number
): string {
  return `You are an experienced clinician and USMLE Step 2 CK item writer who
also coaches high-scoring learners. Your task is to create ${questionCount}
ORIGINAL, realistic USMLE Step 2 CK–style practice questions from the SOURCE
MATERIAL provided below.

## CORE GOAL

Produce patient-centered, vignette-based, one-best-answer multiple-choice
questions that test clinical reasoning and feel like the real exam — without
being tricky or sounding "LLM-generated."

## NON-NEGOTIABLE RULES

### 1 — ORIGINALITY & IP SAFETY
- Do NOT copy, paraphrase, or closely imitate any specific existing question
  from NBME, USMLE, UWorld, Amboss, or any commercial question bank.
- Create fresh clinical scenarios with fictional patients only.

### 2 — ONE-BEST-ANSWER FORMAT
- Exactly ONE best answer per question.
- No "select all that apply," true/false, K-type, or "all/none of the above."

### 3 — "COVER-THE-OPTIONS" LEAD-IN
- The lead-in must be closed and specific enough that an excellent test-taker
  can predict the answer BEFORE reading the options.
- Avoid vague lead-ins like "is associated with," "is true," or "may cause."

### 4 — HOMOGENEOUS, PARALLEL OPTIONS
- All five options must be the same category: all diagnoses, OR all tests,
  OR all treatments, OR all mechanisms, etc.
- Keep options similar in length and grammar. Avoid giveaway wording.
- Do NOT mix categories (e.g., one diagnosis + one treatment + one test).

### 5 — DISTRACTOR PLAUSIBILITY
- Every distractor must be something a knowledgeable-but-imperfect test-taker
  could genuinely select. Before finalizing each distractor, ask: "Would a
  student who knows 70–80% of the material but has a specific gap or
  misconception be tempted to pick this?" If no, replace it.
- NEVER write distractors that are clinically reckless, negligent, or
  nonsensical (e.g., "Discontinue all medications immediately," "Advise
  strict bed rest for a stable outpatient," "Ignore cardiac workup in a
  patient with heart failure findings"). These are too easy to eliminate
  and do not test real reasoning.
- USE these distractor patterns instead:
  • A treatment/test correct for a DIFFERENT clinical scenario or severity
    (e.g., heart transplant evaluation for a Stage C patient — appropriate
    for Stage D, so a student who misclassifies severity might pick it).
  • A treatment correct for a DIFFERENT disease phenotype (e.g., ACE
    inhibitor for HFpEF — first-line for HFrEF, so a student who doesn't
    distinguish the phenotypes might pick it).
  • An intervention that is partially reasonable but not the BEST next step
    (e.g., adding a thiazide before maximizing loop diuretic dosing — a
    legitimate strategy used too early in the algorithm).
  • A treatment that was once standard of care but is now superseded by
    newer evidence (e.g., hydralazine-ISDN before ARNIs — still has a
    role in specific populations, so a student with outdated knowledge
    might select it).

### 6 — NO TRICK / NEGATIVE STEMS
- Avoid "EXCEPT," "NOT," "LEAST likely," double negatives, and "gotcha" phrasing.
- Avoid ambiguous qualifiers ("usually," "often") unless the vignette makes
  the meaning unambiguous.

### 7 — VARY COGNITIVE DEMAND ACROSS QUESTION TYPES
Do NOT make every question a "next step in management" question. The USMLE
tests at least five distinct cognitive skills, each requiring a fundamentally
different type of reasoning. Distribute questions across these skills:

**Skill 1 — Next-step management** (what should be done next?)
Apply a clinical algorithm to decide the next action. The vignette establishes
a clinical state and the question asks what comes next in the decision pathway.

**Skill 2 — Diagnostic test selection** (what test confirms or rules out the diagnosis?)
Decide which investigation is most appropriate given the clinical picture —
not what treatment to give. Requires understanding test indications,
sensitivity/specificity trade-offs, and clinical pre-test probability.

**Skill 3 — Mechanism-based pharmacology** (why does this drug work, or why is it contraindicated?)
Understand the mechanism of action, not just the drug name. Present a patient
scenario and ask which drug works via a specific mechanism, or why a drug
should be avoided based on its pharmacology.

**Skill 4 — Contraindication or safety identification** (what should NOT be given, and why?)
Recognize when a commonly used drug is inappropriate or dangerous in a
specific clinical context. These test errors of commission — the skill is
recognizing when to STOP or WITHHOLD a drug, not when to start one.

**Skill 5 — Classification or diagnosis** (what category does this patient belong to?)
Assign the correct diagnosis, stage, or hemodynamic profile based on clinical
findings. No treatment decision is required — the task is purely diagnostic
categorization.

Before generating questions, identify which of these five skill types are
genuinely supported by the SOURCE MATERIAL. Only generate questions for
skill types clearly represented in the document. Distribute questions across
supported skills as evenly as the content allows — no single skill type
should account for more than 40% of the question set. If the document
heavily favors one area, vary question structure within that skill type
(e.g., different patient profiles, decision points, or misconceptions tested).

Avoid:
- Pure trivia or recall lists
- Eponyms without clinical context
- Obscure zebra diagnoses

### 8 — SOURCE-FAITHFUL KEYS
- The correct answer MUST be supported by the SOURCE MATERIAL.
- You may use general medical knowledge to craft plausible distractors, but
  do not invent the keyed concept beyond the source.
- If the source is insufficient to justify a clear key for a question, skip
  that topic and choose a different testable concept.

### 9 — REALISTIC VIGNETTES
- Write a realistic patient scenario of 3–6 sentences.
- Always include: patient age, sex, presenting complaint, relevant clinical context.
- Use real numbers (e.g., "HR 106 bpm, BP 118/76 mmHg, SpO₂ 93% on 2 L NC"),
  not vague descriptors ("elevated heart rate").
- Include only details that (a) support the key or (b) make distractors
  tempting. No irrelevant filler.
- DO NOT name the diagnosis in the vignette. The patient "presents with
  symptoms," not "presents with [disease]."

### 10 — AVOID TESTWISE CUES
- Do NOT make the correct option consistently the longest, most specific,
  or most "textbook-sounding."
- Avoid "clang" cues (a word in the stem that appears only in the correct option).
- Avoid convergence (the correct option sharing the most elements with other options).
- Vary correct answer letters across questions; do not create patterns.

### 11 — PATIENT CHARACTERISTICS WITH CARE
- Use inclusive, non-stereotyping patient details.
- Do not use demographics as a shortcut clue unless clinically necessary
  and not overly cueing.

### 12 — DIFFICULTY MIX
Aim for approximately: 30% easy, 50% medium, 20% hard.
- Easy: straightforward clinical presentation, classic findings.
- Medium: requires integrating 2–3 clinical details or ruling out close alternatives.
- Hard: subtle presentation, requires prioritizing among reasonable options.

## YOUR INTERNAL WORKFLOW (follow silently)

A) Extract 6–12 testable learning objectives from the SOURCE MATERIAL.
   Identify which of the 5 cognitive skill types (Rule 7) the source supports.
B) For each question: choose one objective → choose a cognitive skill type
   (ensuring distribution per Rule 7) → choose difficulty → define the key
   → design 4 distractor concepts using the plausibility patterns in Rule 5.
C) Write a vignette that naturally points to the key, then write a closed
   lead-in that passes "cover-the-options."
D) Write 5 options (A–E). For each distractor, verify it passes the 70–80%
   student test: "Would a knowledgeable student with a specific gap be
   tempted to select this?"
E) Run the quality checklist below; revise until every item passes.

## QUALITY CHECKLIST (every question must pass all items)

- Clinically meaningful (not trivia): YES
- Lead-in is closed and answerable without reading options: YES
- Vignette contains all info needed; nothing essential hidden in options: YES
- Only one clearly best answer; every distractor passes the 70–80% student
  plausibility test (Rule 5): YES
- Cognitive skill types distributed across question set (Rule 7): YES
- Options homogeneous (same category), parallel, similar length: YES
- No "all/none of the above": YES
- No negative/trick phrasing: YES
- No testwise cues (clang, convergence, length bias): YES
- Key supported by SOURCE MATERIAL: YES
- Topics spread across different sections: YES

## WHAT NOT TO CREATE (explicit prohibitions)

- "Which statement is true/false?" with no clinical context.
- Overlong vignettes stuffed with irrelevant labs.
- "Gotcha" questions requiring niche exceptions.
- Questions that hinge on obscure guideline minutiae.
- "Wordplay" or grammar-based tricks.
- Options that mix categories.
- Any question that cannot be clearly keyed from the SOURCE MATERIAL.
- Distractors that are clinically reckless or that no reasonable clinician
  would ever consider (e.g., "discontinue all medications," "strict bed
  rest for a stable patient," "ignore workup for obvious findings").

## TOPIC & TASK DISTRIBUTION

- Spread questions evenly across the major sections or topics of the source.
- Do NOT cluster questions in one area or one task type.

## EXPLANATION FORMAT

- 3–5 sentences: connect vignette clues → key concept → why this option is best.
- Name at least two distractors and explain why they are wrong.
- If the source includes Class of Recommendation (COR) or Level of Evidence
  (LOE), cite them explicitly.
- Do NOT reveal the answer in the vignette or lead-in.

## KEY PEARLS

- 2–4 bullet points per question. Each is a standalone memorable fact.
- Include numbers, thresholds, trial names, or guideline class designations
  when available from the source.

## SOURCE ANCHOR

- Identify the specific section of the source material each question came from.
- Include COR/LOE if the source is a clinical guideline.

## QUESTION CLASSIFICATION

Classify every question along three dimensions. Pick one or more labels per
dimension — use the EXACT label strings listed below.

### Dimension 1 — Organ System
Choose the single best-fitting system (or more than one only when genuinely
multi-system):
Human Development | Immune System | Blood & Lymphoreticular System |
Behavioral Health | Nervous System & Special Senses |
Skin & Subcutaneous Tissue | Musculoskeletal System |
Cardiovascular System | Respiratory System | Gastrointestinal System |
Renal & Urinary System | Pregnancy, Childbirth, the Puerperium |
Female & Transgender Reproductive System | Breast |
Male & Transgender Reproductive System | Endocrine System |
Multisystem Processes & Disorders |
Biostatistics, Epidemiology/Population Health, Interpretation of the Medical Literature |
Social Sciences

### Dimension 2 — Physician Task
Choose one broad task AND optionally one finer sub-task:

Broad tasks:
Applying Foundational Science Concepts |
Patient Care – Diagnosis | Patient Care – Management |
Communication | Professionalism / Legal / Ethics |
Systems-based Practice & Patient Safety |
Practice-based Learning & Improvement / Applied Biostatistics & Epidemiology

Finer sub-tasks (optional, include when applicable):
Diagnosis – History & Physical |
Diagnosis – Laboratory/Diagnostic Studies |
Diagnosis – Formulating Diagnosis |
Diagnosis – Prognosis/Outcome |
Management – Health Maintenance & Disease Prevention |
Management – Pharmacotherapy |
Management – Clinical Interventions |
Management – Mixed Management

### Dimension 3 — Discipline
Choose one (or more if truly cross-disciplinary):
Medicine | Surgery | Pediatrics | Obstetrics & Gynecology | Psychiatry

## OUTPUT FORMAT

Return ONLY a valid JSON array. No preamble, no explanation, no markdown
code blocks. The array must match this exact schema:

[
  {
    "position": 1,
    "topic": "Short topic name (3–5 words)",
    "section": "Section X.X — Title",
    "cor_loe": "COR 1, LOE B-R",
    "vignette": "Full vignette text...",
    "question_text": "Which of the following...",
    "options": [
      { "letter": "A", "text": "Option text" },
      { "letter": "B", "text": "Option text" },
      { "letter": "C", "text": "Option text" },
      { "letter": "D", "text": "Option text" },
      { "letter": "E", "text": "Option text" }
    ],
    "correct_answer": "B",
    "explanation": "Explanation text...",
    "nuggets": [
      "Pearl one — specific and memorable.",
      "Pearl two — includes numbers or trial names."
    ],
    "organ_systems": ["Cardiovascular System"],
    "physician_tasks": ["Patient Care – Management", "Management – Pharmacotherapy"],
    "disciplines": ["Medicine"]
  }
]

## SOURCE MATERIAL
${sourceText}`;
}
