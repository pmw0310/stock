import { IsString, IsNotEmpty } from 'class-validator';
import { KiwoomBaseResponseDto } from './kiwoom-base-response.dto';

/**
 * 국내주식 실시간종목조회순위요청(ka00198)을 위한 DTO 클래스입니다.
 */
export class Ka00198RequestDto {
  @IsString()
  @IsNotEmpty()
  qryTp: string;
}

/**
 * 국내주식 실시간종목조회순위 응답 리스트의 개별 종목 항목 정보
 */
export class Ka00198ResponseItem {
  stkNm: string;
  bigdRank: string;
  rankChg: string;
  rankChgSign: string;
  pastCurrPrc: string;
  baseCompSign: string;
  baseCompChgr: string;
  prevBaseSign: string;
  prevBaseChgr: string;
  dt: string;
  tm: string;
  stkCd: string;
}

/**
 * 국내주식 실시간종목조회순위 응답을 위한 DTO 클래스입니다.
 */
export class Ka00198ResponseDto extends KiwoomBaseResponseDto {
  itemInqRank: Ka00198ResponseItem[];
}
