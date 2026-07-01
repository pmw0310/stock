import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

/**
 * 키움증권 계좌번호조회 (ka00001) 응답 DTO 클래스입니다.
 */
export class Ka00001ResponseDto {
  /**
   * 계좌번호 (10자리 숫자)
   */
  @IsString()
  @IsNotEmpty()
  acctNo: string;

  /**
   * 결과코드 (0: 정상)
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
