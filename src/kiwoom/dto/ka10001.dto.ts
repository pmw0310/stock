import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

/**
 * 키움증권 주식기본정보요청 (ka10001) 요청 DTO 클래스입니다.
 */
export class Ka10001RequestDto {
  /**
   * 종목코드
   */
  @IsString()
  @IsNotEmpty()
  stkCd: string;
}

/**
 * 키움증권 주식기본정보요청 (ka10001) 응답 DTO 클래스입니다.
 */
export class Ka10001ResponseDto {
  @IsString()
  @IsOptional()
  stkCd?: string;

  @IsString()
  @IsOptional()
  stkNm?: string;

  @IsString()
  @IsOptional()
  setlMm?: string;

  @IsString()
  @IsOptional()
  fav?: string;

  @IsString()
  @IsOptional()
  cap?: string;

  @IsString()
  @IsOptional()
  floStk?: string;

  @IsString()
  @IsOptional()
  crdRt?: string;

  @IsString()
  @IsOptional()
  oyrHgst?: string;

  @IsString()
  @IsOptional()
  oyrLwst?: string;

  @IsString()
  @IsOptional()
  mac?: string;

  @IsString()
  @IsOptional()
  macWght?: string;

  @IsString()
  @IsOptional()
  forExhRt?: string;

  @IsString()
  @IsOptional()
  replPric?: string;

  @IsString()
  @IsOptional()
  per?: string;

  @IsString()
  @IsOptional()
  eps?: string;

  @IsString()
  @IsOptional()
  roe?: string;

  @IsString()
  @IsOptional()
  pbr?: string;

  @IsString()
  @IsOptional()
  ev?: string;

  @IsString()
  @IsOptional()
  bps?: string;

  @IsString()
  @IsOptional()
  saleAmt?: string;

  @IsString()
  @IsOptional()
  busPro?: string;

  @IsString()
  @IsOptional()
  cupNga?: string;

  @IsString()
  @IsOptional()
  _250hgst?: string;

  @IsString()
  @IsOptional()
  _250lwst?: string;

  @IsString()
  @IsOptional()
  openPric?: string;

  @IsString()
  @IsOptional()
  highPric?: string;

  @IsString()
  @IsOptional()
  lowPric?: string;

  @IsString()
  @IsOptional()
  uplPric?: string;

  @IsString()
  @IsOptional()
  lstPric?: string;

  @IsString()
  @IsOptional()
  basePric?: string;

  @IsString()
  @IsOptional()
  expCntrPric?: string;

  @IsString()
  @IsOptional()
  expCntrQty?: string;

  @IsString()
  @IsOptional()
  _250hgstPricDt?: string;

  @IsString()
  @IsOptional()
  _250hgstPricPreRt?: string;

  @IsString()
  @IsOptional()
  _250lwstPricDt?: string;

  @IsString()
  @IsOptional()
  _250lwstPricPreRt?: string;

  @IsString()
  @IsOptional()
  curPrc?: string;

  @IsString()
  @IsOptional()
  preSig?: string;

  @IsString()
  @IsOptional()
  predPre?: string;

  @IsString()
  @IsOptional()
  fluRt?: string;

  @IsString()
  @IsOptional()
  trdeQty?: string;

  @IsString()
  @IsOptional()
  trdePre?: string;

  @IsString()
  @IsOptional()
  favUnit?: string;

  @IsString()
  @IsOptional()
  dstrStk?: string;

  @IsString()
  @IsOptional()
  dstrRt?: string;

  @IsNumber()
  @IsNotEmpty()
  returnCode: number;

  @IsString()
  @IsNotEmpty()
  returnMsg: string;
}
