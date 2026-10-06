"use client";

import type { ChatResponse } from "@/types";

function AnswerText({ text, preview = false }: { text: string; preview?: boolean }) {
  const visibleText = preview && text.length > 420 ? `${text.slice(0, 420).trimEnd()}…` : text;
  return <div className="short-answer">{visibleText.split(/\n{2,}/).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>)}</div>;
}

export function Paywall({ onSubscribe, onConsult }: { onSubscribe: () => void; onConsult: () => void }) {
  return <div className="locked-solution">
    <div className="locked-preview" aria-hidden="true"><span>3. Проверьте движения документа и связанные регистры</span><span>4. Выполните контрольные операции перед закрытием периода</span><span>5. Сопоставьте результат с исходными документами</span></div>
    <div className="paywall"><strong>Полное пошаговое решение в 1С</strong><p>Полный алгоритм, пошаговые действия в 1С и связанные материалы доступны по подписке.</p>
      <div className="result-actions"><button className="primary-btn action-button" onClick={onSubscribe}>Открыть полный доступ</button><button className="secondary-link" onClick={onConsult}>Получить консультацию</button></div>
    </div>
  </div>;
}

export function AiAnswer({ question, answer, onSubscribe, onConsult, showPaywall = true, showDisclaimer = true, preview = false, onRegister }: { question: string; answer: ChatResponse; onSubscribe: () => void; onConsult: () => void; showPaywall?: boolean; showDisclaimer?: boolean; preview?: boolean; onRegister?: () => void }) {
  return <div className="answer show">
    <div className="query"><span>?</span><div>{question}</div></div>
    <div className="assistant-message">
    <AnswerText text={answer.shortAnswer} preview={preview} />
    {preview ? <><div className="locked-solution registration-lock"><div className="locked-preview" aria-hidden="true"><span>Продолжение ответа с пояснениями и действиями</span><span>Уточнения по вашей ситуации в диалоге</span></div><div className="paywall"><strong>Полный ответ уже готов</strong><p>Зарегистрируйтесь, чтобы открыть продолжение ответа и продолжить диалог с AI-помощником.</p><button type="button" className="primary-btn action-button" onClick={onRegister}>Зарегистрироваться и посмотреть ответ</button><p className="fine">Уже есть аккаунт? Войдите через кнопку в шапке.</p></div></div>{showDisclaimer && <p className="disclaimer">ИИ-помощник работает в тестовом режиме и может ошибаться. Перед применением проверяйте ответ по актуальным источникам; в сложных случаях уточните у эксперта.</p>}</> : <>
    {showDisclaimer && <p className="disclaimer">ИИ-помощник работает в тестовом режиме и может ошибаться. Перед применением проверяйте ответ по актуальным источникам; в сложных случаях уточните у эксперта.</p>}
    {showPaywall && <Paywall onSubscribe={onSubscribe} onConsult={onConsult} />}
    </>}
    </div>
  </div>;
}
