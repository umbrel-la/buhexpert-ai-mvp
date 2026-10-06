"use client";

export function Header({ onSubscribe, onLogin, onRegister }: { onSubscribe: (location: string) => void; onLogin?: () => void; onRegister?: () => void }) {
  return (
    <header className="top">
      <button className="mobile-menu" aria-label="Открыть меню">☰</button>
      <div className="logo">БУХЭКСПЕРТ<small>Ваш помощник по учёту в 1С</small></div>
      <button className="sections">☰ &nbsp; Все разделы</button>
      <label className="search"><span className="sr-only">Поиск по сайту</span><input placeholder="Поиск по сайту" /></label>
      <div className="top-icons" aria-label="Сервисы"><span>♡</span><span>♧</span><span>🔔</span></div>
      <button className="buy" onClick={() => onSubscribe("header")}>Купить подписку</button>
      <nav className="auth"><button type="button" onClick={onLogin}>Войти</button><button type="button" onClick={onRegister}>Регистрация</button></nav>
    </header>
  );
}
