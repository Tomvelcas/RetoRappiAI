"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import type { DayBriefing } from "@/lib/api";
import { queryChat } from "@/lib/api";
import { briefingQuestion, coverageChip, modeLabel } from "@/lib/format";

type ChatPanelProps = {
  briefing: DayBriefing;
};

export function ChatPanel({ briefing }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meta, setMeta] = useState<{
    mode: string;
    warnings: string[];
  } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setDraft(briefingQuestion(briefing));
    setAnswer("");
    setMeta(null);
  }, [briefing]);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await queryChat({ question: trimmed });

      startTransition(() => {
        setDraft(trimmed);
        setAnswer(response.answer);
        setMeta({
          mode: modeLabel(response.answer_mode),
          warnings: response.warnings,
        });
      });
    } catch {
      startTransition(() => {
        setAnswer("The quick copilot could not reach the backend.");
        setMeta({
          mode: "offline",
          warnings: [],
        });
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Ask this day</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[color:var(--text-soft)]">
            Keep the question tight and the answer will stay grounded.
          </p>
        </div>
        <Link
          className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
          href={`/chat?question=${encodeURIComponent(draft || briefingQuestion(briefing))}`}
        >
          open copilot
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[briefingQuestion(briefing), ...briefing.suggested_questions.slice(0, 2)].map((prompt) => (
          <button
            key={prompt}
            className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:rgba(90,214,195,0.35)] hover:text-[color:var(--text-strong)]"
            onClick={() => {
              setDraft(prompt);
              void sendQuestion(prompt);
            }}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <textarea
          className="glass-scroll min-h-28 w-full rounded-[26px] border border-[color:var(--border)] bg-[color:rgba(5,10,18,0.68)] px-4 py-3 text-sm leading-6 text-[color:var(--text-strong)] outline-none transition placeholder:text-[color:var(--text-dim)] focus:border-[color:rgba(90,214,195,0.35)]"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about this day"
          value={draft}
        />
      </label>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          className="rounded-full bg-[color:var(--text-strong)] px-4 py-3 text-sm font-medium text-[color:var(--signal-ink)] transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isSubmitting || !draft.trim()}
          onClick={() => void sendQuestion(draft)}
          type="button"
        >
          {isSubmitting ? "thinking…" : "ask"}
        </button>

        {meta ? (
          <span className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)]">
            {meta.mode}
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.02)] p-4">
        {answer ? (
          <>
            <p className="text-sm leading-7 text-[color:var(--text-strong)]">{answer}</p>
            {meta?.warnings.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {meta.warnings.map((warning) => (
                  <span
                    key={warning}
                    className={`rounded-full border px-3 py-1 text-[11px] ${coverageChip(briefing.coverage_flag)}`}
                  >
                    {warning}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm leading-6 text-[color:var(--text-soft)]">
            Ask for a quick read, a comparison, or a plain-language summary.
          </p>
        )}
      </div>
    </div>
  );
}
