/**
 * AI 고객 정보 파싱 API Route.
 *
 * 고객과의 대화 텍스트를 Gemini AI에 전달하여
 * 주문에 필요한 구조화된 정보(이름, 전화번호, 주소 등)를 추출합니다.
 *
 * POST /api/parse-customer
 * Body: { text: string }
 * Response: { data: { customerName, phone, address, sinkType, notes, price } }
 */

import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

/**
 * Gemini AI 클라이언트 초기화.
 * API 키가 없으면 요청 시점에 에러를 반환합니다.
 */
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY 환경변수가 설정되지 않았습니다. " +
        ".env.local 파일에 GEMINI_API_KEY=your-key를 추가하세요."
    );
  }
  return new GoogleGenAI({ apiKey });
}

/** 입력 텍스트 최대 길이 (characters) */
const MAX_TEXT_LENGTH = 5000;

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  // ── 입력 유효성 검사 ──
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "텍스트가 필요합니다" }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `텍스트가 너무 깁니다 (최대 ${MAX_TEXT_LENGTH}자)` },
      { status: 400 }
    );
  }

  // ── AI 파싱 프롬프트 ──
  const prompt = `당신은 고객 주문 정보를 추출하는 파서입니다.
아래 텍스트에서 싱크볼 교체 서비스 주문에 필요한 정보를 추출해 주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
추출할 수 없는 필드는 빈 문자열("")로 남겨두세요.

{
  "customerName": "고객 이름",
  "phone": "전화번호 (010-0000-0000 형식)",
  "address": "주소 (최대한 상세하게)",
  "sinkType": "싱크볼 타입 (언더싱크볼, 오버싱크볼, 일체형싱크볼, 사각싱크볼, 원형싱크볼 중 하나. 판단 불가시 빈 문자열)",
  "notes": "기타 요청사항이나 메모",
  "price": 0
}

가격(price)은 숫자만 넣으세요 (예: 350000). 가격 정보가 없으면 0으로 두세요.
전화번호는 010-0000-0000 형식으로 정리하세요.

텍스트:
${text}`;

  try {
    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const raw = response.text ?? "";

    // JSON 블록 추출: ```json ... ``` 형식 또는 순수 JSON 객체
    const jsonMatch =
      raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "파싱 실패", raw }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[1]);

    return NextResponse.json({ data: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[parse-customer] AI 파싱 에러:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
