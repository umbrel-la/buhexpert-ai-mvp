"use client";

import { FormEvent, useEffect, useState } from "react";
import { trackDemoEvent, trackEvent } from "@/lib/analytics";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="overlay open" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="close" onClick={onClose} aria-label="Закрыть">×</button><h2 id="modal-title">{title}</h2>{children}
    </div>
  </div>;
}

export function SubscriptionModal({ onClose }: { onClose: () => void }) {
  const [demo, setDemo] = useState(false);
  return <ModalShell title="Получите полный доступ к БухЭксперту" onClose={onClose}>{demo ? <div className="success visible"><div className="check">✓</div><h3>Демо-доступ активирован</h3><p>В MVP это демонстрационное состояние без оплаты.</p><button className="primary-btn modal-button" onClick={onClose}>Продолжить</button></div> : <>
    <p className="sub">Все инструменты для уверенной работы бухгалтера в одном месте.</p>
    <ul className="benefits"><li>Пошаговые инструкции по 1С</li><li>Полная база материалов</li><li>Актуальные семинары</li><li>Ответы экспертов</li><li>История вопросов</li></ul>
    <div className="modal-actions"><button className="primary-btn modal-button" onClick={() => { trackEvent("ai_subscription_click", { button_location: "trial_modal" }); setDemo(true); }}>Получить 8 дней доступа</button>
      <a className="outline modal-button" href="https://buhexpert8.ru/dostup" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("ai_subscription_click", { button_location: "tariffs_modal" })}>Посмотреть тарифы</a></div>
  </>}</ModalShell>;
}

export function ConsultationModal({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    trackEvent("ai_consultation_submit");
    setSent(true);
  };
  return <ModalShell title="Индивидуальная консультация" onClose={onClose}>{sent ? <div className="success visible"><div className="check">✓</div><p><b>Спасибо! В демонстрационной версии заявка не отправляется.</b></p><button className="primary-btn modal-button" onClick={onClose}>Готово</button></div> : <>
    <p className="sub">Опишите вопрос — специалист поможет определить формат консультации.</p><form onSubmit={submit}>
      <label className="form-field">Имя<input name="name" required minLength={2} autoFocus placeholder="Как к вам обращаться" /></label>
      <label className="form-field">Телефон<input name="phone" type="tel" required pattern=".{10,}" placeholder="+7 (___) ___-__-__" /></label>
      <label className="form-field">Краткое описание вопроса<textarea name="question" required minLength={10} placeholder="Конфигурация 1С и суть вопроса" /></label>
      <label className="consent"><input type="checkbox" required /> <span>Согласен на обработку данных для обратной связи</span></label>
      <button className="primary-btn modal-button submit">Отправить заявку</button>
    </form>
  </>}</ModalShell>;
}

export function AuthModal({ mode, onClose, onAuthenticated, onSwitch }: { mode: "login" | "register"; onClose: () => void; onAuthenticated: (kind: "login" | "register") => void; onSwitch: (mode: "login" | "register") => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const sendCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    trackDemoEvent(mode === "register" ? "h01_demo_registration_start" : "h01_demo_login_start");
    setStep("code");
  };
  const confirmCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    trackDemoEvent(mode === "register" ? "h01_demo_registration_success" : "h01_demo_existing_login");
    onAuthenticated(mode);
  };

  const title = mode === "register" ? "Создайте аккаунт" : "Войдите в аккаунт";
  return <ModalShell title={title} onClose={onClose}>
    {step === "email" ? <form onSubmit={sendCode}>
      <p className="sub">{mode === "register" ? "Сохраните вопрос и получите первый ответ после регистрации." : "Продолжите работу с сохранённым вопросом."}</p>
      <p className="demo-note"><b>Демонстрация email → код.</b> Письмо не отправляется, настоящий аккаунт не создаётся. Пароль не нужен.</p>
      <label className="form-field">Email<input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="name@example.com" /></label>
      <button className="primary-btn modal-button" type="submit">Получить код</button>
      <p className="fine">{mode === "register" ? <>Уже есть аккаунт? <button className="auth-switch" type="button" onClick={() => onSwitch("login")}>Войти</button></> : <>Нет аккаунта? <button className="auth-switch" type="button" onClick={() => onSwitch("register")}>Зарегистрироваться</button></>}</p>
    </form> : <form onSubmit={confirmCode}>
      <p className="sub">Введите любой шестизначный код для продолжения демонстрации.</p>
      <p className="demo-note">Код не отправлялся на почту и не сохраняется. Это только интерфейс для проверки воронки.</p>
      <label className="form-field">Код из письма<input autoFocus inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required placeholder="000000" aria-describedby="auth-code-help" /></label>
      <small id="auth-code-help">Для прототипа подойдёт любой код из 6 цифр.</small>
      <div className="modal-actions"><button className="primary-btn modal-button" type="submit">Продолжить</button><button className="outline modal-button" type="button" onClick={() => setStep("email")}>Назад</button></div>
    </form>}
  </ModalShell>;
}
