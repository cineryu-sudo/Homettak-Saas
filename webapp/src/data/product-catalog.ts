export interface ProductCatalogItem {
  name: string;
  price: number;
  category?: string;
}

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  { name: "고니 8630", price: 196000, category: "인셋" },
  { name: "고니 8830", price: 230000, category: "인셋" },
  { name: "고니 9030", price: 230000, category: "인셋" },
  { name: "고니 9530", price: 260000, category: "인셋" },
  { name: "고니9830", price: 260000, category: "인셋" },
  { name: "백조 ceswsr8635", price: 318000, category: "인셋" },
  { name: "백조 ceswsr9835", price: 370000 },
  { name: "백조 CESWSR9035", price: 355000 },
  { name: "백조 깜뽀르테 8535", price: 570000, category: "인셋" },
  { name: "백조 깜뽀르테 9835", price: 620000, category: "인셋" },
  { name: "백조 깜뽀 830", price: 545000, category: "언더" },
  { name: "백조 콰이어트 860", price: 255000, category: "언더" },
  { name: "백조 깜뽀 860", price: 370000, category: "언더" },
  { name: "깜뽀960", price: 412000, category: "언더" },
  { name: "고니 8310", price: 175000, category: "언더" },
  { name: "백조레코85 워터풀", price: 523000, category: "무엠보" },
  { name: "레코85", price: 443000 },
  { name: "OKEE 벨라고 ESQL757", price: 270000 },
  { name: "OKEE 벨라고 ESQL858", price: 330000 },
  { name: "OKEE 벨라고 ESQL905", price: 352000 },
  { name: "OKEE 벨라고 ESQL940", price: 363000 },
  { name: "OKEE 벨라고 ESQL955", price: 363000 },
  { name: "OKEE 벨라고 ESQL990", price: 374000 },
  { name: "벨라고 세레니티 858", price: 480000 },
  { name: "벨라고 세레니티 880", price: 490000 },
  { name: "벨라고 세레니티 990", price: 530000 },
  { name: "아티잔 EDU757", price: 330000, category: "인셋" },
  { name: "아티잔 EDU858", price: 330000 },
  { name: "아티잔 EDU882", price: 341000 },
  { name: "아티잔 EDU900", price: 341000 },
  { name: "아티잔 EDU953", price: 363000 },
  { name: "아티잔 EDU982", price: 374000 },
  { name: "아티잔 PEDU858", price: 385000, category: "인셋" },
  { name: "아티잔 PEDU882", price: 407000, category: "포켓" },
  { name: "아티잔 PEDU900", price: 407000 },
  { name: "아티잔 PEDU953", price: 440000 },
  { name: "아티잔 PEDU982", price: 462000 },
  { name: "심리스 아티잔 ESD 858", price: 473000, category: "인셋" },
  { name: "심리스 아티잔 ESD 882", price: 495000 },
  { name: "심리스 아티잔 ESD 953", price: 517000 },
  { name: "심리스 아티잔 ESD 982", price: 539000 },
  { name: "아티잔 네오녹스 RT858", price: 253000 },
  { name: "아티잔 네오녹스 RT882", price: 275000 },
  { name: "아티잔 네오녹스 RT953", price: 297000 },
  { name: "아티잔 네오녹스 RT982", price: 319000 },
  { name: "한샘 엠시스 85 (바닥엠보+전체코팅)", price: 275000 },
  { name: "한샘 엠시스 85(올엠보+올코팅)", price: 308000 },
  { name: "한샘 엠시스 97(올엠보+올코팅)", price: 352000 },
  { name: "아뜰리에 노아 858 (트랜드)", price: 270000 },
  { name: "한스 sqj850eec", price: 300000 },
  { name: "코리나엠보 858", price: 220000 },
  { name: "디어860", price: 180000, category: "인셋" },
  { name: "디어970", price: 230000 },
  { name: "리젠스 GQEN7403", price: 255000 },
  { name: "리젠스 GQEN8603", price: 210000 },
  { name: "리젠스 GQEN9003", price: 318000 },
  { name: "리젠스 GQEN9403", price: 340000 },
  { name: "리젠스 GQEN9803", price: 305000 },
  { name: "백조 고니8630+g7", price: 283000, category: "스탠다드 패키지" },
  { name: "디어 860 + g7", price: 258000, category: "스탠다드 패키지" },
  { name: "아티잔 pedu858+ek3001", price: 497400 },
  { name: "아티잔 심리스 esd858+ek3001", price: 538000 },
  { name: "아티잔 edu858+ek3001", price: 456600, category: "시크니처 패키지" },
  { name: "벨라고 ESQL858 + ek-3001", price: 395000, category: "시크니처 패키지" },
  { name: "백조8635+루미노바 lv-18000", price: 528000, category: "시크니처 패키지" },
  { name: "백조 깜뽀르테 8535+루미노바 lv-18000", price: 735000, category: "프리미엄 패키지" },
  { name: "리젠스 gqen8603 + 카시아 g7", price: 288000, category: "리젠스 패키지" },
  { name: "아티잔 네오녹스 RT858 + 카시아 g7", price: 301000, category: "네오녹스 패키지" },
];

export const DEFAULT_PRODUCT = PRODUCT_CATALOG[0];
export const DEFAULT_PRODUCT_PRICE = DEFAULT_PRODUCT?.price ?? 0;

function normalizeProductName(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

const PRODUCT_BY_NAME = new Map(
  PRODUCT_CATALOG.map((item) => [normalizeProductName(item.name), item]),
);

export function findProductByName(name?: string | null) {
  if (!name) return undefined;
  return PRODUCT_BY_NAME.get(normalizeProductName(name));
}
