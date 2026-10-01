"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Dict, Locale } from "@/content/dictionaries";
import { site } from "@/content/site";
import type { UiAction } from "@/features/concierge/tools";

type ErrorCode = "unavailable" | "rate_limited" | "refused";
type Message = { role: "user" | "assistant"; text: string; actions: UiAction[]; error?: ErrorCode };
type Chat = { id: string; messages: Message[] };

const STORAGE_KEY = "trysa-concierge";

/** The chat survives page navigation within the tab; storage may be unavailable. */
function loadChat(): Chat | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Chat) : null;
  } catch {
    return null;
  }
}

function saveChat(chat: Chat) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chat));
  } catch {
    /* private mode or storage full: the chat just won't survive a reload */
  }
}

const newChat = (): Chat => ({ id: crypto.randomUUID(), messages: [] });

/** Links come from our server, but only ever render site paths and WhatsApp. */
function safeHref(action: UiAction): string | null {
  const { href } = action;
  if (action.type === "booking" && href.startsWith("/") && !href.startsWith("//")) return href;
  if (action.type === "whatsapp" && href.startsWith("https://wa.me/")) return href;
  return null;
}

export default function ConciergePanel({
  labels,
  lang,
  onClose,
}: {
  labels: Dict["concierge"];
  lang: Locale;
  onClose: () => void;
}) {
  const [chat, setChat] = useState<Chat>(() => loadChat() ?? newChat());
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  useEffect(() => saveChat(chat), [chat]);
  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [chat]);

  /** Escape closes; Tab stays inside the dialog. */
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") return onClose();
    if (event.key !== "Tab" || !dialog.current) return;
    const focusable = dialog.current.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), textarea:not([disabled])",
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function updateReply(update: (reply: Message) => Message) {
    setChat((c) => ({ ...c, messages: [...c.messages.slice(0, -1), update(c.messages.at(-1)!)] }));
  }

  async function send(text: string) {
    const question = text.trim().slice(0, 1000);
    if (!question || busy) return;
    const history = [...chat.messages, { role: "user" as const, text: question, actions: [] }];
    setChat((c) => ({
      ...c,
      messages: [...history, { role: "assistant", text: "", actions: [] }],
    }));
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: chat.id,
          locale: lang,
          // Failed replies have no text and aren't part of the conversation.
          messages: history.filter((m) => m.text).map(({ role, text }) => ({ role, text })),
        }),
      });
      if (!response.ok || !response.body) {
        updateReply((r) => ({
          ...r,
          error: response.status === 429 ? "rate_limited" : "unavailable",
        }));
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === "text") updateReply((r) => ({ ...r, text: r.text + event.text }));
          if (event.type === "action")
            updateReply((r) => ({ ...r, actions: [...r.actions, event.action] }));
          if (event.type === "error") updateReply((r) => ({ ...r, error: event.code }));
        }
      }
    } catch {
      updateReply((r) => ({ ...r, error: "unavailable" }));
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  const errorText: Record<ErrorCode, string> = {
    unavailable: labels.errorUnavailable,
    rate_limited: labels.errorRateLimited,
    refused: labels.errorRefused,
  };
  const bubble = "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed";
  const button = "inline-flex items-center rounded-xl px-3.5 py-2 text-sm font-bold text-white";

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-ivory md:inset-auto md:right-6 md:bottom-6 md:h-[min(620px,calc(100vh-48px))] md:w-[390px] md:overflow-hidden md:rounded-2xl md:border md:border-line md:shadow-[0_18px_48px_rgba(34,39,31,0.28)]"
    >
      <div className="flex items-center gap-2 bg-pine px-4 py-3 text-ivory">
        <h2 id={titleId} className="font-display text-lg font-semibold">
          {labels.title}
        </h2>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold tracking-wide">
          {labels.aiBadge}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {chat.messages.length > 0 && (
            <button
              type="button"
              onClick={() => setChat(newChat())}
              disabled={busy}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-ivory/85 hover:bg-white/10"
            >
              {labels.reset}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={log}
        role="log"
        aria-busy={busy}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        <div className={`${bubble} bg-white text-ink`}>{labels.welcome}</div>
        {chat.messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {labels.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-pine hover:border-clay"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {chat.messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className={`${bubble} ml-auto bg-clay whitespace-pre-wrap text-white`}>
              {m.text}
            </div>
          ) : (
            <div key={i} className="space-y-2">
              {(m.text || (busy && i === chat.messages.length - 1)) && (
                <div className={`${bubble} bg-white whitespace-pre-wrap text-ink`}>
                  {m.text || <span className="text-muted">{labels.thinking}</span>}
                </div>
              )}
              {m.error && (
                <div className={`${bubble} bg-[#fbe4dc] font-semibold text-clay-dark`}>
                  {errorText[m.error]}
                </div>
              )}
              {[
                ...m.actions,
                ...(m.error ? [{ type: "whatsapp" as const, href: site.whatsapp }] : []),
              ].map((action, j) => {
                const href = safeHref(action);
                if (!href) return null;
                return action.type === "booking" ? (
                  <Link key={j} href={href} onClick={onClose} className={`${button} bg-clay`}>
                    {labels.bookingButton}
                  </Link>
                ) : (
                  <a
                    key={j}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${button} bg-whatsapp`}
                  >
                    {labels.whatsappButton}
                  </a>
                );
              })}
            </div>
          ),
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-end gap-2 border-t border-line bg-white px-3 py-3"
      >
        <textarea
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm text-ink outline-none focus:border-clay"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="h-11 rounded-xl bg-clay px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {labels.send}
        </button>
      </form>
      <p className="bg-white px-4 pb-3 text-[11px] text-muted">
        {labels.disclaimer}{" "}
        <Link href={`/${lang}/gizlilik`} className="underline">
          {labels.privacy}
        </Link>
      </p>
    </div>
  );
}
