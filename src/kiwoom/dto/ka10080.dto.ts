import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KiwoomBaseResponseDto } from './kiwoom-base-response.dto';

/**
 * 키움증권 주식분봉차트조회요청 (ka10080) 요청 DTO 클래스입니다.
 */
export class Ka10080RequestDto {
  /**
   * 종목코드
   */
  @IsString()
  @IsNotEmpty()
  stkCd: string;

  /**
   * 틱범위 (1:1분, 3:3분, 5:5분, 10:10분, 15:15분, 30:30분, 45:45분, 60:60분)
   */
  @IsString()
  @IsNotEmpty()
  ticScope: string;

  /**
   * 수정주가구분 (0 or 1)
   */
  @IsString()
  @IsNotEmpty()
  updStkpcTp: string;

  /**
   * 기준일자 (YYYYMMDD)
   */
  @IsString()
  @IsOptional()
  baseDt?: string;
}

/**
 * 주식분봉차트조회요청 (ka10080) 분봉 데이터 아이템 DTO 클래스입니다.
 */
export class Ka10080ChartItemDto {
  /** 현재가(종가) */
  @IsString()
  @IsOptional()
  curPrc?: string;

  /** 거래량 */
  @IsString()
  @IsOptional()
  trdeQty?: string;

  /** 체결시간 */
  @IsString()
  @IsOptional()
  cntrTm?: string;

  /** 시가 */
  @IsString()
  @IsOptional()
  openPric?: string;

  /** 고가 */
  @IsString()
  @IsOptional()
  highPric?: string;

  /** 저가 */
  @IsString()
  @IsOptional()
  lowPric?: string;

  /** 전일대비 */
  @IsString()
  @IsOptional()
  predPre?: string;

  /** 전일대비 기호 */
  @IsString()
  @IsOptional()
  predPreSig?: string;
}

/**
 * 키움증권 주식분봉차트조회요청 (ka10080) 응답 DTO 클래스입니다.
 */
export class Ka10080ResponseDto extends KiwoomBaseResponseDto {
  /**
   * 종목코드
   */
  @IsString()
  @IsOptional()
  stkCd?: string;

  /**
   * 주식분봉차트조회 배열
   */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Ka10080ChartItemDto)
  stkMinPoleChartQry?: Ka10080ChartItemDto[];
}
