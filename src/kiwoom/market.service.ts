import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { TelegramStateService } from '@/telegram/telegram-state.service';
import { HolidayService } from '@/holiday/holiday.service';

/**
 * 장 운영 시간 여부를 확인하고 관리하는 서비스입니다.
 */
@Injectable()
export class MarketService {
  constructor(
    @Inject(forwardRef(() => TelegramStateService))
    private readonly telegramStateService: TelegramStateService,
    private readonly holidayService: HolidayService,
  ) {}

  /**
   * 현재 시각이 장 운영 시간 내인지 확인합니다.
   * @returns 장 운영 시간 여부
   */
  public isMarketOpen = (): boolean => {
    const now = new Date();

    // 주말 체크
    const day = now.getDay();
    if (day === 0 || day === 6) return false;

    // 공휴일 체크
    const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    if (this.holidayService.isHoliday(formattedDate)) return false;

    const startStr = this.telegramStateService.getMarketStartTime(); // e.g. "09:00"
    const endStr = this.telegramStateService.getMarketEndTime(); // e.g. "15:30"

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMinute] = startStr.split(':').map(Number);
    const [endHour, endMinute] = endStr.split(':').map(Number);

    const startMins = startHour * 60 + startMinute;
    const endMins = endHour * 60 + endMinute;

    return currentMinutes >= startMins && currentMinutes <= endMins;
  };
}
