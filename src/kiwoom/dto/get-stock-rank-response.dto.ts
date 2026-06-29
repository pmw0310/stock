/**
 * 국내주식 거래대금 상위 응답 항목 DTO입니다.
 */
export class StockRankItem {
  stkCd: string;
  nowRank: string;
  predRank: string;
  stkNm: string;
  curPrc: string;
  predPreSig: string;
  predPre: string;
  fluRt: string;
  selBid: string;
  buyBid: string;
  nowTrdeQty: string;
  predTrdeQty: string;
  trdePrica: string;
}

/**
 * 국내주식 거래대금 상위 응답 DTO입니다.
 */
export class GetStockRankResponseDto {
  trdePricaUpper: StockRankItem[];
}
