"use client";

import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Sparkles } from "lucide-react";

interface MissingInfo {
  field: string;
  question: string;
  placeholder?: string;
  type: "text" | "select" | "number";
  options?: string[];
}

type AnswerValue = {
  question: string;
  answer: string;
};

interface AIListingAssistantProps {
  initialAnalysis: {
    title: string;
    description: string;
    category: string;
    condition: string;
    suggestedPrice: number;
    missingInfo: string[];
    questions?: MissingInfo[];
  };
  onUpdate?: (updatedData: {
    title: string;
    description: string;
    category: string;
    condition: string;
    suggestedPrice: number;
  }) => void;
  onComplete: (userAnswers?: Record<string, AnswerValue>) => void;
  onSkip: () => void;
}

function normalizeField(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function questionFromText(info: string, index: number): MissingInfo | null {
  const lowerInfo = info.toLowerCase();

  if (lowerInfo.includes("owner") || lowerInfo.includes("receipt") || lowerInfo.includes("purchase_year")) {
    return null;
  }

  if (lowerInfo.includes("condition")) {
    return {
      field: "condition",
      question: info,
      placeholder: "e.g., Like new, Good, Fair",
      type: "select",
      options: ["New", "Like New", "Good", "Fair", "Poor"],
    };
  }

  if (lowerInfo.includes("price") || lowerInfo.includes("asking")) {
    return {
      field: "price",
      question: info,
      placeholder: "e.g., 45",
      type: "number",
    };
  }

  if (
    lowerInfo.includes("brand") ||
    lowerInfo.includes("model") ||
    lowerInfo.includes("device") ||
    lowerInfo.includes("control")
  ) {
    return {
      field: "identity_details",
      question: info,
      placeholder: "e.g., Roku Voice Remote Pro, Samsung TV remote",
      type: "text",
    };
  }

  if (lowerInfo.includes("storage") || lowerInfo.includes("capacity")) {
    return {
      field: "storage",
      question: info,
      placeholder: "e.g., 128GB, 256GB",
      type: "text",
    };
  }

  if (lowerInfo.includes("battery")) {
    return {
      field: "battery",
      question: info,
      placeholder: "e.g., 85%",
      type: "text",
    };
  }

  if (lowerInfo.includes("carrier") || lowerInfo.includes("unlocked")) {
    return {
      field: "carrier",
      question: info,
      placeholder: "e.g., Unlocked, Verizon",
      type: "select",
      options: ["Unlocked", "Verizon", "AT&T", "T-Mobile", "Other", "Not sure"],
    };
  }

  if (lowerInfo.includes("size")) {
    return {
      field: "size",
      question: info,
      placeholder: "e.g., Men's 10, Medium",
      type: "text",
    };
  }

  if (lowerInfo.includes("color") || lowerInfo.includes("colour")) {
    return {
      field: "color",
      question: info,
      placeholder: "e.g., Black, white, navy",
      type: "text",
    };
  }

  if (lowerInfo.includes("box") || lowerInfo.includes("packaging")) {
    return {
      field: "original_packaging",
      question: info,
      type: "select",
      options: ["Yes", "No", "Not sure"],
    };
  }

  if (lowerInfo.includes("accessories") || lowerInfo.includes("included")) {
    return {
      field: "accessories",
      question: info,
      placeholder: "e.g., charger, case, box",
      type: "text",
    };
  }

  if (lowerInfo.includes("scratches") || lowerInfo.includes("damage")) {
    return {
      field: "damage",
      question: info,
      placeholder: "e.g., no damage, minor scratches",
      type: "text",
    };
  }

  return {
    field: `detail_${index + 1}`,
    question: info,
    placeholder: "Please provide details",
    type: "text",
  };
}

function normalizeQuestions(initialAnalysis: AIListingAssistantProps["initialAnalysis"]): MissingInfo[] {
  const source =
    initialAnalysis.questions && initialAnalysis.questions.length > 0
      ? initialAnalysis.questions
      : initialAnalysis.missingInfo.map(questionFromText).filter((question): question is MissingInfo => question !== null);

  const seen = new Set<string>();
  return source
    .map((question, index) => ({
      ...question,
      field: normalizeField(question.field || `detail_${index + 1}`),
      type: question.type || "text",
    }))
    .filter((question) => {
      if (!question.field || !question.question?.trim() || seen.has(question.field)) return false;
      seen.add(question.field);
      return true;
    });
}

function shouldSkipQuestion(question: MissingInfo, answers: Record<string, AnswerValue>) {
  if (question.field !== "usage") return false;
  const condition = answers.condition?.answer?.trim().toLowerCase();
  return condition === "new";
}

export function AIListingAssistant({ initialAnalysis, onComplete, onSkip }: AIListingAssistantProps) {
  const questions = useMemo(() => normalizeQuestions(initialAnalysis), [initialAnalysis]);
  const [currentStep, setCurrentStep] = useState(0);
  const [userInputs, setUserInputs] = useState<Record<string, AnswerValue>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");

  const currentQuestion = questions[currentStep];
  const isLast = currentStep === questions.length - 1;

  const submit = (answer: string) => {
    if (!currentQuestion || !answer.trim()) return;

    const newInputs = {
      ...userInputs,
      [currentQuestion.field]: { question: currentQuestion.question, answer: answer.trim() },
    };
    setUserInputs(newInputs);

    let nextStep = currentStep + 1;
    while (nextStep < questions.length && shouldSkipQuestion(questions[nextStep], newInputs)) {
      nextStep += 1;
    }

    if (nextStep < questions.length) {
      setCurrentStep(nextStep);
      setCurrentAnswer(newInputs[questions[nextStep].field]?.answer ?? "");
      return;
    }

    onComplete(newInputs);
  };

  // Every question was filtered out: nothing to ask.
  useEffect(() => {
    if (!currentQuestion) onSkip();
  }, [currentQuestion, onSkip]);

  if (!currentQuestion) return null;

  return (
    <div className="max-w-xl">
      <p className="flex items-center gap-2 text-sm font-medium text-primary-700">
        <Sparkles strokeWidth={1.75} className="h-4 w-4" />
        A few details the photos can’t show
      </p>
      <p className="mt-1 text-sm tabular-nums text-zinc-500">
        Question {currentStep + 1} of {questions.length}
      </p>

      <div key={currentQuestion.field} className="animate-fade-in">
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-zinc-950">{currentQuestion.question}</h2>

        {currentQuestion.type === "select" && currentQuestion.options?.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => submit(option)}
                className={clsx(
                  "rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.98]",
                  currentAnswer === option
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              submit(currentAnswer);
            }}
          >
            <input
              autoFocus
              type={currentQuestion.type}
              inputMode={currentQuestion.type === "number" ? "decimal" : undefined}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder || "Type your answer"}
              aria-label={currentQuestion.question}
              className="input sm:flex-1"
            />
            <button type="submit" disabled={!currentAnswer.trim()} className="btn btn-primary">
              {isLast ? "Finish listing" : "Next"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 flex items-center gap-5 text-sm">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={() => {
              const prev = currentStep - 1;
              setCurrentStep(prev);
              setCurrentAnswer(userInputs[questions[prev].field]?.answer ?? "");
            }}
            className="font-medium text-zinc-700 hover:text-zinc-950"
          >
            Back
          </button>
        )}
        <button type="button" onClick={onSkip} className="text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline">
          Skip questions and edit the draft
        </button>
      </div>

      <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-primary-600 transition-[width] duration-300"
          style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
