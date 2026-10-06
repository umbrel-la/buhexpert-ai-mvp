export type AnalyticsEvent =
  | "ai_assistant_view" | "ai_query_submit" | "ai_answer_view" | "ai_no_answer"
  | "ai_source_click" | "ai_paywall_view" | "ai_subscription_click"
  | "ai_consultation_click" | "ai_consultation_submit" | "ai_free_limit_reached"
  | "article_view" | "article_ai_widget_view" | "article_ai_question_submit"
  | "article_ai_answer_shown" | "article_paywall_view" | "article_full_access_click"
  | "personalized_answer_open" | "personalized_paywall_view" | "personalized_full_access_click"
  | "consultation_click"
  | "h01_variant_view" | "h01_question_submit" | "h01_registration_offer"
  | "h01_registration_start" | "h01_registration_success" | "h01_existing_login"
  | "h01_chat_return" | "h01_answer_view" | "h01_answer_error";

type Params = Partial<{
  query_category: string;
  remaining_queries: number;
  source_id: string;
  button_location: string;
  answer_confidence: string;
  article_slug: string;
}>;

declare global {
  interface Window {
    ym?: (counter: number, action: "reachGoal", event: string, params?: Params) => void;
  }
}

export function trackEvent(event: AnalyticsEvent, params: Params = {}) {
  if (process.env.NODE_ENV === "development") console.info("[analytics]", event, params);
  const id = Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID);
  if (id && typeof window !== "undefined" && typeof window.ym === "function") {
    try { window.ym(id, "reachGoal", event, params); } catch { /* analytics must never break UX */ }
  }
}

/** Demo-only events must never be forwarded to production Yandex Metrica. */
export function trackDemoEvent(event: string, params: Params = {}) {
  if (process.env.NODE_ENV === "development") console.info("[demo-analytics]", event, params);
}
