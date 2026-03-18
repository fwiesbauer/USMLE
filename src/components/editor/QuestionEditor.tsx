'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { Tooltip } from '@/components/ui/Tooltip';
import type { Question, QuestionComment } from '@/types/quiz';

const ORGAN_SYSTEM_OPTIONS = [
  'Human Development',
  'Immune System',
  'Blood & Lymphoreticular System',
  'Behavioral Health',
  'Nervous System & Special Senses',
  'Skin & Subcutaneous Tissue',
  'Musculoskeletal System',
  'Cardiovascular System',
  'Respiratory System',
  'Gastrointestinal System',
  'Renal & Urinary System',
  'Pregnancy, Childbirth, the Puerperium',
  'Female & Transgender Reproductive System',
  'Breast',
  'Male & Transgender Reproductive System',
  'Endocrine System',
  'Multisystem Processes & Disorders',
  'Biostatistics, Epidemiology/Population Health, Interpretation of the Medical Literature',
  'Social Sciences',
];

const PHYSICIAN_TASK_OPTIONS = [
  'Applying Foundational Science Concepts',
  'Patient Care \u2013 Diagnosis',
  'Patient Care \u2013 Management',
  'Communication',
  'Professionalism / Legal / Ethics',
  'Systems-based Practice & Patient Safety',
  'Practice-based Learning & Improvement / Applied Biostatistics & Epidemiology',
  'Diagnosis \u2013 History & Physical',
  'Diagnosis \u2013 Laboratory/Diagnostic Studies',
  'Diagnosis \u2013 Formulating Diagnosis',
  'Diagnosis \u2013 Prognosis/Outcome',
  'Management \u2013 Health Maintenance & Disease Prevention',
  'Management \u2013 Pharmacotherapy',
  'Management \u2013 Clinical Interventions',
  'Management \u2013 Mixed Management',
];

const DISCIPLINE_OPTIONS = [
  'Medicine',
  'Surgery',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'Psychiatry',
];

const COR_LOE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'COR 1, LOE A', label: 'COR 1, LOE A' },
  { value: 'COR 1, LOE B-R', label: 'COR 1, LOE B-R' },
  { value: 'COR 1, LOE B-NR', label: 'COR 1, LOE B-NR' },
  { value: 'COR 1, LOE C-LD', label: 'COR 1, LOE C-LD' },
  { value: 'COR 1, LOE C-EO', label: 'COR 1, LOE C-EO' },
  { value: 'COR 2a, LOE A', label: 'COR 2a, LOE A' },
  { value: 'COR 2a, LOE B-R', label: 'COR 2a, LOE B-R' },
  { value: 'COR 2a, LOE B-NR', label: 'COR 2a, LOE B-NR' },
  { value: 'COR 2a, LOE C-LD', label: 'COR 2a, LOE C-LD' },
  { value: 'COR 2a, LOE C-EO', label: 'COR 2a, LOE C-EO' },
  { value: 'COR 2b, LOE A', label: 'COR 2b, LOE A' },
  { value: 'COR 2b, LOE B-R', label: 'COR 2b, LOE B-R' },
  { value: 'COR 2b, LOE B-NR', label: 'COR 2b, LOE B-NR' },
  { value: 'COR 2b, LOE C-LD', label: 'COR 2b, LOE C-LD' },
  { value: 'COR 2b, LOE C-EO', label: 'COR 2b, LOE C-EO' },
  { value: 'COR 3: No Benefit, LOE A', label: 'COR 3: No Benefit, LOE A' },
  { value: 'COR 3: No Benefit, LOE B-R', label: 'COR 3: No Benefit, LOE B-R' },
  { value: 'COR 3: No Benefit, LOE B-NR', label: 'COR 3: No Benefit, LOE B-NR' },
  { value: 'COR 3: No Benefit, LOE C-LD', label: 'COR 3: No Benefit, LOE C-LD' },
  { value: 'COR 3: No Benefit, LOE C-EO', label: 'COR 3: No Benefit, LOE C-EO' },
  { value: 'COR 3: Harm, LOE A', label: 'COR 3: Harm, LOE A' },
  { value: 'COR 3: Harm, LOE B-R', label: 'COR 3: Harm, LOE B-R' },
  { value: 'COR 3: Harm, LOE B-NR', label: 'COR 3: Harm, LOE B-NR' },
  { value: 'COR 3: Harm, LOE C-LD', label: 'COR 3: Harm, LOE C-LD' },
  { value: 'COR 3: Harm, LOE C-EO', label: 'COR 3: Harm, LOE C-EO' },
];

interface QuestionEditorProps {
  question: Question;
  onSave: (updated: Partial<Question>) => Promise<void>;
  onDelete: () => Promise<void>;
  comments?: QuestionComment[];
}

export function QuestionEditor({
  question,
  onSave,
  onDelete,
  comments = [],
}: QuestionEditorProps) {
  const [topic, setTopic] = useState(question.topic);
  const [vignette, setVignette] = useState(question.vignette);
  const [questionText, setQuestionText] = useState(question.question_text);
  const [options, setOptions] = useState(question.options);
  const [correctAnswer, setCorrectAnswer] = useState(question.correct_answer);
  const [explanation, setExplanation] = useState(question.explanation);
  const [nuggets, setNuggets] = useState(question.nuggets);
  const [section, setSection] = useState(question.section);
  const [corLoe, setCorLoe] = useState(question.cor_loe);
  const [organSystems, setOrganSystems] = useState<string[]>(question.organ_systems ?? []);
  const [physicianTasks, setPhysicianTasks] = useState<string[]>(question.physician_tasks ?? []);
  const [disciplines, setDisciplines] = useState<string[]>(question.disciplines ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        topic,
        vignette,
        question_text: questionText,
        options,
        correct_answer: correctAnswer,
        explanation,
        nuggets,
        section,
        cor_loe: corLoe,
        organ_systems: organSystems,
        physician_tasks: physicianTasks,
        disciplines,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const updateOption = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt))
    );
  };

  const addNugget = () => {
    setNuggets((prev) => [...prev, '']);
  };

  const removeNugget = (index: number) => {
    setNuggets((prev) => prev.filter((_, i) => i !== index));
  };

  const updateNugget = (index: number, value: string) => {
    setNuggets((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          Question {question.position}
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            loading={saving}
            variant="primary"
          >
            Save
          </Button>
          <Button
            onClick={handleDelete}
            loading={deleting}
            variant="danger"
          >
            Delete
          </Button>
        </div>
      </div>

      <Input
        id="topic"
        label="Topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vignette
        </label>
        <textarea
          value={vignette}
          onChange={(e) => setVignette(e.target.value)}
          rows={5}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question Text
        </label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={2}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
        />
      </div>

      {/* Options A-E */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Options
        </label>
        {options.map((option, i) => (
          <div key={option.letter} className="flex items-center gap-2">
            <input
              type="radio"
              name="correctAnswer"
              value={option.letter}
              checked={correctAnswer === option.letter}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="h-4 w-4 text-brand-mid focus:ring-brand-mid"
            />
            <span className="font-bold text-sm w-6">{option.letter}.</span>
            <input
              type="text"
              value={option.text}
              onChange={(e) => updateOption(i, e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Explanation
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={4}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
        />
      </div>

      {/* Nuggets / Pearls */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Key Pearls
        </label>
        <div className="space-y-2">
          {nuggets.map((nugget, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-gray-400">•</span>
              <input
                type="text"
                value={nugget}
                onChange={(e) => updateNugget(i, e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid"
              />
              <button
                onClick={() => removeNugget(i)}
                className="text-gray-400 hover:text-red-500 text-sm"
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
          <Button onClick={addNugget} variant="secondary" className="text-xs">
            Add Pearl
          </Button>
        </div>
      </div>

      {/* Classification Dimensions */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <p className="text-sm font-semibold text-gray-700">Classification</p>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="block text-sm font-medium text-gray-700">Organ System</label>
            <Tooltip content="The primary organ system this question tests. Choose the single best fit, or multiple if genuinely multi-system.">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help">?</span>
            </Tooltip>
          </div>
          <MultiSelect
            id="organ_systems"
            options={ORGAN_SYSTEM_OPTIONS}
            selected={organSystems}
            onChange={setOrganSystems}
            placeholder="Select organ system(s)..."
          />
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="block text-sm font-medium text-gray-700">Physician Task</label>
            <Tooltip
              content={
                <>
                  The competency this question assesses. Pick one <strong>broad task</strong> (e.g. Patient Care - Diagnosis) and optionally one <strong>finer sub-task</strong> (e.g. Diagnosis - Laboratory/Diagnostic Studies).
                </>
              }
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help">?</span>
            </Tooltip>
          </div>
          <MultiSelect
            id="physician_tasks"
            options={PHYSICIAN_TASK_OPTIONS}
            selected={physicianTasks}
            onChange={setPhysicianTasks}
            placeholder="Select physician task(s)..."
          />
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="block text-sm font-medium text-gray-700">Discipline</label>
            <Tooltip content="The medical discipline this question falls under. Choose one, or multiple if truly cross-disciplinary.">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help">?</span>
            </Tooltip>
          </div>
          <MultiSelect
            id="disciplines"
            options={DISCIPLINE_OPTIONS}
            selected={disciplines}
            onChange={setDisciplines}
            placeholder="Select discipline(s)..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="w-full">
          <div className="flex items-center gap-1 mb-1">
            <label htmlFor="section" className="block text-sm font-medium text-gray-700">
              Section
            </label>
            <Tooltip
              content="The specific section of the source document this question was derived from (e.g., &quot;Section 4.2 — Management of STEMI&quot;). Anchors the question back to its source material."
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help">
                ?
              </span>
            </Tooltip>
          </div>
          <input
            id="section"
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid text-gray-900 placeholder-gray-400"
          />
        </div>
        <div className="w-full">
          <div className="flex items-center gap-1 mb-1">
            <label htmlFor="cor_loe" className="block text-sm font-medium text-gray-700">
              COR / LOE
            </label>
            <Tooltip
              content={
                <>
                  <strong>Class of Recommendation (COR)</strong> — How strongly a treatment is recommended.
                  <br />1 = Strong, 2a = Moderate, 2b = Weak, 3 = No Benefit or Harm.
                  <br /><br />
                  <strong>Level of Evidence (LOE)</strong> — Quality of supporting evidence.
                  <br />A = High-quality RCTs, B-R = Randomized, B-NR = Non-randomized, C-LD = Limited data, C-EO = Expert opinion.
                  <br /><br />
                  Only relevant when the source PDF is a clinical guideline.
                </>
              }
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help">
                ?
              </span>
            </Tooltip>
          </div>
          <select
            id="cor_loe"
            value={COR_LOE_OPTIONS.some((o) => o.value === corLoe) ? corLoe : '__custom__'}
            onChange={(e) => {
              if (e.target.value !== '__custom__') {
                setCorLoe(e.target.value);
              }
            }}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid text-gray-900 bg-white"
          >
            {COR_LOE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {corLoe && !COR_LOE_OPTIONS.some((o) => o.value === corLoe) && (
              <option value="__custom__">{corLoe} (custom)</option>
            )}
          </select>
        </div>
      </div>

      {/* Student Comments */}
      {comments.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Student Comments ({comments.length})
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    {c.commenter_name || 'Anonymous'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{c.comment_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
