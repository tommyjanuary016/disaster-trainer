import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      if (insideQuotes && csvText[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++;
      }
      row.push(currentVal);
      rows.push(row);
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  if (currentVal || row.length > 0) {
    row.push(currentVal);
    rows.push(row);
  }

  // Find header
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
      if (rows[i].length > 5 && rows[i][0].includes('管理番号')) {
          headerIndex = i;
          break;
      }
  }
  
  if (headerIndex === -1) {
      // In case the file starts with header but split by newlines
      const rawHeader = rows[0].map(h => h.replace(/\n|\r/g, '').trim());
      // Handle "トリアー\nジ区分"
      for (let j = 0; j < rows[0].length; j++) {
          if (rows[0][j].includes('トリアー')) {
              rows[0][j] = 'トリアージ区分';
          }
          if (rows[0][j].includes('生活歴')) {
              rows[0][j] = '生活歴・家族情報';
          }
      }
      headerIndex = 0;
  } else {
      // clean header
      for (let j = 0; j < rows[headerIndex].length; j++) {
          let h = rows[headerIndex][j];
          if (h.includes('トリアー')) rows[headerIndex][j] = 'トリアージ区分';
          if (h.includes('生活歴')) rows[headerIndex][j] = '生活歴・家族情報';
          rows[headerIndex][j] = rows[headerIndex][j].replace(/\n|\r/g, '').trim();
      }
  }

  const headers = rows[headerIndex];
  const data = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    if (rows[i].length <= 1 && !rows[i][0]) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j] || '';
    }
    data.push(obj);
  }
  return data;
}

function extractVitals(text) {
    if (!text) return { sbp: '', dbp: '', hr: '', rr: '', spo2: '', temp: '', e: '', v: '', m: '' };
    
    // Replace full-width characters and spaces to make matching easier
    const normalized = text.replace(/[：]/g, ':').replace(/[％]/g, '%').toUpperCase();
    
    const bpMatch = normalized.match(/BP[\s:]*(\d+)\s*\/\s*(\d+)/);
    const hrMatch = normalized.match(/HR[\s:]*(\d+)/);
    const rrMatch = normalized.match(/(?:R|RR)[\s:]*(\d+)/);
    const spo2Match = normalized.match(/SPO2[\s:]*(\d+)/);
    const tempMatch = normalized.match(/(?:KT|TEMP|BT)[\s:]*([\d.]+)/);
    const gcsMatch = normalized.match(/GCS[\s:]*E(\d)\s*V(\d)\s*M(\d)/);
    const gcsShortMatch = normalized.match(/E(\d)V(\d)M(\d)/); // Fallback for just E3V4M5
    
    const e = gcsMatch ? gcsMatch[1] : (gcsShortMatch ? gcsShortMatch[1] : '');
    const v = gcsMatch ? gcsMatch[2] : (gcsShortMatch ? gcsShortMatch[2] : '');
    const m = gcsMatch ? gcsMatch[3] : (gcsShortMatch ? gcsShortMatch[3] : '');

    return {
        sbp: bpMatch ? bpMatch[1] : '',
        dbp: bpMatch ? bpMatch[2] : '',
        hr: hrMatch ? hrMatch[1] : '',
        rr: rrMatch ? rrMatch[1] : '',
        spo2: spo2Match ? spo2Match[1] : '',
        temp: tempMatch ? tempMatch[1] : '',
        e, v, m
    };
}

function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

async function main() {
  const inputPath = path.join(__dirname, 'patients.csv.bak');
  const outputPath = path.join(__dirname, 'patients.csv');

  if (!fs.existsSync(inputPath)) {
    console.error(`Backup not found`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(inputPath, 'utf8');
  let data;
  try {
      data = parseCSV(csvContent);
  } catch (e) {
      console.error(e);
      return;
  }

  const newHeaders = [
    '管理番号', '患者氏名', '年齢', '性別', 'トリアージ区分',
    'トリアージ時_SBP', 'トリアージ時_DBP', 'トリアージ時_HR', 'トリアージ時_RR', 'トリアージ時_SpO2', 'トリアージ時_Temp', 'トリアージ時_GCS_E', 'トリアージ時_GCS_V', 'トリアージ時_GCS_M',
    '初期評価時_SBP', '初期評価時_DBP', '初期評価時_HR', '初期評価時_RR', '初期評価時_SpO2', '初期評価時_Temp', '初期評価時_GCS_E', '初期評価時_GCS_V', '初期評価時_GCS_M',
    '処置後_SBP', '処置後_DBP', '処置後_HR', '処置後_RR', '処置後_SpO2', '処置後_Temp', '処置後_GCS_E', '処置後_GCS_V', '処置後_GCS_M',
    '頭部・顔面・頸部', '胸部', '腹部・骨盤', '四肢', 'AMPLE', '生活歴・家族情報', 'FAST', '診断名', '必要検査・安定処置', '方針'
  ];

  const rows = data.map(row => {
      // Find the correct keys by looking at object keys
      const keys = Object.keys(row);
      const triageKey = keys.find(k => k.includes('トリアー'));
      const triageAreaKey = keys.find(k => k.includes('トリアージエリアV'));
      const initialAreaKey = keys.find(k => k.includes('各診療エリアV'));
      const postAreaKey = keys.find(k => k.includes('処置後V'));
      const headKey = keys.find(k => k.includes('頭部'));
      const chestKey = keys.find(k => k.includes('胸部'));
      const abdomenKey = keys.find(k => k.includes('腹部'));
      const limbsKey = keys.find(k => k.includes('四肢'));
      const ampleKey = keys.find(k => k.includes('AMPLE'));
      const bgKey = keys.find(k => k.includes('生活歴'));
      const fastKey = keys.find(k => k.includes('FAST'));
      const diagKey = keys.find(k => k.includes('診断名'));
      const treatKey = keys.find(k => k.includes('安定処置'));
      const policyKey = keys.find(k => k.includes('方針'));

      const v_t = extractVitals(row[triageAreaKey] || '');
      const v_i = extractVitals(row[initialAreaKey] || '');
      const v_p = extractVitals(row[postAreaKey] || '');

      return [
          row['管理番号'], row['患者氏名'], row['年齢'], row['性別'], row[triageKey] || '',
          v_t.sbp, v_t.dbp, v_t.hr, v_t.rr, v_t.spo2, v_t.temp, v_t.e, v_t.v, v_t.m,
          v_i.sbp, v_i.dbp, v_i.hr, v_i.rr, v_i.spo2, v_i.temp, v_i.e, v_i.v, v_i.m,
          v_p.sbp, v_p.dbp, v_p.hr, v_p.rr, v_p.spo2, v_p.temp, v_p.e, v_p.v, v_p.m,
          row[headKey] || '', row[chestKey] || '', row[abdomenKey] || '', row[limbsKey] || '', row[ampleKey] || '', row[bgKey] || '', row[fastKey] || '', row[diagKey] || '', row[treatKey] || '', row[policyKey] || ''
      ].map(c => escapeCSV(c)).join(',');
  });

  // Ensure no duplicate BOMs
  const outputContent = '\uFEFF' + [newHeaders.join(','), ...rows].join('\n');
  fs.writeFileSync(outputPath, outputContent, 'utf8');
  console.log('Migration complete!');
}

main().catch(console.error);
