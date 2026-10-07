import { NextRequest, NextResponse } from "next/server";
import { answerPreview, createAiAnswer } from "@/lib/ai";
import { getServerSession } from "@/lib/auth";
import { searchMaterials } from "@/lib/search";
import type { ChatResponse, ChatTurn } from "@/types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_HISTORY_CHARACTERS = 60_000;
const requestCache = new Map<string, { expiresAt: number; response: ChatResponse }>();
const pendingRequests = new Map<string, Promise<ChatResponse>>();

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of requestCache) if (entry.expiresAt <= now) requestCache.delete(key);
}

function parseHistory(value: unknown): ChatTurn[] | null {
  if (!Array.isArray(value)) return [];
  const history: ChatTurn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || !("role" in item) || !("content" in item)) return null;
    const role = item.role;
    const content = item.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) return null;
    history.push({ role, content: content.trim() });
  }
  return history;
}

export async function GET() {
  return NextResponse.json({ remainingQueries: Number.MAX_SAFE_INTEGER, demoMode: !process.env.AI_API_KEY });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный формат запроса." }, { status: 400 });
  }
  const question = typeof body === "object" && body && "question" in body ? String(body.question).trim() : "";
  const idempotencyKey = typeof body === "object" && body && "idempotencyKey" in body ? String(body.idempotencyKey) : "";
  const history = typeof body === "object" && body && "history" in body ? parseHistory(body.history) : [];
  const conversationId = typeof body === "object" && body && "conversationId" in body ? String(body.conversationId) : "";
  if (question.length < 4 || question.length > 600) {
    return NextResponse.json({ error: "Введите вопрос длиной от 4 до 600 символов." }, { status: 400 });
  }
  if (!idempotencyKey || idempotencyKey.length > 120) {
    return NextResponse.json({ error: "Не удалось подтвердить уникальность запроса." }, { status: 400 });
  }
  if (!history) return NextResponse.json({ error: "Некорректная история диалога." }, { status: 400 });
  if (!/^[A-Za-z0-9_-]{16,120}$/.test(conversationId)) return NextResponse.json({ error: "Не удалось подтвердить сессию диалога." }, { status: 400 });
  const totalHistoryCharacters = history.reduce((total, turn) => total + turn.content.length, 0) + question.length;
  if (totalHistoryCharacters > MAX_HISTORY_CHARACTERS) {
    return NextResponse.json({ error: "Диалог стал слишком длинным для одного запроса. Начните новый диалог, чтобы продолжить." }, { status: 413 });
  }
  const session = await getServerSession(request);
  const sessionScope = session.authenticated && session.userId ? `user:${session.userId}` : `${session.mode}:${conversationId}`;
  const cacheKey = `${sessionScope}:${idempotencyKey}`;
  cleanCache();
  const cached = requestCache.get(cacheKey);
  if (cached) return NextResponse.json(cached.response);
  try {
    const answerPromise = pendingRequests.get(cacheKey) || createAiAnswer(question, searchMaterials(question), Number.MAX_SAFE_INTEGER, history);
    pendingRequests.set(cacheKey, answerPromise);
    const generated = await answerPromise;
    const canReceiveFullAnswer = session.mode === "demo" || session.authenticated;
    const answer: ChatResponse = canReceiveFullAnswer ? generated : { ...generated, shortAnswer: answerPreview(generated.shortAnswer), locked: true };
    answer.demoMode = session.mode === "demo" || answer.demoMode;
    requestCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, response: answer });
    if (requestCache.size > 100) requestCache.delete(requestCache.keys().next().value as string);
    return NextResponse.json(answer);
  } catch (error) {
    console.error("Chat request failed", error);
    return NextResponse.json({ error: "Не удалось получить ответ. Попробуйте ещё раз." }, { status: 502 });
  } finally { pendingRequests.delete(cacheKey); }
}

export async function DELETE() {
  return NextResponse.json({ remainingQueries: Number.MAX_SAFE_INTEGER });
}
