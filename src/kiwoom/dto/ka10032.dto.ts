import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 국내주식 거래대금 상위 요청을 위한 DTO 클래스입니다.
 */
export class Ka10032RequestDto {
  /**
   * 시장구분 (000:전체, 001:코스피, 101:코스닥)
   */
  @IsString()
  @IsNotEmpty()
  mrktTp: string;

  /**
   * 관리종목포함 여부 (0:관리종목 미포함, 1:관리종목 포함)
   */
  @IsString()
  @IsNotEmpty()
  mangStkIncls: string;

  /**
   * 거래소구분 (1:KRX, 2:NXT, 3:통합)
   */
  @IsString()
  @IsNotEmpty()
  stexTp: string;
}

/**
 * 국내주식 거래대금 상위 응답 리스트의 개별 종목 항목 정보를 나타내는 클래스입니다.
 */
export class StockRankItem {
  /**
   * 종목 고유 코드
   */
  stkCd: string;

  /**
   * 당일 실시간 순위
   */
  nowRank: string;

  /**
   * 전일 최종 순위
   */
  predRank: string;

  /**
   * 종목명
   */
  stkNm: string;

  /**
   * 현재가 (단위: 원, 부호 포함 숫자)
   */
  curPrc: string;

  /**
   * 전일대비기호 (1: 상한가, 2:상승, 3:보합, 4:하한가, 5:하락)
   */
  predPreSig: string;

  /**
   * 전일대비 금액 (단위: 원, 부호 포함 숫자)
   */
  predPre: string;

  /**
   * 등락률 (단위: %, 부호 포함 소수점 둘째 자리까지 포맷된 백분율)
   */
  fluRt: string;

  /**
   * 매도호가 (단위: 원, 부호 포함 숫자)
   */
  selBid: string;

  /**
   * 매수호가 (단위: 원, 부호 포함 숫자)
   */
  buyBid: string;

  /**
   * 현재거래량 (단위: 1주)
   */
  nowTrdeQty: string;

  /**
   * 전일거래량 (단위: 1주)
   */
  predTrdeQty: string;

  /**
   * 거래대금 (단위: 백만원)
   */
  trdePrica: string;
}

/**
 * 국내주식 거래대금 상위 응답을 위한 DTO 클래스입니다.
 */
export class Ka10032ResponseDto {
  /**
   * 결과코드 (0: 정상)
   */
  returnCode: number;

  /**
   * 결과메시지
   */
  returnMsg: string;

  /**
   * 거래대금 상위 종목 리스트 묶음
   */
  trdePricaUpper: StockRankItem[];
}
