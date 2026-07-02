import { IsString, IsNotEmpty } from 'class-validator';
import { KiwoomBaseResponseDto } from './kiwoom-base-response.dto';

/**
 * 키움증권 접근 토큰 발급 요청을 위한 DTO 클래스입니다.
 */
export class Au10001RequestDto {
  /**
   * 권한 부여 타입 (기본값: 'client_credentials')
   */
  @IsString()
  @IsNotEmpty()
  grantType: string;

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

/**
 * 키움증권 접근 토큰 발급 응답을 위한 DTO 클래스입니다.
 */
export class Au10001ResponseDto extends KiwoomBaseResponseDto {
  /**
   * 토큰 만료 일시
   */
  @IsString()
  @IsNotEmpty()
  expiresDt: string;

  /**
   * 토큰 타입 (예: Bearer)
   */
  @IsString()
  @IsNotEmpty()
  tokenType: string;

  /**
   * 발급된 접근 토큰
   */
  @IsString()
  @IsNotEmpty()
  token: string;
}
