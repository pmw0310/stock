import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
} from 'class-validator';

/**
 * 키움증권 주식 매수주문 (kt10000) 요청 DTO 클래스입니다.
 */
export class Kt10000RequestDto {
  /**
   * 국내거래소구분 (KRX, NXT, SOR)
   */
  @IsString()
  @IsNotEmpty()
  @IsIn(['KRX', 'NXT', 'SOR'])
  dmstStexTp: 'KRX' | 'NXT' | 'SOR';

  /**
   * 6자리 종목코드
   */
  @IsString()
  @IsNotEmpty()
  stkCd: string;

  /**
   * 주문수량 (주 단위 숫자를 문자열로 입력)
   */
  @IsString()
  @IsNotEmpty()
  ordQty: string;

  /**
   * 주문가격 (시장가 관련 옵션 사용 시에는 반드시 "" 입력)
   */
  @IsString()
  ordUv: string;

  /**
   * 매매구분 (0:보통, 3:시장가, 5:조건부지정가, 81:장마감후시간외, 61:장시작전시간외, 62:시간외단일가, 6:최유리지정가, 7:최우선지정가, 10:보통(IOC), 13:시장가(IOC), 16:최유리(IOC), 20:보통(FOK), 23:시장가(FOK), 26:최유리(FOK), 28:스톱지정가, 29:중간가, 30:중간가(IOC), 31:중간가(FOK))
   */
  @IsString()
  @IsNotEmpty()
  @IsIn([
    '0',
    '3',
    '5',
    '81',
    '61',
    '62',
    '6',
    '7',
    '10',
    '13',
    '16',
    '20',
    '23',
    '26',
    '28',
    '29',
    '30',
    '31',
  ])
  trdeTp:
    | '0'
    | '3'
    | '5'
    | '81'
    | '61'
    | '62'
    | '6'
    | '7'
    | '10'
    | '13'
    | '16'
    | '20'
    | '23'
    | '26'
    | '28'
    | '29'
    | '30'
    | '31';

  /**
   * 조건단가
   */
  @IsString()
  @IsOptional()
  condUv?: string;
}

/**
 * 키움증권 주식 매수주문 (kt10000) 응답 DTO 클래스입니다.
 */
export class Kt10000ResponseDto {
  /**
   * 주문번호
   */
  @IsString()
  @IsOptional()
  ordNo?: string;

  /**
   * 실제 주문이 처리된 거래소 구분 (KRX, NXT, SOR)
   */
  @IsString()
  @IsOptional()
  @IsIn(['KRX', 'NXT', 'SOR'])
  dmstStexTp?: 'KRX' | 'NXT' | 'SOR';

  /**
   * 결과코드 (0: 정상 접수, 이외의 숫자: 에러)
   */
  @IsNumber()
  @IsNotEmpty()
  returnCode: number;

  /**
   * 결과메시지
   */
  @IsString()
  @IsNotEmpty()
  returnMsg: string;
}
