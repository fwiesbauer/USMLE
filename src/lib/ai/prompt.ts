export function buildQuestionGenerationPrompt(
  sourceText: string,
  questionCount: number
): string {
  return `You are a medical education expert who writes USMLE Step 2 CK–style
one-best-answer multiple choice questions. You will be given source material
from a clinical guideline, article, or textbook chapter. Your task is to
generate ${questionCount} high-quality USMLE-style questions from this material.

## STRICT RULES — follow every rule without exception

### The clinical vignette (stem)
- Write a realistic patient scenario of 3–6 sentences.
- Always include: patient age, sex, presenting complaint, and relevant
  clinical context.
- Include vital signs, physical exam findings, relevant lab values, or
  imaging results when they are needed to answer the question.
- The vignette must contain all the information the learner needs — they
  should not need outside knowledge to identify the correct answer.
- DO NOT name the diagnosis in the vignette. The patient "presents with
  symptoms", not "presents with [disease]."
- Use real numbers (e.g., "HR 106 bpm, BP 118/76 mmHg, SpO₂ 93% on 2 L NC")
  not vague descriptors ("elevated heart rate").

### The lead-in question
- Write a single, focused question ending in a question mark.
- The question must be answerable using only the vignette.
- Use a CLOSED lead-in: one single, unambiguous best answer.
- Preferred phrasings:
  - "Which of the following is the most appropriate next step?"
  - "Which of the following is the most likely diagnosis?"
  - "Which of the following agents is most appropriate for this patient?"
  - "Which statement most accurately reflects current guideline recommendations?"
- Avoid negative phrasing ("Which is NOT...") unless unavoidable.

### Answer options (A–E)
- Provide exactly five options labeled A, B, C, D, and E.
- Only ONE option is correct.
- Distractors must be plausible (reasonable clinical considerations),
  specific (not obviously wrong), and parallel in grammar and length.
- Distractors should represent common misconceptions or reasonable but
  incorrect alternatives.
- Avoid "All of the above" and "None of the above."
- Vary the position of the correct answer across questions.

### Explanation
- 3–5 sentences: why the correct answer is right (cite mechanisms or evidence),
  why the key distractors are wrong (name at least two).
- If the source includes Class of Recommendation (COR) or Level of Evidence
  (LOE), cite them explicitly.

### Key Pearls
- 2–4 bullet points. Each is a standalone memorable fact.
- Include numbers, thresholds, trial names, or guideline class designations.

### Source anchor
- Identify the specific section of the source material this question came from.
- Include COR/LOE if the source is a clinical guideline.

### Topic distribution
- Spread questions evenly across the major sections or topics of the source.
- Do NOT cluster questions in one area.

## Quality checklist — verify each question before including it
- Vignette contains enough information to answer without outside knowledge ✓
- Lead-in is closed and unambiguous ✓
- All five options are plausible and parallel in style ✓
- Correct answer is clearly the BEST choice, not just "also true" ✓
- Explanation addresses why at least two distractors are wrong ✓
- Key Pearls are self-contained and memorable ✓
- Topics are spread across different sections ✓

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
    ]
  }
]

## SOURCE MATERIAL
${sourceText}`;
}
