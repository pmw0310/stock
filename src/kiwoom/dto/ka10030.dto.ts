import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 국내주식 당일거래량상위요청을 위한 DTO 클래스입니다.
 */
export class Ka10030RequestDto {
  @IsString()
  @IsNotEmpty()
  mrktTp: string;

  @IsString()
  @IsNotEmpty()
  sortTp: string;

  @IsString()
  @IsNotEmpty()
  mangStkIncls: string;

  @IsString()
  @IsNotEmpty()
  crdTp: string;

  @IsString()
  @IsNotEmpty()
  trdeQtyTp: string;

  @IsString()
  @IsNotEmpty()
  pricTp: string;

  @IsString()
  @IsNotEmpty()
  trdePricaTp: string;

  @IsString()
  @IsNotEmpty()
  mrktOpenTp: string;

  @IsString()
  @IsNotEmpty()
  stexTp: string;
}

/**
 * 국내주식 당일거래량상위 응답 리스트의 개별 종목 항목 정보
 */
export class Ka10030ResponseItem {
  stkCd: string;
  stkNm: string;
  curPrc: string;
  predPreSig: string;
  predPre: string;
  fluRt: string;
  trdeQty: string;
  predRt: string;
  trdeTernRt: string;
  trdeAmt: string;
  opmrTrdeQty: string;
  opmrPredRt: string;
  opmrTrdeRt: string;
  opmrTrdeAmt: string;
  afMkrtTrdeQty: string;
  afMkrtPredRt: string;
  afMkrtTrdeRt: string;
  afMkrtTrdeAmt: string;
  bfMkrtTrdeQty: string;
  bfMkrtPredRt: string;
  bfMkrtTrdeRt: string;
  bfMkrtTrdeAmt: string;
}

/**
 * 국내주식 당일거래량상위 응답을 위한 DTO 클래스입니다.
 */
export class Ka10030ResponseDto {
  returnCode: number;
  returnMsg: string;
  tdyTrdeQtyUpper: Ka10030ResponseItem[];
}
