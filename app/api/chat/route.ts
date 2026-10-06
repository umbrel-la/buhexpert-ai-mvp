import { NextRequest, NextResponse } from "next/server";
import { createAiAnswer } from "@/lib/ai";
import { searchMaterials } from "@/lib/search";

const requestCache = new Map<string, unknown>();

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
  const history = typeof body === "object" && body && "history" in body && Array.isArray(body.history)
    ? body.history.map((item) => String(item).slice(0, 600)) : [];
  if (question.length < 4 || question.length > 600) {
    return NextResponse.json({ error: "Введите вопрос длиной от 4 до 600 символов." }, { status: 400 });
  }
  if (!idempotencyKey || idempotencyKey.length > 120) {
    return NextResponse.json({ error: "Не удалось подтвердить уникальность запроса." }, { status: 400 });
  }
  const cached = requestCache.get(idempotencyKey);
  if (cached) {
    return NextResponse.json(cached);
  }
  try {
    const answer = await createAiAnswer(question, searchMaterials(question), Number.MAX_SAFE_INTEGER, history);
    requestCache.set(idempotencyKey, answer);
    if (requestCache.size > 100) requestCache.delete(requestCache.keys().next().value as string);
    return NextResponse.json(answer);
  } catch (error) {
    console.error("Chat request failed", error);
    return NextResponse.json({ error: "Не удалось получить ответ. Попробуйте ещё раз." }, { status: 502 });
  }
}

export async function DELETE() {
  return NextResponse.json({ remainingQueries: Number.MAX_SAFE_INTEGER });
}
