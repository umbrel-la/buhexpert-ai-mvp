"use client";

import { useEffect, useState } from "react";
import { trackDemoEvent, trackEvent } from "@/lib/analytics";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { AiAssistant } from "./AiAssistant";
import { ContentFeed, RightEventsColumn } from "./ContentFeed";
import { AuthModal, ConsultationModal, SubscriptionModal } from "./Modals";

export function AppShell() {
  const [modal, setModal] = useState<"subscription" | "consultation" | null>(null);
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    fetch("/api/auth/session").then((response) => response.json()).then((session) => {
      if (session.mode === "real") setAuthenticated(Boolean(session.authenticated));
    }).catch(() => {});
  }, []);
  const subscribe = (location: string) => { trackEvent("ai_subscription_click", { button_location: location }); setModal("subscription"); };
  const consult = (location: string) => { trackEvent("ai_consultation_click", { button_location: location }); setModal("consultation"); };
  const openRegister = () => { trackDemoEvent("h01_demo_registration_start"); setAuthModal("register"); };
  const openLogin = () => { setAuthModal("login"); };
  const authenticatedCallback = (kind: "login" | "register") => {
    setAuthenticated(true); setAuthModal(null);
    if (kind === "register") trackDemoEvent("h01_demo_registration_complete");
    else trackDemoEvent("h01_demo_existing_login_complete");
    if (kind === "register") trackDemoEvent("h01_demo_registration_success");
    trackDemoEvent("h01_demo_chat_return");
  };
  return <>
    <Header onSubscribe={subscribe} onLogin={openLogin} onRegister={openRegister} />
    <div className="dashboard">
      <Sidebar onSubscribe={subscribe} onConsult={consult} />
      <main className="workspace">
        <AiAssistant onSubscribe={subscribe} onConsult={consult} isAuthenticated={authenticated} onAuthRequired={openRegister} />
        <div className="insight-grid"><div className="feed-stack"><ContentFeed /></div><RightEventsColumn /></div>
      </main>
    </div>
    <button className="helper" onClick={() => consult("owl_widget")}><i>🦉</i><span><b>Сова-помощник</b>Нужна консультация?</span></button>
    {modal === "subscription" && <SubscriptionModal onClose={() => setModal(null)} />}
    {modal === "consultation" && <ConsultationModal onClose={() => setModal(null)} />}
    {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onAuthenticated={authenticatedCallback} onSwitch={setAuthModal} />}
  </>;
}
