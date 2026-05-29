"use client";

import React, { useMemo, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import Select from "./Select";

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

export function AIListingAssistant({ initialAnalysis, onComplete }: AIListingAssistantProps) {
  const questions = useMemo(() => normalizeQuestions(initialAnalysis), [initialAnalysis]);
  const [currentStep, setCurrentStep] = useState(0);
  const [userInputs, setUserInputs] = useState<Record<string, AnswerValue>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentStep];

  const complete = (answers: Record<string, AnswerValue>) => {
    setIsComplete(true);
    onComplete(answers);
  };

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !currentAnswer.trim()) return;

    const newInputs = {
      ...userInputs,
      [currentQuestion.field]: {
        question: currentQuestion.question,
        answer: currentAnswer.trim(),
      },
    };
    setUserInputs(newInputs);

    let nextStep = currentStep + 1;
    while (nextStep < questions.length && shouldSkipQuestion(questions[nextStep], newInputs)) {
      nextStep += 1;
    }

    if (nextStep < questions.length) {
      setCurrentStep(nextStep);
      setCurrentAnswer("");
      return;
    }

    complete(newInputs);
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-lg p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-blue-400" />
          <p className="text-zinc-100">No follow-up questions are needed.</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6 text-center shadow-lg">
        <Loader2 className="w-12 h-12 text-blue-300 mx-auto mb-4 animate-spin" />
        <h3 className="text-xl font-semibold text-zinc-100 mb-2">Generating Final Listing</h3>
        <p className="text-zinc-300">
          AI is combining your answers with the uploaded photos. The listing is not ready yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-lg p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl sm:text-2xl font-semibold text-zinc-100">AI Listing Assistant</h3>
        <div className="ml-auto text-sm text-zinc-400">
          Step {currentStep + 1} of {questions.length}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-lg font-medium text-zinc-100 mb-4">{currentQuestion.question}</h4>

        {currentQuestion.type === "select" ? (
          <Select
            value={currentAnswer || null}
            onChange={(value) => setCurrentAnswer(value)}
            options={[
              { value: "", label: "Select an option..." },
              ...(currentQuestion.options?.map((option) => ({ value: option, label: option })) || []),
            ]}
            placeholder="Select an option..."
          />
        ) : (
          <input
            type={currentQuestion.type}
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder={currentQuestion.placeholder || "Please provide details"}
            className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitAnswer();
            }}
          />
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-zinc-400">
          {currentStep > 0 && (
            <button
              onClick={() => {
                setCurrentStep((prev) => prev - 1);
                setCurrentAnswer("");
              }}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              Previous
            </button>
          )}
        </div>

        <button
          onClick={handleSubmitAnswer}
          disabled={!currentAnswer.trim()}
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors disabled:opacity-60 disabled:cursor-not-allowed gap-2"
        >
          <Send className="w-4 h-4" />
          {currentStep === questions.length - 1 ? "Generate Listing" : "Next"}
        </button>
      </div>

      <div className="mt-6">
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
