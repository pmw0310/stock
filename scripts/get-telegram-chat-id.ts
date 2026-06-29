/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import * as dotenv from 'dotenv';
import axios from 'axios';
import * as https from 'https';

type ChatData = { chat: { id: number } };
type Data = {
  ok: boolean;
  result: {
    message: ChatData;
    my_chat_member?: ChatData;
    channel_post?: ChatData;
  }[];
  description?: string;
};

/**
 * 텔레그램 봇의 최신 업데이트 내역을 가져와 Chat ID를 출력합니다.
 * @returns {Promise<void>}
 */
const getTelegramChatId = async (): Promise<void> => {
  // dotenv를 사용하여 .env 파일 로드 (광고성 로그 출력 방지: quiet 옵션)
  process.env.DOTENV_CONFIG_QUIET = 'true';
  dotenv.config({ path: '.env' });

  const token = process.env.TELEGRAM_TOKEN;

  if (!token) {
    console.error(
      '❌ .env 파일의 TELEGRAM_TOKEN 값이 비어있거나 찾을 수 없습니다.',
    );
    return;
  }

  try {
    console.log('텔레그램 최신 메시지를 확인하는 중...');

    // IPv6 환경에서 발생하는 ETIMEDOUT 에러 방지를 위해 강제로 IPv4 사용
    const httpsAgent = new https.Agent({ family: 4 });
    const response = await axios.get<Data>(
      `https://api.telegram.org/bot${token}/getUpdates`,
      { httpsAgent },
    );

    const data: Data = response.data;

    if (data.ok) {
      if (data.result.length > 0) {
        const latestUpdate = data.result[data.result.length - 1];

        // 다양한 메시지 타입에 대한 chat id 추출 (개인, 그룹, 채널 등)
        const chatId =
          latestUpdate.message?.chat?.id ||
          latestUpdate.my_chat_member?.chat?.id ||
          latestUpdate.channel_post?.chat?.id;

        if (chatId) {
          console.log(`\n✅ Chat ID를 찾았습니다: ${chatId}\n`);
          console.log(
            `이 값을 .env 파일의 TELEGRAM_CHAT_ID 에 붙여넣기 하세요.`,
          );
        } else {
          console.log(
            '❌ 업데이트 내역은 있지만 chat_id를 추출할 수 없습니다.',
          );
          console.log('상세 데이터:', JSON.stringify(latestUpdate, null, 2));
        }
      } else {
        console.log('\n❌ 수신된 메시지가 없습니다.');
        console.log(
          '텔레그램 앱에서 봇에게 아무 메시지나 보낸 후 이 스크립트를 다시 실행해주세요.\n',
        );
      }
    } else {
      console.error('❌ API 호출 실패:', data.description);
    }
  } catch (error) {
    console.error('❌ API 요청 에러 상세:');
    if (axios.isAxiosError(error)) {
      console.error(
        '메시지:',
        error.response?.data?.description || error.message,
      );
      if (error.response?.status) {
        console.error('상태 코드:', error.response.status);
      }
    } else {
      console.error('알 수 없는 에러 발생:', error.message || error);
    }
  }
};

void getTelegramChatId();
