import { NextRequest, NextResponse } from "next/server";

interface KakaoReminderRequestBody {
  technicianName: string;
  technicianPhone: string;
  scheduleDate: string;
  scheduleTime?: string;
  customerName: string;
  customerAddress: string;
  productName: string;
  sharedNotes: string;
  message: string;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 환경변수가 비어 있습니다.`);
  }
  return value;
}

export async function POST(req: NextRequest) {
  let body: KakaoReminderRequestBody;

  try {
    body = (await req.json()) as KakaoReminderRequestBody;
  } catch {
    return NextResponse.json({ error: "요청 본문(JSON)이 올바르지 않습니다." }, { status: 400 });
  }

  if (!body?.technicianPhone || !body?.message) {
    return NextResponse.json(
      { error: "기사 연락처와 메시지는 필수입니다." },
      { status: 400 },
    );
  }

  const isEnabled = process.env.KAKAO_ALIMTALK_ENABLED === "true";

  if (!isEnabled) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      message:
        "카카오 알림톡 연동 준비 모드입니다. 환경변수 설정 후 실제 발송이 활성화됩니다.",
      preview: {
        to: normalizePhone(body.technicianPhone),
        technicianName: body.technicianName,
        schedule: [body.scheduleDate, body.scheduleTime].filter(Boolean).join(" "),
        customerName: body.customerName,
        customerAddress: body.customerAddress,
        productName: body.productName,
        sharedNotes: body.sharedNotes,
        text: body.message,
      },
    });
  }

  try {
    const endpoint = getRequiredEnv("KAKAO_ALIMTALK_ENDPOINT");
    const apiKey = getRequiredEnv("KAKAO_ALIMTALK_API_KEY");
    const senderKey = getRequiredEnv("KAKAO_ALIMTALK_SENDER_KEY");
    const templateCode = getRequiredEnv("KAKAO_ALIMTALK_TEMPLATE_CODE");

    const payload = {
      senderKey,
      templateCode,
      recipientNo: normalizePhone(body.technicianPhone),
      message: body.message,
      variables: {
        technicianName: body.technicianName,
        schedule: [body.scheduleDate, body.scheduleTime].filter(Boolean).join(" "),
        customerName: body.customerName,
        customerAddress: body.customerAddress,
        productName: body.productName,
        sharedNotes: body.sharedNotes,
      },
    };

    const vendorResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!vendorResponse.ok) {
      const raw = await vendorResponse.text();
      return NextResponse.json(
        { error: `카카오 발송 API 오류: ${vendorResponse.status}`, raw },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      dryRun: false,
      message: "카카오톡 리마인드 발송 요청이 완료되었습니다.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "카카오 발송 처리 중 알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
