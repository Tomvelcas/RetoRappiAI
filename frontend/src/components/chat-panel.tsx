"use client";

import { useState } from "react";

import { queryChat } from "@/lib/api";

const suggestedPrompts = [
  "Which trend should an operator investigate first?",
  "Summarize the main availability signal in plain English.",
];

export function ChatPanel() {
  const [question, setQuestion] = useState(suggestedPrompts[0]);
  const [answer, setAnswer] = useState<string>(
    "Ask a question to exercise the mocked grounded response endpoint."
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await queryChat(question);
      setAnswer(response.answer);
    } catch {
      setAnswer("The backend is not reachable yet. Start the API to test the chat contract.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Chat Placeholder
          </p>
          <h2
            className="mt-2 text-2xl font-semibold"
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
          >
            Grounded assistant panel
          </h2>
        </div>
        <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)]">
          Mocked
        </span>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[color:var(--muted)]">
            Prompt
          </span>
          <textarea
            className="min-h-28 w-full rounded-3xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-teal-500"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              className="rounded-full border border-[color:var(--border)] bg-white px-3 py-2 text-xs font-medium text-[color:var(--muted)] transition hover:border-teal-400 hover:text-teal-700"
              onClick={() => setQuestion(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>

        <button
          className="inline-flex items-center rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Querying..." : "Send to backend"}
        </button>
      </form>

      <div className="mt-6 rounded-3xl border border-[color:var(--border)] bg-white/80 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Response
        </p>
        <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]">{answer}</p>
      </div>
    </section>
  );
}
