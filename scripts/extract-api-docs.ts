/* eslint-disable @typescript-eslint/no-base-to-string */
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 엑셀 시트 데이터를 마크다운 표 형식으로 변환합니다.
 * @param data - 2차원 배열 데이터
 * @returns 마크다운 문자열
 */
const convertToMarkdownTable = (data: unknown[][]): string => {
  if (data.length === 0) return '';

  let markdown = '';

  // 첫 번째 행과 나머지 행 중 열(column)의 최대 개수 찾기
  let maxCols = 0;
  for (const row of data) {
    if (row && row.length > maxCols) {
      maxCols = row.length;
    }
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i] || [];

    // 빈 배열이나 undefined를 문자열로 안전하게 변환
    const rowValues: string[] = [];
    for (let j = 0; j < maxCols; j++) {
      const cell = row[j];
      if (cell === undefined || cell === null) {
        rowValues.push('');
      } else {
        rowValues.push(
          String(cell).replace(/\|/g, '\\|').replace(/\n/g, '<br>'),
        );
      }
    }

    const formattedRow = '| ' + rowValues.join(' | ') + ' |';
    markdown += formattedRow + '\n';

    // 헤더 구분선 추가
    if (i === 0) {
      const separator = '| ' + rowValues.map(() => '---').join(' | ') + ' |';
      markdown += separator + '\n';
    }
  }

  return markdown;
};

/**
 * 엑셀 문서를 읽어 시트별로 마크다운 파일로 저장합니다.
 */
const extractApiDocs = () => {
  const rootDir = path.resolve(__dirname, '..');
  const filePath = path.join(rootDir, 'api-doc.xlsx');
  const targetDir = path.join(rootDir, 'tr_docs');

  if (!fs.existsSync(filePath)) {
    console.error(`파일을 찾을 수 없습니다: ${filePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`엑셀 파일 읽는 중: ${filePath}`);
  const workbook = xlsx.readFile(filePath);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (sheetName === 'API 리스트') {
      console.log(`불필요한 시트 건너뜀: ${sheetName}`);
      continue;
    }

    // 시트 제목에 괄호가 여러 개 있을 경우, 마지막 괄호 안의 문자열을 파일명으로 사용
    let fileName = sheetName;
    const matches = sheetName.match(/\(([^)]+)\)/g);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      fileName = lastMatch.replace(/^\(|\)$/g, '');
    } else if (sheetName === '오류코드') {
      fileName = 'error';
    }

    const data = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

    // 빈 시트 건너뛰기
    if (data.length === 0) {
      console.log(`시트가 비어 있습니다 (건너뜀): ${sheetName}`);
      continue;
    }

    const markdown = convertToMarkdownTable(data);

    // 파일명을 소문자로 변경하고 공백 제거
    fileName = fileName.trim().toLowerCase();

    const outPath = path.join(targetDir, `${fileName}.md`);
    fs.writeFileSync(outPath, markdown, 'utf-8');
    console.log(`생성 완료: ${outPath} (시트명: ${sheetName})`);
  }
  console.log('모든 시트의 마크다운 변환이 완료되었습니다.');
};

extractApiDocs();
