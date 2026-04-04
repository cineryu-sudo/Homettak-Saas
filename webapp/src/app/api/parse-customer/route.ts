import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY 환경변수가 설정되지 않았습니다. .env.local 파일에 GEMINI_API_KEY=your-key를 추가하세요.",
    );
  }
  return new GoogleGenAI({ apiKey });
}

const MAX_TEXT_LENGTH = 5000;

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "텍스트가 필요합니다." }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `텍스트가 너무 깁니다. (최대 ${MAX_TEXT_LENGTH}자)` },
      { status: 400 },
    );
  }

  const currentYear = new Date().getFullYear();

  const prompt = `당신은 싱크볼 교체 주문 정보를 구조화하는 비서입니다.
아래 텍스트에서 주문 등록에 필요한 정보를 추출하세요.

반드시 JSON만 출력하세요. 다른 설명은 절대 포함하지 마세요.
정보가 없으면 빈 문자열("") 또는 0을 넣으세요.

{
  "customerName": "고객 이름",
  "phone": "전화번호 (010-0000-0000 형식)",
  "address": "주소",
  "requestedInstallDate": "설치요청일 (YYYY-MM-DD, 없으면 '')",
  "requestedInstallTime": "설치요청시간 (HH:mm, 없으면 '')",
  "sinkType": "언더싱크볼/오버싱크볼/일체형싱크볼/사각싱크볼/원형싱크볼 중 하나",
  "notes": "메모",
  "price": 0
}

규칙:
- 설치요청일이 월/일만 있으면 연도는 ${currentYear} 사용
- 설치요청시간이 "오전 9시", "오후 2시" 같은 표현이면 HH:mm로 변환
- 가격은 숫자만 반환 (예: 350000)
- 제품명/구성품은 notes에 포함 가능 (제품은 별도 수기 입력 필드가 있음)

텍스트:
${text}`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const raw = response.text ?? "";
    const jsonMatch =
      raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "파싱 실패", raw }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[1]);

    return NextResponse.json({
      data: {
        customerName: parsed.customerName || "",
        phone: parsed.phone || "",
        address: parsed.address || "",
        requestedInstallDate: parsed.requestedInstallDate || "",
        requestedInstallTime: parsed.requestedInstallTime || "",
        sinkType: parsed.sinkType || "",
        notes: parsed.notes || "",
        price: Number(parsed.price) || 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[parse-customer] AI 파싱 에러:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
