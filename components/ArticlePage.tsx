"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ChatResponse } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { getPersonalizedAnswer, savePersonalizedAnswer } from "@/lib/personalized-answer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { AiAnswer } from "./AiAnswer";
import { ConsultationModal, SubscriptionModal } from "./Modals";

const slug = "os-v-1c-8-3";
const suggested = ["Как принять ОС с дополнительными расходами?", "Какие документы проверить перед принятием ОС?", "Как проверить параметры амортизации?"];

function ArticleAi({ compact, initialQuestion, onSubscribe, onConsult }: { compact?: boolean; initialQuestion?: string; onSubscribe: (location: string) => void; onConsult: (location: string) => void }) {
  const [question, setQuestion] = useState(compact ? "" : initialQuestion || "Например: как принять к учету основное средство с дополнительными расходами?");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState<ChatResponse | null>(null);
  const [remaining, setRemaining] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const conversationId = useRef("");
  useEffect(() => {
    conversationId.current = crypto.randomUUID();
    trackEvent("article_ai_widget_view", { article_slug: slug });
    fetch("/api/chat").then((r) => r.json()).then((d) => setRemaining(d.remainingQueries)).catch(() => {});
    const syncQuota = (event: Event) => setRemaining((event as CustomEvent<number>).detail ?? 3);
    window.addEventListener("buhexpert-quota-reset", syncQuota);
    return () => window.removeEventListener("buhexpert-quota-reset", syncQuota);
  }, []);
  const submit = async (value = question) => {
    const normalized = value.trim();
    if (loading || normalized.length < 4) return;
    if (!remaining) { onSubscribe("article_limit"); return; }
    const saved = getPersonalizedAnswer();
    if (saved?.articleSlug === slug && saved.question.toLocaleLowerCase() === normalized.toLocaleLowerCase()) {
      setAsked(normalized); setQuestion(normalized); setAnswer(saved.answer); setRemaining(saved.answer.remainingQueries); return;
    }
    setAsked(normalized); setQuestion(normalized); setLoading(true); setError(""); setAnswer(null);
    trackEvent("article_ai_question_submit", { article_slug: slug, remaining_queries: remaining });
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: normalized, idempotencyKey: `${slug}-${Date.now()}-${Math.random()}`, conversationId: conversationId.current, history: [] }) });
      const data = await response.json();
      if (response.status === 429) { setRemaining(0); onSubscribe("article_limit"); return; }
      if (!response.ok) throw new Error(data.error || "Не удалось получить ответ.");
      setAnswer(data); setRemaining(data.remainingQueries);
      savePersonalizedAnswer({ question: normalized, answer: data, articleSlug: slug, savedAt: new Date().toISOString() });
      trackEvent("article_ai_answer_shown", { article_slug: slug, remaining_queries: data.remainingQueries, answer_confidence: data.confidence });
      trackEvent("article_paywall_view", { article_slug: slug, remaining_queries: data.remainingQueries });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось получить ответ."); } finally { setLoading(false); }
  };
  const keydown = (event: KeyboardEvent<HTMLInputElement>) => event.key === "Enter" && submit();
  const reset = () => { setAnswer(null); setAsked(""); setQuestion(""); setError(""); };
  const resetLimit = async () => {
    const response = await fetch("/api/chat", { method: "DELETE" });
    if (!response.ok) return;
    setRemaining(3); reset();
    window.dispatchEvent(new CustomEvent("buhexpert-quota-reset", { detail: 3 }));
  };
  return <section className={`article-ai ${compact ? "article-ai-compact" : ""}`}>
    {!compact && <><span className="article-ai-label">AI-ПОМОЩНИК БУХЭКСПЕРТА</span><h2>Нужен ответ для вашей ситуации?</h2><p>Спросите AI-помощника БухЭксперта. Он подберет решение по материалам базы знаний.</p></>}
    {compact && <div><b>Остались вопросы по вашей ситуации в 1С?</b><p>Получите персональный ответ по материалам БухЭксперта.</p></div>}
    <div className="article-ai-form"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={keydown} disabled={loading || !remaining} placeholder="Например: как принять к учету основное средство?" aria-label="Вопрос AI по статье" />
      <button className="article-ai-button" onClick={() => submit()} disabled={loading || !remaining || question.trim().length < 4}>{loading ? "Ищу…" : compact ? "Задать вопрос AI" : "Спросить AI"}</button></div>
    <div className="article-ai-chips">{(compact ? suggested.slice(0, 2) : suggested).map((item) => <button key={item} onClick={() => { setQuestion(item); submit(item); }} disabled={loading || !remaining}>{item}</button>)}</div>
    <small>Тестовый режим: ответы доступны по демонстрационной подборке материалов. {remaining === 0 && <button className="article-reset-limit" onClick={resetLimit}>Сбросить лимит демонстрации</button>}</small>
    {(asked || error) && <div className="article-ai-result">{error && <p className="article-ai-error">{error}</p>}{answer && <><Link className="personalized-link" href="/personalized-answers">Открыть персональный ответ</Link><AiAnswer question={asked} answer={answer} onSubscribe={() => { trackEvent("article_full_access_click", { article_slug: slug }); onSubscribe("article_answer"); }} onConsult={() => onConsult("article_answer")} /></>}</div>}
  </section>;
}

export function ArticlePage() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("question") || undefined;
  const [modal, setModal] = useState<"subscription" | "consultation" | null>(null);
  const subscribe = (location: string) => { trackEvent("ai_subscription_click", { button_location: location, article_slug: slug }); setModal("subscription"); };
  const consult = (location: string) => { trackEvent("ai_consultation_click", { button_location: location, article_slug: slug }); setModal("consultation"); };
  useEffect(() => { trackEvent("article_view", { article_slug: slug }); }, []);
  return <><Header onSubscribe={subscribe} /><div className="article-layout"><Sidebar onSubscribe={subscribe} onConsult={consult} /><main className="article-main">
    <nav className="breadcrumbs"><Link href="/">Главная</Link><span>›</span><Link href="/articles/os-v-1c-8-3">Статьи</Link><span>›</span><span>Основные средства</span></nav>
    <article className="article-body"><h1>Принятие к учету ОС в 1С 8.3: пошаговая инструкция</h1><p className="article-intro">Разбираем, какие документы и параметры полезно проверить перед тем, как принять основное средство к учету в программе.</p>
      <p>В статье показан демонстрационный ориентир для работы в 1С:Бухгалтерии 3.0. Точный порядок зависит от вашей версии программы, настроек учета и первичных документов.</p>
      <h2 id="what-you-learn">Что вы узнаете из статьи</h2><ul><li>какие исходные документы подготовить;</li><li>какие параметры объекта проверить перед проведением;</li><li>как проконтролировать результат в программе.</li></ul>
      <ArticleAi initialQuestion={initialQuestion} onSubscribe={subscribe} onConsult={consult} />
      <h2 id="before-start">Что проверить перед принятием ОС к учету</h2><p>Сначала сопоставьте сведения в первичных документах с карточкой объекта: организацию, дату, наименование, единицу учета и ответственное лицо. Если в стоимость входят связанные расходы, убедитесь, что есть понятное основание и комплект подтверждающих документов.</p>
      <div className="article-warning"><b>Важно.</b> Не используйте эту демонстрационную статью как замену проверки учетной политики и первичных документов. При нестандартной ситуации уточните конфигурацию 1С.</div>
      <h2 id="document">Документ принятия к учету</h2><p>Откройте подходящий раздел программы и создайте либо проверьте документ принятия к учету. Заполняйте реквизиты на основании документов по объекту, а перед проведением внимательно проверьте дату и выбранные параметры учета.</p>
      <p>Полезно заранее посмотреть <a href="#control">контроль результата</a> и сверить его с первоначальной информацией об объекте.</p>
      <h2 id="control">Контроль результата</h2><p>После проведения проверьте карточку объекта и движения документа. Если данные отличаются от ожидаемых, остановитесь и перепроверьте исходные документы, настройки учета и период операции.</p>
      <h2 id="extra-costs">Если есть дополнительные расходы</h2><p>Не объединяйте разные ситуации автоматически. Проверьте, относятся ли расходы к конкретному объекту, подтверждены ли они документами и как это предусмотрено в вашей настройке учета.</p>
      <ArticleAi compact onSubscribe={subscribe} onConsult={consult} />
      <section className="see-also"><h2>См. также</h2><a href="#control">Проверка принятия ОС к учету в 1С</a><a href="#extra-costs">Дополнительные расходы при принятии ОС</a><Link href="/">Вернуться к AI-помощнику БухЭксперта</Link></section>
    </article></main>
    <aside className="article-toc"><b>Содержание</b><a href="#what-you-learn">Что вы узнаете</a><a href="#before-start">Подготовка документов</a><a href="#document">Принятие к учету</a><a href="#control">Контроль результата</a><a href="#extra-costs">Дополнительные расходы</a></aside>
  </div>{modal === "subscription" && <SubscriptionModal onClose={() => setModal(null)} />}{modal === "consultation" && <ConsultationModal onClose={() => setModal(null)} />}</>;
}
