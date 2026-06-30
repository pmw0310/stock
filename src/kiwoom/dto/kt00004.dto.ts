import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

/**
 * 키움증권 계좌평가현황요청 (kt00004) 요청 DTO 클래스입니다.
 */
export class Kt00004RequestDto {
  /**
   * 상장폐지조회구분 (0: 전체, 1: 상장폐지종목제외)
   */
  @IsString()
  @IsNotEmpty()
  @IsIn(['0', '1'])
  qryTp: '0' | '1';

  /**
   * 국내거래소구분 (KRX: 한국거래소, NXT: 넥스트트레이드)
   */
  @IsString()
  @IsNotEmpty()
  @IsIn(['KRX', 'NXT'])
  dmstStexTp: 'KRX' | 'NXT';
}

/**
 * 키움증권 계좌평가현황요청 (kt00004) 응답 리스트의 개별 종목 정보를 나타내는 클래스입니다.
 */
export class StkAcntEvltPrstItem {
  /**
   * 종목코드 (접두어 1자리 + 종목코드 6자리)
   */
  @IsString()
  stkCd: string;

  /**
   * 종목명
   */
  @IsString()
  stkNm: string;

  /**
   * 보유수량
   */
  @IsString()
  rmndQty: string;

  /**
   * 평균단가
   */
  @IsString()
  avgPrc: string;

  /**
   * 현재가
   */
  @IsString()
  curPrc: string;

  /**
   * 평가금액
   */
  @IsString()
  evltAmt: string;

  /**
   * 손익금액
   */
  @IsString()
  plAmt: string;

  /**
   * 손익율
   */
  @IsString()
  plRt: string;

  /**
   * 대출일 (YYYYMMDD 형식, 신용/대출 아닐 시 공백)
   */
  @IsString()
  loanDt: string;

  /**
   * 매입금액
   */
  @IsString()
  purAmt: string;

  /**
   * 결제잔고
   */
  @IsString()
  setlRemn: string;

  /**
   * 전일매수수량
   */
  @IsString()
  predBuyq: string;

  /**
   * 전일매도수량
   */
  @IsString()
  predSellq: string;

  /**
   * 금일매수수량
   */
  @IsString()
  tdyBuyq: string;

  /**
   * 금일매도수량
   */
  @IsString()
  tdySellq: string;
}

/**
 * 키움증권 계좌평가현황요청 (kt00004) 응답 DTO 클래스입니다.
 */
export class Kt00004ResponseDto {
  /**
   * 결과코드 (0: 정상, 이외의 숫자: 에러)
   */
  returnCode: number;

  /**
   * 결과메시지
   */
  returnMsg: string;

  /**
   * 계좌명
   */
  @IsString()
  @IsOptional()
  acntNm?: string;

  /**
   * 지점명
   */
  @IsString()
  @IsOptional()
  brchNm?: string;

  /**
   * 예수금
   */
  @IsString()
  @IsOptional()
  entr?: string;

  /**
   * D+2추정예수금
   */
  @IsString()
  @IsOptional()
  d2Entra?: string;

  /**
   * 유가잔고평가액
   */
  @IsString()
  @IsOptional()
  totEstAmt?: string;

  /**
   * 예탁자산평가액
   */
  @IsString()
  @IsOptional()
  asetEvltAmt?: string;

  /**
   * 총매입금액
   */
  @IsString()
  @IsOptional()
  totPurAmt?: string;

  /**
   * 추정예탁자산
   */
  @IsString()
  @IsOptional()
  prsmDpstAsetAmt?: string;

  /**
   * 매도담보대출금
   */
  @IsString()
  @IsOptional()
  totGrntSella?: string;

  /**
   * 당일투자원금
   */
  @IsString()
  @IsOptional()
  tdyLspftAmt?: string;

  /**
   * 당월투자원금
   */
  @IsString()
  @IsOptional()
  invtBsamt?: string;

  /**
   * 누적투자원금
   */
  @IsString()
  @IsOptional()
  lspftAmt?: string;

  /**
   * 당일투자손익
   */
  @IsString()
  @IsOptional()
  tdyLspft?: string;

  /**
   * 당월투자손익
   */
  @IsString()
  @IsOptional()
  lspft2?: string;

  /**
   * 누적투자손익
   */
  @IsString()
  @IsOptional()
  lspft?: string;

  /**
   * 당일손익율
   */
  @IsString()
  @IsOptional()
  tdyLspftRt?: string;

  /**
   * 당월손익율
   */
  @IsString()
  @IsOptional()
  lspftRatio?: string;

  /**
   * 누적손익율
   */
  @IsString()
  @IsOptional()
  lspftRt?: string;

  /**
   * 종목별계좌평가현황 리스트
   */
  @IsOptional()
  stkAcntEvltPrst?: StkAcntEvltPrstItem[];
}
