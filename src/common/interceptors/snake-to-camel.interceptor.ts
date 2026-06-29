/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { toCamelCase, toSnakeCase } from '@/common/utils/case-converter.util';

/**
 * 전역으로 동작하여 요청 데이터를 카멜 케이스로,
 * 응답 데이터를 스네이크 케이스로 자동 변환하는 인터셉터입니다.
 */
@Injectable()
export class SnakeToCamelInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // 요청 Body 변환 (스네이크 -> 카멜)
    if (request.body && Object.keys(request.body).length > 0) {
      request.body = toCamelCase(request.body);
    }

    // 요청 Query 변환 (스네이크 -> 카멜)
    if (request.query && Object.keys(request.query).length > 0) {
      request.query = toCamelCase(request.query);
    }

    // 응답 변환 (카멜 -> 스네이크)
    return next.handle().pipe(map((data) => toSnakeCase(data)));
  }
}
