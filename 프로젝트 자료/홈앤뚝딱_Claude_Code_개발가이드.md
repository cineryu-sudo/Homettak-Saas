# 홈앤뚝딱 자동화 시스템 - Claude Code 개발 가이드

## 🎯 개요

이 문서는 Claude Code에서 MCP 서버와 Agent를 활용하여 홈앤뚝딱 비즈니스 자동화 시스템을 개발하기 위한 상세 가이드입니다.

---

## 📁 프로젝트 구조

```
home-and-ddukddak/
│
├── .claude/
│   └── settings.json           # Claude Code 프로젝트 설정
│
├── mcp-servers/
│   ├── notion-connector/       # Notion DB 연동
│   ├── kakao-messenger/        # 카카오 알림톡/SMS
│   ├── region-matcher/         # 지역 매칭 엔진
│   └── payment-gateway/        # 결제 연동
│
├── agents/
│   ├── order-intake/           # 주문 접수 Agent
│   ├── technician-dispatch/    # 기사 배정 Agent
│   └── settlement/             # 정산 관리 Agent
│
├── data/
│   ├── region_mapping.json     # 지역-기사 매핑
│   ├── product_catalog.json    # 상품 카탈로그
│   └── message_templates.json  # 메시지 템플릿
│
├── workflows/
│   ├── make/                   # Make(Integromat) 시나리오 백업
│   └── n8n/                    # n8n 워크플로우 (대안)
│
└── docs/
    ├── api_specs.md            # API 명세
    └── business_rules.md       # 비즈니스 룰
```

---

## 🔧 MCP 서버 개발

### 1. Notion Connector

Notion API를 통해 주문/기사/일정 DB를 관리합니다.

**설치 및 설정:**
```bash
# 기존 Notion MCP 서버 활용
npx -y @modelcontextprotocol/server-notion
```

**환경변수:**
```env
NOTION_API_KEY=secret_xxxxxxxxxxxxx
ORDER_DB_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
TECHNICIAN_DB_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SCHEDULE_DB_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**커스텀 Tool 추가 (notion-connector/tools.ts):**

```typescript
// Tool: 주문 생성
export const createOrderTool = {
  name: "notion_create_order",
  description: "새로운 주문을 Notion 주문 DB에 생성합니다",
  inputSchema: {
    type: "object",
    properties: {
      customer_name: { 
        type: "string", 
        description: "고객 이름" 
      },
      phone: { 
        type: "string", 
        description: "연락처 (010-XXXX-XXXX 형식)",
        pattern: "^010-?\\d{4}-?\\d{4}$"
      },
      address: { 
        type: "string", 
        description: "설치 주소 (시/도 시/군/구 동/읍/면 상세주소)" 
      },
      products: { 
        type: "array",
        items: { 
          type: "string",
          enum: [
            "티오람 미니",
            "휴젠뜨 노바", 
            "휴젠뜨3",
            "아티잔 싱크볼",
            "스탠다드 패키지",
            "프리미엄 패키지"
          ]
        },
        description: "구매 상품 목록"
      },
      quantity: {
        type: "object",
        additionalProperties: { type: "integer" },
        description: "상품별 수량 (예: {'티오람 미니': 2})"
      },
      preferred_date: { 
        type: "string", 
        format: "date",
        description: "설치 희망일 (YYYY-MM-DD)"
      },
      preferred_time: { 
        type: "string",
        enum: ["오전", "오후", "저녁", "시간무관"],
        description: "설치 희망 시간대"
      },
      notes: { 
        type: "string",
        description: "추가 요청사항 또는 특이사항"
      },
      channel: {
        type: "string",
        enum: ["카톡", "네톡", "전화", "스마트스토어"],
        description: "주문 유입 채널"
      }
    },
    required: ["customer_name", "phone", "address", "products", "preferred_date"]
  }
};

// Tool: 기사 조회
export const queryTechniciansTool = {
  name: "notion_query_technicians",
  description: "조건에 맞는 설치 기사 목록을 조회합니다",
  inputSchema: {
    type: "object",
    properties: {
      region_code: {
        type: "string",
        description: "지역 코드 (예: SEOUL_GANGNAM, GYEONGGI_ANSAN)"
      },
      available_date: {
        type: "string",
        format: "date",
        description: "배정 가능 날짜"
      },
      product_type: {
        type: "string",
        enum: ["음식물처리기", "싱크볼", "수전", "패키지"],
        description: "설치 상품 유형"
      },
      min_rating: {
        type: "number",
        minimum: 0,
        maximum: 5,
        description: "최소 평점"
      }
    },
    required: ["region_code"]
  }
};

// Tool: 주문 상태 업데이트
export const updateOrderStatusTool = {
  name: "notion_update_order",
  description: "주문의 상태 및 정보를 업데이트합니다",
  inputSchema: {
    type: "object",
    properties: {
      order_id: {
        type: "string",
        description: "Notion 주문 페이지 ID"
      },
      status: {
        type: "string",
        enum: ["접수완료", "기사배정", "설치예정", "설치완료", "정산완료", "취소"],
        description: "주문 상태"
      },
      assigned_technician_id: {
        type: "string",
        description: "배정 기사 Notion 페이지 ID"
      },
      installation_fee: {
        type: "number",
        description: "시공 비용"
      },
      payment_confirmed: {
        type: "boolean",
        description: "입금 확인 여부"
      },
      payment_date: {
        type: "string",
        format: "date",
        description: "입금 확인일"
      }
    },
    required: ["order_id"]
  }
};
```

---

### 2. Region Matcher

주소에서 지역코드를 추출하고 적합한 기사를 매칭합니다.

**region-matcher/index.ts:**

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import regionMapping from "../data/region_mapping.json";

const server = new Server(
  { name: "region-matcher", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 지역 추출 Tool
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "extract_region") {
    return extractRegion(args.address);
  }
  
  if (name === "match_technician") {
    return matchTechnician(args.region_code, args.date, args.products);
  }
  
  if (name === "calculate_installation_fee") {
    return calculateFee(args.technician_id, args.products, args.additional_work);
  }
});

function extractRegion(address: string): RegionResult {
  // 주소 정규화
  const normalized = address.replace(/\s+/g, " ").trim();
  
  // 시/도 추출
  const sidoPatterns = [
    { pattern: /서울/, code: "SEOUL" },
    { pattern: /경기/, code: "GYEONGGI" },
    { pattern: /인천/, code: "INCHEON" },
    { pattern: /부산/, code: "BUSAN" },
    { pattern: /대구/, code: "DAEGU" },
    { pattern: /광주/, code: "GWANGJU" },
    { pattern: /대전/, code: "DAEJEON" },
    { pattern: /울산/, code: "ULSAN" },
    { pattern: /세종/, code: "SEJONG" },
    { pattern: /강원/, code: "GANGWON" },
    { pattern: /충북|충청북도/, code: "CHUNGBUK" },
    { pattern: /충남|충청남도/, code: "CHUNGNAM" },
    { pattern: /전북|전라북도/, code: "JEONBUK" },
    { pattern: /전남|전라남도/, code: "JEONNAM" },
    { pattern: /경북|경상북도/, code: "GYEONGBUK" },
    { pattern: /경남|경상남도/, code: "GYEONGNAM" },
    { pattern: /제주/, code: "JEJU" },
  ];
  
  let sido = "UNKNOWN";
  for (const { pattern, code } of sidoPatterns) {
    if (pattern.test(normalized)) {
      sido = code;
      break;
    }
  }
  
  // 구/군 추출 (서울, 경기 상세 분류)
  let subRegion = "";
  
  if (sido === "SEOUL") {
    const gangnamArea = /강남|서초|송파|강동/;
    const gangbukArea = /종로|중구|용산|성동|광진|동대문|중랑|성북|강북|도봉|노원/;
    const seobukArea = /은평|서대문|마포/;
    const seonamArea = /양천|강서|구로|금천|영등포|동작|관악/;
    
    if (gangnamArea.test(normalized)) subRegion = "GANGNAM";
    else if (gangbukArea.test(normalized)) subRegion = "GANGBUK";
    else if (seobukArea.test(normalized)) subRegion = "SEOBUK";
    else if (seonamArea.test(normalized)) subRegion = "SEONAM";
  }
  
  if (sido === "GYEONGGI") {
    const northArea = /고양|파주|김포|의정부|양주|동두천|연천|포천|가평|남양주|구리/;
    const southArea = /수원|용인|성남|안양|군포|의왕|과천|광명|안산|시흥|화성|평택|오산|안성/;
    const eastArea = /하남|광주|이천|여주|양평/;
    
    if (northArea.test(normalized)) subRegion = "NORTH";
    else if (southArea.test(normalized)) subRegion = "SOUTH";
    else if (eastArea.test(normalized)) subRegion = "EAST";
  }
  
  const regionCode = subRegion ? `${sido}_${subRegion}` : sido;
  
  // 상세 동/읍/면 추출
  const dongMatch = normalized.match(/(\S+동|\S+읍|\S+면)/);
  const detailArea = dongMatch ? dongMatch[1] : "";
  
  return {
    region_code: regionCode,
    sido: sido,
    sub_region: subRegion,
    detail_area: detailArea,
    original_address: address,
    confidence: subRegion ? 0.9 : 0.7
  };
}

function matchTechnician(regionCode: string, date: string, products: string[]): TechnicianMatch[] {
  const mapping = regionMapping.regions[regionCode];
  
  if (!mapping) {
    return [{
      technician_id: null,
      match_type: "NO_MATCH",
      message: `${regionCode} 지역 담당 기사가 없습니다. 관리자 확인이 필요합니다.`
    }];
  }
  
  const candidates = mapping.technicians.map(tech => {
    let score = 0;
    
    // 기본 점수
    score += tech.is_primary ? 3 : 1;
    
    // 평점 점수
    if (tech.rating >= 4.5) score += 2;
    else if (tech.rating >= 4.0) score += 1;
    
    // 상품 적합성
    const canHandle = products.every(p => tech.specialties.includes(p));
    if (!canHandle) score -= 5;
    
    return {
      ...tech,
      score,
      can_handle: canHandle
    };
  });
  
  return candidates
    .filter(c => c.can_handle)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// 서버 시작
const transport = new StdioServerTransport();
await server.connect(transport);
```

**data/region_mapping.json:**

```json
{
  "regions": {
    "SEOUL_GANGNAM": {
      "name": "서울 강남권",
      "includes": ["강남구", "서초구", "송파구", "강동구"],
      "technicians": [
        {
          "id": "tech_001",
          "name": "집수리플러스",
          "contact": "010-9762-0419",
          "is_primary": true,
          "rating": 4.5,
          "specialties": ["티오람 미니", "휴젠뜨 노바", "휴젠뜨3"],
          "fee_tioram_mini": 60000,
          "fee_sink_faucet": 120000
        }
      ]
    },
    "GYEONGGI_SOUTH": {
      "name": "경기 남부",
      "includes": ["수원", "용인", "성남", "안양", "평택", "화성"],
      "technicians": [
        {
          "id": "tech_002",
          "name": "이정호",
          "contact": "010-5733-2938",
          "is_primary": true,
          "rating": 4.8,
          "specialties": ["티오람 미니", "휴젠뜨 노바", "휴젠뜨3", "싱크볼"],
          "fee_tioram_mini": 50000,
          "fee_sink_faucet": 120000
        }
      ]
    },
    "GYEONGGI_ANSAN": {
      "name": "경기 안산/시흥",
      "includes": ["안산", "시흥"],
      "technicians": [
        {
          "id": "tech_003",
          "name": "제이엠스톤",
          "contact": "010-4070-1826",
          "is_primary": true,
          "rating": 4.6,
          "specialties": ["티오람 미니", "싱크볼", "대리석"],
          "fee_tioram_mini": 50000,
          "fee_sink_faucet": 120000,
          "note": "대리석/엔지니어드스톤 전문"
        }
      ]
    },
    "INCHEON": {
      "name": "인천",
      "includes": ["인천 전체"],
      "technicians": [
        {
          "id": "tech_004",
          "name": "제이엠스톤",
          "contact": "010-4070-1826",
          "is_primary": true,
          "rating": 4.6,
          "specialties": ["티오람 미니", "싱크볼"]
        },
        {
          "id": "tech_005",
          "name": "하츠힘펠설치팀장",
          "contact": "010-6307-4206",
          "is_primary": false,
          "rating": 4.3,
          "specialties": ["티오람 미니", "휴젠뜨"]
        }
      ]
    }
  }
}
```

---

### 3. Kakao Messenger

카카오 알림톡 및 SMS 발송을 처리합니다.

**kakao-messenger/index.ts:**

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const server = new Server(
  { name: "kakao-messenger", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Tool 정의
const tools = [
  {
    name: "send_alimtalk",
    description: "카카오 알림톡을 발송합니다",
    inputSchema: {
      type: "object",
      properties: {
        template_code: {
          type: "string",
          enum: ["TECH_ASSIGN", "ORDER_CONFIRM", "PAYMENT_REQUEST", "INSTALL_COMPLETE"],
          description: "알림톡 템플릿 코드"
        },
        recipient_phone: {
          type: "string",
          description: "수신자 전화번호"
        },
        variables: {
          type: "object",
          description: "템플릿 변수 (키-값)"
        }
      },
      required: ["template_code", "recipient_phone", "variables"]
    }
  },
  {
    name: "send_sms",
    description: "SMS를 발송합니다 (알림톡 실패 시 Fallback)",
    inputSchema: {
      type: "object",
      properties: {
        recipient_phone: { type: "string" },
        message: { type: "string", maxLength: 90 }
      },
      required: ["recipient_phone", "message"]
    }
  }
];

// 알림톡 템플릿
const templates = {
  TECH_ASSIGN: {
    title: "설치 배정 안내",
    content: `[홈앤뚝딱] 설치 배정 안내

■ 고객정보
- 고객명: #{customer_name}
- 연락처: #{customer_phone}
- 주소: #{address}

■ 설치정보  
- 상품: #{product}
- 희망일: #{date} #{time_slot}
- 설치비: #{fee}원

■ 특이사항
#{notes}

※ 일정 확인 후 고객에게 연락 부탁드립니다.`,
    buttons: [
      { type: "WL", name: "일정확인", url: "#{schedule_url}" },
      { type: "WL", name: "일정변경", url: "#{change_url}" }
    ]
  },
  
  ORDER_CONFIRM: {
    title: "주문 접수 완료",
    content: `[홈앤뚝딱] 주문이 접수되었습니다.

■ 주문정보
- 주문번호: #{order_id}
- 상품: #{product}
- 설치희망일: #{date}

■ 결제안내
- 결제금액: #{total_amount}원
- 입금계좌: #{bank_account}

입금 확인 후 기사님이 배정됩니다.
문의: 1588-XXXX`,
    buttons: [
      { type: "WL", name: "주문조회", url: "#{order_url}" }
    ]
  }
};

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "send_alimtalk") {
    return await sendAlimtalk(args);
  }
  
  if (name === "send_sms") {
    return await sendSms(args);
  }
});

async function sendAlimtalk(args: AlimtalkArgs): Promise<SendResult> {
  const template = templates[args.template_code];
  
  // 변수 치환
  let content = template.content;
  for (const [key, value] of Object.entries(args.variables)) {
    content = content.replace(new RegExp(`#\\{${key}\\}`, 'g'), value);
  }
  
  // 카카오 비즈메시지 API 호출
  try {
    const response = await fetch('https://api-alimtalk.kakao.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KAKAO_API_KEY}`
      },
      body: JSON.stringify({
        template_code: args.template_code,
        recipient_phone: args.recipient_phone,
        content: content,
        buttons: template.buttons
      })
    });
    
    if (!response.ok) {
      // 실패 시 SMS Fallback
      return await sendSms({
        recipient_phone: args.recipient_phone,
        message: content.slice(0, 90)
      });
    }
    
    return {
      success: true,
      channel: "alimtalk",
      message_id: (await response.json()).message_id
    };
    
  } catch (error) {
    return await sendSms({
      recipient_phone: args.recipient_phone,
      message: content.slice(0, 90)
    });
  }
}

async function sendSms(args: SmsArgs): Promise<SendResult> {
  // NHN Cloud SMS API 호출
  const response = await fetch('https://api-sms.nhncloud.com/v2.0/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Secret-Key': process.env.NHN_SMS_SECRET
    },
    body: JSON.stringify({
      recipient: args.recipient_phone,
      body: args.message,
      sender: process.env.SMS_SENDER_NUMBER
    })
  });
  
  return {
    success: response.ok,
    channel: "sms",
    message_id: (await response.json()).message_id
  };
}
```

---

## 🤖 Agent 설계

### Agent 1: 주문 접수 Agent

**agents/order-intake/system_prompt.md:**

```markdown
# 홈앤뚝딱 주문 접수 Agent

## 역할
카카오톡 채널봇을 통해 고객의 주문을 접수하고 Notion DB에 저장합니다.

## 사용 가능한 Tools
1. `notion_create_order` - 주문 생성
2. `extract_region` - 주소에서 지역 추출
3. `send_alimtalk` - 고객 확인 메시지 발송

## 대화 흐름

### 1단계: 인사 및 메뉴 안내
"안녕하세요! 홈앤뚝딱입니다 🏠
무엇을 도와드릴까요?

1️⃣ 설치 예약
2️⃣ 상품 문의  
3️⃣ 배송 조회
4️⃣ AS 문의"

### 2단계: 정보 수집 (설치 예약 선택 시)
순차적으로 다음 정보를 수집합니다:

1. **고객명**
   "설치 예약을 도와드릴게요! 먼저 고객님 성함을 알려주세요."
   
2. **연락처**
   "연락 가능한 전화번호를 알려주세요. (예: 010-1234-5678)"
   - 형식 검증: 010으로 시작하는 11자리
   
3. **설치 주소**
   "설치할 주소를 알려주세요. (시/도부터 상세주소까지)"
   - 주소 검증 후 지역코드 추출
   
4. **상품 선택**
   "어떤 제품을 설치하시나요?
   
   🔹 음식물처리기
   • 티오람 미니 (12만원~)
   • 휴젠뜨 노바 (15만원~)
   • 휴젠뜨3 (18만원~)
   
   🔹 싱크볼/수전 패키지
   • 스탠다드 패키지 (39만원~)
   • 프리미엄 패키지 (59만원~)"
   
5. **설치 희망일**
   "설치 희망 날짜를 선택해주세요."
   - 오늘 이후 날짜만 허용
   - 일요일 제외
   
6. **희망 시간대**
   "희망하시는 시간대를 선택해주세요.
   • 오전 (9시~12시)
   • 오후 (12시~18시)  
   • 저녁 (18시~21시)"
   
7. **추가 요청사항**
   "추가로 요청하실 사항이 있으시면 말씀해주세요. (없으시면 '없음')"

### 3단계: 확인 및 접수
"입력하신 정보를 확인해주세요.

📋 주문 정보
━━━━━━━━━━━━━━━━
• 고객명: {customer_name}
• 연락처: {phone}
• 주소: {address}
• 상품: {products}
• 희망일: {date} {time}
• 요청사항: {notes}
━━━━━━━━━━━━━━━━

위 내용이 맞으시면 [확인]을, 수정이 필요하시면 [수정]을 눌러주세요."

### 4단계: 접수 완료
Tool 호출: `notion_create_order`
Tool 호출: `send_alimtalk` (ORDER_CONFIRM 템플릿)

"✅ 주문이 접수되었습니다!

📌 주문번호: {order_id}

💳 결제 안내
• 금액: {total}원
• 계좌: 신한은행 110-XXX-XXXXXX (홈앤뚝딱)

입금 확인 후 설치 기사님이 배정되며, 
배정 완료 시 다시 안내드리겠습니다.

문의: 카카오톡 채널 또는 1588-XXXX"

## 예외 처리
- 지역 추출 실패: "죄송합니다. 주소를 인식하지 못했어요. 시/도부터 다시 입력해주세요."
- 서비스 불가 지역: "죄송합니다. 현재 해당 지역은 서비스 준비 중입니다."
- 희망일 당일/과거: "설치는 최소 1일 전에 예약해주셔야 해요. 다른 날짜를 선택해주세요."
```

---

### Agent 2: 기사 배정 Agent

**agents/technician-dispatch/system_prompt.md:**

```markdown
# 홈앤뚝딱 기사 배정 Agent

## 역할
신규 주문에 적합한 설치 기사를 자동으로 배정하고 알림을 발송합니다.

## 트리거
- Notion 주문 DB에 새 레코드 생성 시 (상태: 접수완료)
- 입금 확인 시

## 사용 가능한 Tools
1. `extract_region` - 주문 주소에서 지역코드 추출
2. `notion_query_technicians` - 조건에 맞는 기사 조회
3. `match_technician` - 최적 기사 매칭
4. `notion_update_order` - 주문에 기사 배정
5. `send_alimtalk` - 기사에게 알림 발송
6. `send_sms` - SMS 발송 (Fallback)

## 배정 워크플로우

### Step 1: 지역 추출
```
input: order.address
tool: extract_region
output: region_code, confidence
```

### Step 2: 기사 후보 조회
```
input: region_code, order.preferred_date, order.products
tool: match_technician  
output: ranked_candidates[]
```

### Step 3: 배정 결정
우선순위 로직:
1. 지역 정확도 (동/읍/면 일치) - 가중치 3
2. 상품 전문성 - 가중치 2
3. 평점 4.5 이상 - 가중치 2
4. 당일 배정 건수 3건 미만 - 가중치 1

### Step 4: 배정 및 알림
```
tool: notion_update_order
  - assigned_technician_id: selected.id
  - status: "기사배정"
  - installation_fee: calculated_fee

tool: send_alimtalk
  - template: TECH_ASSIGN
  - recipient: technician.phone
  - variables: order_details
```

### Step 5: 고객 알림
```
tool: send_alimtalk
  - template: TECH_ASSIGNED_CUSTOMER
  - recipient: order.customer_phone
  - variables: technician_info, schedule
```

## 예외 처리

### 배정 가능 기사 없음
1. 관리자에게 Slack/카톡 알림
2. 주문 상태: "배정대기"
3. 고객에게 지연 안내 메시지

### 알림톡 발송 실패
1. SMS Fallback 자동 실행
2. 3회 실패 시 관리자 알림

### 기사 일정 충돌
1. 차순위 기사로 자동 재배정
2. 모든 후보 충돌 시 관리자 에스컬레이션
```

---

### Agent 3: 정산 관리 Agent

**agents/settlement/system_prompt.md:**

```markdown
# 홈앤뚝딱 정산 관리 Agent

## 역할
입금 확인, 주문-입금 매칭, 정산 처리를 자동화합니다.

## 트리거
1. 토스페이먼츠 웹훅 (가상계좌 입금)
2. 정기 계좌 조회 (5분 간격)
3. 관리자 수동 트리거

## 사용 가능한 Tools
1. `verify_payment` - 입금 정보 검증
2. `match_deposit` - 입금-주문 매칭
3. `notion_update_order` - 주문 상태 업데이트
4. `send_alimtalk` - 알림 발송
5. `create_settlement_record` - 정산 기록 생성

## 입금 매칭 로직

### 매칭 우선순위
1. **가상계좌 매칭** (정확도 100%)
   - 주문별 발급된 가상계좌로 입금 시 자동 매칭

2. **입금자명 + 금액 매칭** (정확도 90%)
   - 입금자명이 고객명과 일치
   - 금액이 주문 금액과 정확히 일치

3. **금액 + 시간 매칭** (정확도 70%)
   - 금액 일치
   - 최근 24시간 내 접수된 미입금 주문

4. **부분 매칭** (수동 확인 필요)
   - 위 조건 불충족 시 관리자 알림

### 매칭 실패 처리
```
if matching_confidence < 0.7:
    1. 관리자에게 Slack 알림
    2. 후보 주문 목록 제시
    3. 수동 매칭 UI 링크 제공
```

## 워크플로우

### 입금 확인 시
```
1. 웹훅/조회로 입금 정보 수신
2. match_deposit 실행
3. if 매칭 성공:
     - notion_update_order (payment_confirmed: true)
     - 기사 배정 Agent 트리거
     - 고객에게 입금 확인 알림
4. if 매칭 실패:
     - 관리자 알림
     - 매칭 대기 상태로 보관
```

### 설치 완료 후 정산
```
1. 기사 설치 완료 보고 수신
2. 정산 금액 계산
   - 설치비 = 기사별 단가 × 수량
   - 추가작업비 = 실비 정산
3. create_settlement_record
4. 월말 일괄 정산 처리
```
```

---

## ⚙️ Claude Code 프로젝트 설정

**.claude/settings.json:**

```json
{
  "name": "홈앤뚝딱 자동화",
  "description": "주문-배정-정산 통합 자동화 시스템",
  
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    },
    "region-matcher": {
      "command": "node",
      "args": ["./mcp-servers/region-matcher/dist/index.js"]
    },
    "kakao-messenger": {
      "command": "node", 
      "args": ["./mcp-servers/kakao-messenger/dist/index.js"],
      "env": {
        "KAKAO_API_KEY": "${KAKAO_API_KEY}",
        "NHN_SMS_SECRET": "${NHN_SMS_SECRET}",
        "SMS_SENDER_NUMBER": "${SMS_SENDER_NUMBER}"
      }
    }
  },
  
  "context": {
    "files": [
      "data/region_mapping.json",
      "data/product_catalog.json",
      "docs/business_rules.md"
    ],
    "always_include": [
      "agents/order-intake/system_prompt.md"
    ]
  },
  
  "permissions": {
    "tools": ["notion_*", "extract_region", "send_*"],
    "file_access": ["data/*", "docs/*"]
  }
}
```

---

## 🚀 개발 순서

### Week 1: 기반 구축
1. [ ] Notion DB 스키마 설계 및 생성
2. [ ] region_mapping.json 데이터 정리
3. [ ] 카카오 채널봇 개설 및 기본 설정

### Week 2: MCP 서버 개발
1. [ ] region-matcher 서버 개발
2. [ ] notion-connector 커스텀 Tool 추가
3. [ ] 단위 테스트

### Week 3: Agent 개발
1. [ ] 주문 접수 Agent 프롬프트 작성
2. [ ] 기사 배정 Agent 로직 구현
3. [ ] 통합 테스트

### Week 4: 메시징 연동
1. [ ] 카카오 알림톡 API 연동
2. [ ] SMS Fallback 구현
3. [ ] 템플릿 등록 및 검수

### Week 5: 결제 연동
1. [ ] 토스페이먼츠 가상계좌 연동
2. [ ] 정산 관리 Agent 구현
3. [ ] 입금 매칭 로직 테스트

### Week 6: 안정화
1. [ ] E2E 테스트
2. [ ] 에러 처리 강화
3. [ ] 모니터링 설정
4. [ ] 문서화

---

## 📌 주요 환경변수

```env
# Notion
NOTION_API_KEY=secret_xxxxxxxxxxxxx
ORDER_DB_ID=xxxxx
TECHNICIAN_DB_ID=xxxxx
SCHEDULE_DB_ID=xxxxx

# Kakao
KAKAO_API_KEY=xxxxx
KAKAO_SENDER_KEY=xxxxx

# NHN Cloud SMS
NHN_SMS_APP_KEY=xxxxx
NHN_SMS_SECRET=xxxxx
SMS_SENDER_NUMBER=02-XXXX-XXXX

# Toss Payments
TOSS_CLIENT_KEY=xxxxx
TOSS_SECRET_KEY=xxxxx

# 관리자 알림
ADMIN_SLACK_WEBHOOK=https://hooks.slack.com/...
ADMIN_PHONE=010-XXXX-XXXX
```

---

*이 가이드를 기반으로 Claude Code에서 순차적으로 개발을 진행하면 됩니다.*
