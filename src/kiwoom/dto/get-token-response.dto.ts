import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 키움증권 접근 토큰 발급 응답을 위한 DTO 클래스입니다.
 */
export class GetTokenResponseDto {
  /**
   * 토큰 만료 일시
   */
  @IsString()
  @IsNotEmpty()
  expires_dt: string;

  /**
   * 토큰 타입 (예: Bearer)
   */
  @IsString()
  @IsNotEmpty()
  token_type: string;

  /**
   * 발급된 접근 토큰
   */
  @IsString()
  @IsNotEmpty()
  token: string;
}
