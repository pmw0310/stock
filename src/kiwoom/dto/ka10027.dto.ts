import { IsString, IsNotEmpty } from 'class-validator';
import { KiwoomBaseResponseDto } from './kiwoom-base-response.dto';

/**
 * 국내주식 전일대비등락률상위요청을 위한 DTO 클래스입니다.
 */
export class Ka10027RequestDto {
  @IsString()
  @IsNotEmpty()
  mrktTp: string;

  @IsString()
  @IsNotEmpty()
  sortTp: string;

  @IsString()
  @IsNotEmpty()
  trdeQtyCnd: string;

  @IsString()
  @IsNotEmpty()
  stkCnd: string;

  @IsString()
  @IsNotEmpty()
  crdCnd: string;

  @IsString()
  @IsNotEmpty()
  updownIncls: string;

  @IsString()
  @IsNotEmpty()
  pricCnd: string;

  @IsString()
  @IsNotEmpty()
  trdePricaCnd: string;

  @IsString()
  @IsNotEmpty()
  stexTp: string;
}

/**
 * 국내주식 전일대비등락률상위 응답 리스트의 개별 종목 항목 정보
 */
export class Ka10027ResponseItem {
  stkCls: string;
  stkCd: string;
  stkNm: string;
  curPrc: string;
  predPreSig: string;
  predPre: string;
  fluRt: string;
  selReq: string;
  buyReq: string;
  nowTrdeQty: string;
  cntrStr: string;
  cnt: string;
}

/**
 * 국내주식 전일대비등락률상위 응답을 위한 DTO 클래스입니다.
 */
export class Ka10027ResponseDto extends KiwoomBaseResponseDto {
  predPreFluRtUpper: Ka10027ResponseItem[];
}
