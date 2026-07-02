/**
 * 특일 정보제공 서비스 API 공휴일 아이템 속성
 */
export class HolidayItemDto {
  /**
   * 종류 코드 (예: "01": 국경일/공휴일)
   */
  dateKind: string;

  /**
   * 명칭 (예: "지정공휴일", "광복절")
   */
  dateName: string;

  /**
   * 공공기관 휴일여부 ("Y" / "N")
   */
  isHoliday: string;

  /**
   * 날짜 (YYYYMMDD 형식의 숫자 형태일 수 있음, Number 또는 String)
   */
  locdate: number | string;

  /**
   * 순번
   */
  seq: number;
}

/**
 * 특일 정보제공 서비스 응답 바디
 */
export class HolidayBodyDto {
  items: {
    item?: HolidayItemDto | HolidayItemDto[];
  };
  numOfRows: number;
  pageNo: number;
  totalCount: number;
}

/**
 * 특일 정보제공 서비스 응답 헤더
 */
export class HolidayHeaderDto {
  resultCode: string;
  resultMsg: string;
}

/**
 * 특일 정보제공 서비스 최상위 응답
 */
export class HolidayResponseDto {
  response: {
    header: HolidayHeaderDto;
    body: HolidayBodyDto;
  };
}
