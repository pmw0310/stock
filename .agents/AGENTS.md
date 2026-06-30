# 프로젝트 전용 규칙 (Project Rules)

이 규칙은 `stock` 프로젝트 내에서 안티그라비티가 코드를 작성하거나 프로젝트 구조를 수정할 때 반드시 따라야 하는 가이드라인입니다.

<RULE>
## 1. 아키텍처 및 역할 (Architecture & Roles)
- `src/common/`: 프로젝트 전반에서 공통으로 사용되는 모듈 (예: `utils`, `interceptors`)
- `src/kiwoom/`: 키움증권 REST API 통신 및 비즈니스 로직
- `src/telegram/`: 텔레그램 봇 기능, 명령어 핸들링 및 상태 관리 영역
- `tr_docs/`: 키움 REST API의 TR(Transaction) 명세서 문서 폴더

## 2. 명명 및 파일 작성 규칙 (Naming & File Conventions)

### 2.1. 키움 API (Kiwoom Domain)
모든 키움 관련 기능은 철저히 **TR 번호 기반**으로 분리하여 작성합니다.
- **서비스 (Service)**: `src/kiwoom/` 하위에 위치
  - 파일명: `[TR번호(소문자)].service.ts` (예: `au10001.service.ts`)
  - 클래스명: PascalCase (예: `Au10001Service`)
- **DTO (Data Transfer Object)**: `src/kiwoom/dto/` 하위에 위치
  - 파일명: `[TR번호(소문자)].dto.ts` (예: `au10001.dto.ts`)
  - 클래스명: PascalCase (예: `Au10001RequestDto`, `Au10001ResponseDto`)
  - **작성 규칙**: 전역 인터셉터(`SnakeToCamelInterceptor`)에 의해 외부에서 들어오는 스네이크 케이스(Snake Case) 데이터는 자동으로 카멜 케이스(Camel Case)로 변환되며, 응답 시에도 카멜 케이스가 스네이크 케이스로 자동 변환됩니다. 따라서 **DTO 및 서비스 내부의 모든 변수와 프로퍼티는 반드시 카멜 케이스(Camel Case)로만 작성**합니다.
  - **중요**: 요청(Request) DTO와 응답(Response) DTO 클래스를 같은 파일 안에서 명확히 분리하여 정의합니다.
- **TR 명세 문서**: `tr_docs/` 하위에 위치
  - 파일명: `[TR번호(소문자)].md` (예: `au10001.md`)

### 2.2. 텔레그램 봇 (Telegram Domain)
- **명령어 처리기 (Commands)**: `src/telegram/commands/` 하위에 개별 봇 명령어(Command)별로 파일을 분리하여 구현합니다.
- **상태 관리**: 사용자 세션, 인증 상태 등은 `telegram-state.service.ts`에서 관리합니다.
- **이벤트/메시지 수신**: 텔레그램에서 들어오는 웹훅/폴링 업데이트 처리는 `telegram.update.ts`에서 담당합니다.

### 2.3. 공통 유틸리티 (Common/Utils)
- `src/common/utils/` 하위에 도메인 종속성이 없는 순수 함수 위주로 작성합니다.
- 파일명: `[기능명].util.ts`
- **구현 방식**: 일반 함수 선언(`function() {}`) 대신, 반드시 **화살표 함수(`const func = () => {}`)**를 사용하여 구현합니다.
</RULE>
