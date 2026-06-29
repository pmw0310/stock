import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 국내주식 거래대금 상위 요청 DTO입니다.
 */
export class Ka10032RequestDto {
  /**
   * 시장구분 000:전체, 001:코스피, 101:코스닥
   */
  @IsString()
  @IsNotEmpty()
  mrktTp: string;

  /**
   * 관리종목포함 0:관리종목 미포함, 1:관리종목 포함
   */
  @IsString()
  @IsNotEmpty()
  mangStkIncls: string;

  /**
   * 거래소구분 1:KRX, 2:NXT 3.통합
   */
  @IsString()
  @IsNotEmpty()
  stexTp: string;
}
