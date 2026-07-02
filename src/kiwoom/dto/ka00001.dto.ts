import { IsString, IsNotEmpty } from 'class-validator';
import { KiwoomBaseResponseDto } from './kiwoom-base-response.dto';

/**
 * 키움증권 계좌번호조회 (ka00001) 응답 DTO 클래스입니다.
 */
export class Ka00001ResponseDto extends KiwoomBaseResponseDto {
  /**
   * 계좌번호 (10자리 숫자)
   */
  @IsString()
  @IsNotEmpty()
  acctNo: string;
}
