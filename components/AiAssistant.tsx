"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatResponse, ChatTurn } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { AiAnswer } from "./AiAnswer";

const suggestions = ["Как провести лизинг в 1С?", "Как начислить НДФЛ?", "Как оформить увольнение?", "Как отразить расходы на подписку?"];
const safetyNote = "ИИ-помощник работает в тестовом режиме и может ошибаться. Перед применением проверяйте ответ по актуальным источникам; в сложных случаях уточните у эксперта.";

function newRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function AiAssistant({ onSubscribe, onConsult, isAuthenticated, onAuthRequired }: { onSubscribe: (location: string) => void; onConsult: (location: string) => void; isAuthenticated: boolean; onAuthRequired: () => void }) {
  const [question, setQuestion] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<{ question: string; requestId: string }>();
  const inFlight = useRef<string | null>(null);
  const conversationId = useRef(newRequestId());
  const questionInput = useRef<HTMLInputElement>(null);

  useEffect(() => { trackEvent("h01_variant_view", { query_category: "registration_answer_preview" }); }, []);

  const sendQuestion = async (value: string, requestId = newRequestId()) => {
    const normalized = value.trim();
    if (loading || inFlight.current === requestId || normalized.length < 4) return;
    inFlight.current = requestId;
    const history: ChatTurn[] = messages.map((item) => ({ role: item.role, content: item.text }));
    setError(""); setRetry({ question: normalized, requestId }); setLoading(true); setCollapsed(false);
    setMessages((current) => current.some((item) => item.id === requestId) ? current : [...current, { id: requestId, role: "user", text: normalized }]);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: normalized, idempotencyKey: requestId, conversationId: conversationId.current, history }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Не удалось получить ответ.");
      const answer = data as ChatResponse;
      setMessages((current) => [...current.filter((item) => item.id !== `answer-${requestId}`), { id: `answer-${requestId}`, role: "assistant", text: answer.shortAnswer, answer }]);
      setQuestion(""); setFollowUpQuestion(""); setDemoMode(answer.demoMode); setRetry(undefined);
      trackEvent("h01_answer_view", { answer_confidence: answer.confidence });
      if (!isAuthenticated) trackEvent("h01_registration_offer", { query_category: "answer_preview" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось получить ответ. Попробуйте ещё раз.");
      trackEvent("h01_answer_error");
    } finally { setLoading(false); inFlight.current = null; }
  };

  const ask = (value = question) => {
    const normalized = value.trim();
    if (loading || normalized.length < 4) return;
    trackEvent("h01_question_submit", { query_category: isAuthenticated ? "authenticated" : "guest" });
    void sendQuestion(normalized);
  };
  const askFollowUp = () => {
    const normalized = followUpQuestion.trim();
    if (loading || normalized.length < 4) return;
    trackEvent("h01_question_submit", { query_category: "authenticated_followup" });
    void sendQuestion(normalized);
  };
  const keydown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") ask(); };
  const followUpKeydown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") askFollowUp(); };
  const newDialog = () => {
    conversationId.current = newRequestId(); inFlight.current = null;
    setMessages([]); setQuestion(""); setFollowUpQuestion(""); setError(""); setRetry(undefined); setCollapsed(false);
    window.setTimeout(() => questionInput.current?.focus(), 0);
  };
  const lastAnswerId = [...messages].reverse().find((message) => message.role === "assistant")?.id;
  const showChat = messages.length > 0 || loading || error;

  return <section className="card ai" id="ai">
    <div className="ai-orbit" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span></div>
    <div className="ai-kicker"><span className="ai-kicker-dot" />БУХЭКСПЕРТ AI · ПОИСК ПО БАЗЕ ЗНАНИЙ</div>
    <div className="ai-heading"><div><h1>Спросите — и получите готовое решение</h1><p className="lead">Получите краткий ответ, а после регистрации — полное объяснение и возможность уточнять ситуацию в диалоге.</p></div><div className="owl" aria-hidden="true">✦</div></div>
    <p className="demo-note">{safetyNote}</p>
    <div className="ask-shell"><span className="ask-icon" aria-hidden="true">⌕</span><input ref={questionInput} id="question" value={question} maxLength={600} onChange={(event) => setQuestion(event.target.value)} onKeyDown={keydown} disabled={loading} placeholder="Например: как отразить лизинг в 1С?" aria-label="Вопрос AI-помощнику" /><button type="button" className="primary-btn ask-button" disabled={loading || question.trim().length < 4} onClick={() => ask()}>{loading ? "Ищу…" : <><span>Получить ответ</span><b>↗</b></>}</button></div>
    <div className="chips">{suggestions.map((item) => <button type="button" className="chip" key={item} disabled={loading} onClick={() => { setQuestion(item); ask(item); }}>{item}</button>)}</div>
    <div className="ai-meta">{demoMode && <span className="demo-label">Тестовый режим</span>}</div>
    {showChat && <div className={`result show ${collapsed ? "result-collapsed" : ""}`}>
      <div className="chat-controls"><button type="button" className="clear-history" onClick={() => setCollapsed((value) => !value)}>{collapsed ? "Развернуть" : "Свернуть"}</button><button type="button" className="clear-history" onClick={newDialog}>Новый диалог</button></div>
      {!collapsed && <><div className="chat-history">{messages.map((message, index) => message.role === "user" ? messages[index + 1]?.role === "assistant" ? null : <div className="query" key={message.id}><span>?</span><div>{message.text}</div></div> : message.answer ? <AiAnswer key={message.id} question={messages[index - 1]?.text || "Вопрос"} answer={message.answer} onSubscribe={() => onSubscribe("answer_paywall")} onConsult={() => onConsult("answer_consult")} showPaywall={false} showDisclaimer={message.id === lastAnswerId} preview={!isAuthenticated} onRegister={onAuthRequired} /> : null)}</div>{loading && <div className="loader show"><i className="spinner" />Формируем ответ…</div>}{error && <div className="error-state"><b>Не удалось получить ответ</b><p>{error}</p>{retry && <button type="button" className="outline modal-button" onClick={() => void sendQuestion(retry.question, retry.requestId)}>Повторить запрос</button>}</div>}{isAuthenticated && messages.some((item) => item.role === "assistant") && <div className="chat-followup"><input value={followUpQuestion} onChange={(event) => setFollowUpQuestion(event.target.value)} onKeyDown={followUpKeydown} disabled={loading} placeholder="Уточните вашу ситуацию" aria-label="Уточняющий вопрос" /><button type="button" className="primary-btn" disabled={loading || followUpQuestion.trim().length < 4} onClick={askFollowUp}>Уточнить</button></div>}</>}
    </div>}
  </section>;
}
