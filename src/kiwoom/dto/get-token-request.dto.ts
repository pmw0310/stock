import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 키움증권 접근 토큰 발급 요청을 위한 DTO 클래스입니다.
 */
export class GetTokenRequestDto {
  /**
   * 권한 부여 타입 (기본값: 'client_credentials')
   */
  @IsString()
  @IsNotEmpty()
  grant_type: string;

  /**
   * 키움증권 API 앱 키
   */
  @IsString()
  @IsNotEmpty()
  appkey: string;

  /**
   * 키움증권 API 시크릿 키
   */
  @IsString()
  @IsNotEmpty()
  secretkey: string;
}
