const fs = require('fs');
const path = require('path');

// 1. シミュレーション初期設定 (開始時刻: 2026-06-09 13:00:00)
const BASE_TIME = new Date('2026-06-09T13:00:00+09:00').getTime();
const DURATION_LIMIT = 60 * 60 * 1000; // 1時間 (ms)

// 2. 模擬患者20名データ定義 (scene_triage_color は本来あるべき想定の色)
const patientTemplates = [
    { id: 1, name: 'アカシ シンイチ', age: 34, gender: 'M', expected_triage: '赤', diagnosis: '骨盤骨折・出血性ショック', required_treatments: ['blood_transfusion', 'pelvic_binder'], need_exam: true },
    { id: 2, name: 'イチカワ ユウキ', age: 25, gender: 'M', expected_triage: '赤', diagnosis: '緊張性気胸', required_treatments: ['needle_decompression', 'chest_tube'], need_exam: true },
    { id: 3, name: 'ウエダ マリ', age: 42, gender: 'F', expected_triage: '赤', diagnosis: '吸入外傷・気道熱傷', required_treatments: ['intubation', 'oxygen'], need_exam: false },
    { id: 4, name: 'エンドウ ナオコ', age: 58, gender: 'F', expected_triage: '赤', diagnosis: '大腿動脈損傷・活動性外出血', required_treatments: ['tourniquet', 'hemostasis_compression'], need_exam: true },
    { id: 5, name: 'オオタ ケンジ', age: 47, gender: 'M', expected_triage: '赤', diagnosis: 'クラッシュ症候群', required_treatments: ['fluid_resuscitation', 'ecg_monitoring'], need_exam: true },
    
    { id: 6, name: 'カトウ タクヤ', age: 38, gender: 'M', expected_triage: '黄', diagnosis: '右肋骨骨折・血気胸', required_treatments: ['oxygen', 'chest_tube'], need_exam: true },
    { id: 7, name: 'キムラ マイ', age: 29, gender: 'F', expected_triage: '黄', diagnosis: '大腿骨閉鎖性骨折', required_treatments: ['splint_immobilization', 'analgesia'], need_exam: true },
    { id: 8, name: 'クドウ カズキ', age: 51, gender: 'M', expected_triage: '黄', diagnosis: '右手挫創活動性出血', required_treatments: ['pressure_bandage'], need_exam: false },
    { id: 9, name: 'コバヤシ ヒロシ', age: 63, gender: 'M', expected_triage: '黄', diagnosis: '肋骨多発骨折', required_treatments: ['analgesia'], need_exam: true },
    { id: 10, name: 'サトウ ユミ', age: 19, gender: 'F', expected_triage: '黄', diagnosis: '頭部打撲・軽度意識障害', required_treatments: ['c-collar'], need_exam: true },
    { id: 11, name: 'サイトウ ツバサ', age: 44, gender: 'M', expected_triage: '黄', diagnosis: '鎖骨骨折・肩関節脱臼', required_treatments: ['triangular_bandage'], need_exam: true },

    { id: 12, name: 'スズキ タロウ', age: 31, gender: 'M', expected_triage: '緑', diagnosis: '右手首捻挫', required_treatments: [], need_exam: false },
    { id: 13, name: 'タナカ ハナコ', age: 67, gender: 'F', expected_triage: '緑', diagnosis: '左下腿擦過傷', required_treatments: [], need_exam: false },
    { id: 14, name: 'ナカムラ ジロウ', age: 53, gender: 'M', expected_triage: '緑', diagnosis: '過換気症候群', required_treatments: [], need_exam: false },
    { id: 15, name: 'ハヤシ ヨウコ', age: 26, gender: 'F', expected_triage: '緑', diagnosis: '不安神経症', required_treatments: [], need_exam: false },
    { id: 16, name: 'ヤマダ イチロウ', age: 72, gender: 'M', expected_triage: '緑', diagnosis: '軽度頭部打撲', required_treatments: [], need_exam: false },
    { id: 17, name: 'イトウ サクラ', age: 22, gender: 'F', expected_triage: '緑', diagnosis: '左前腕切創・軽度出血', required_treatments: [], need_exam: false },
    { id: 18, name: 'タカハシ レン', age: 18, gender: 'M', expected_triage: '緑', diagnosis: '打撲・挫創', required_treatments: [], need_exam: false },
    { id: 19, name: 'ワタナベ アオイ', age: 35, gender: 'F', expected_triage: '緑', diagnosis: '全身過緊張', required_treatments: [], need_exam: false },

    { id: 20, name: 'コジマ ソウタ', age: 80, gender: 'M', expected_triage: '黒', diagnosis: '心肺停止・体温低下', required_treatments: [], need_exam: false }
];

// 3. 各患者オブジェクトのステータス初期化
const patients = patientTemplates.map(p => {
    // 0分〜25分の間にランダムに病着（秒単位に丸める）
    const arrivalDelay = Math.floor(Math.random() * 25 * 60) * 1000; 
    const arrivalTime = BASE_TIME + arrivalDelay;

    // トリアージ判定のランダム乖離 (15%の確率で誤判定＝トリアージミスの再現)
    let sceneTriage = p.expected_triage;
    if (p.expected_triage !== '黒' && Math.random() < 0.15) {
        if (p.expected_triage === '赤') sceneTriage = '黄'; // アンダートリアージ
        else if (p.expected_triage === '黄') sceneTriage = Math.random() < 0.5 ? '赤' : '緑'; 
        else if (p.expected_triage === '緑') sceneTriage = '黄'; // オーバートリアージ
    }

    return {
        id: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        triage_color: p.expected_triage,      // 想定トリアージ区分（マスタ設定）
        scene_triage_color: sceneTriage,     // 現場トリアージ区分（判定結果）
        diagnosis: p.diagnosis,
        required_treatments: p.required_treatments,
        need_exam: p.need_exam,
        status: '未着手',
        reception_time_ms: arrivalTime, 
        triage_time_ms: null,
        initial_vs_time_ms: null,
        post_vs_time_ms: null, 
        completed_treatments: [],
        tests_completed: false,
        stabilization_completed: false,
        vitals_initial_struct: {
            sbp: p.expected_triage === '赤' ? '88' : '122',
            dbp: p.expected_triage === '赤' ? '50' : '78',
            hr: p.expected_triage === '赤' ? '125' : '82',
            rr: p.expected_triage === '赤' ? '28' : '16',
            spo2: p.expected_triage === '赤' ? '91' : '98',
            temp: '36.5',
            gcs_e: p.expected_triage === '赤' ? '3' : '4',
            gcs_v: p.expected_triage === '赤' ? '4' : '5',
            gcs_m: p.expected_triage === '赤' ? '5' : '6'
        }
    };
});

// 4. イベント駆動シミュレーションエンジン
// スタッフ定義
const staffList = {
    triage: [ { id: 'TS1', freeAt: 0 }, { id: 'TS2', freeAt: 0 } ],
    medical: [
        { id: 'MED1', freeAt: 0 }, { id: 'MED2', freeAt: 0 }, { id: 'MED3', freeAt: 0 },
        { id: 'MED4', freeAt: 0 }, { id: 'MED5', freeAt: 0 }, { id: 'MED6', freeAt: 0 }
    ],
    tech: [ { id: 'T1', freeAt: 0 }, { id: 'T2', freeAt: 0 } ]
};

const triageQueue = [];
const medicalQueue = [];
const examQueue = [];

// 1秒刻みのイベントループ
for (let timeOffset = 0; timeOffset < DURATION_LIMIT; timeOffset += 1000) {
    const now = BASE_TIME + timeOffset;

    // A. 新規病着患者をトリアージキューに投入
    patients.forEach(p => {
        if (p.reception_time_ms === now) {
            triageQueue.push(p);
            p.status = '待合';
        }
    });

    // B. トリアージ処理
    staffList.triage.forEach(staff => {
        if (now >= staff.freeAt && triageQueue.length > 0) {
            const p = triageQueue.shift();
            p.status = 'トリアージ中';
            
            // 所要時間 (45〜90秒)
            const duration = (45 + Math.floor(Math.random() * 45)) * 1000;
            staff.freeAt = now + duration;
            p.triage_time_ms = now + duration;
            
            if (p.scene_triage_color !== '黒') {
                // トリアージ終了時刻に医療キューに入るように設定
                medicalQueue.push({ patient: p, enterTime: now + duration });
            } else {
                p.status = '死亡確認';
                p.post_vs_time_ms = now + duration;
            }
        }
    });

    // C. 医師・看護師（医療スタッフ）の診療
    // 待機中の患者（トリアージ完了済みの時間になっている患者）を抽出
    const readyMedical = medicalQueue.filter(item => now >= item.enterTime);
    
    staffList.medical.forEach(staff => {
        if (now >= staff.freeAt && readyMedical.length > 0) {
            // トリアージの優先順 (赤 > 黄 > 緑) で選択
            // 現場の混乱を想定し、10%の確率で単なる先着順で選んでしまう
            let selectedIndex = 0;
            if (Math.random() > 0.10) {
                const prio = { '赤': 3, '黄': 2, '緑': 1 };
                let maxPrio = -1;
                for (let i = 0; i < readyMedical.length; i++) {
                    const color = readyMedical[i].patient.scene_triage_color;
                    const pVal = prio[color] || 0;
                    if (pVal > maxPrio) {
                        maxPrio = pVal;
                        selectedIndex = i;
                    }
                }
            }
            
            const item = readyMedical.splice(selectedIndex, 1)[0];
            // medicalQueueからも削除
            const qIndex = medicalQueue.indexOf(item);
            if (qIndex > -1) medicalQueue.splice(qIndex, 1);

            const p = item.patient;
            p.status = '初期評価中';

            // 1. 初期評価 (バイタル測定＋身体診察)
            // 所要時間: 90〜150秒
            const initialVSduration = (90 + Math.floor(Math.random() * 60)) * 1000;
            p.initial_vs_time_ms = now + initialVSduration;
            p.completed_treatments.push('vitals', 'head_and_neck', 'chest', 'abdomen_and_pelvis');

            // 2. 検査オーダーが必要かチェック
            if (p.need_exam && !p.tests_completed) {
                // 検査へ回す
                staff.freeAt = now + initialVSduration;
                examQueue.push({ patient: p, enterTime: now + initialVSduration, medStaffId: staff.id });
            } else {
                // 直接処置へ移行
                const treatmentStart = now + initialVSduration;
                processTreatmentsForPatient(p, staff, treatmentStart);
            }
        }
    });

    // D. 検査技師による画像・血液検査の実施
    const readyExams = examQueue.filter(item => now >= item.enterTime);
    staffList.tech.forEach(staff => {
        if (now >= staff.freeAt && readyExams.length > 0) {
            // トリアージ順
            readyExams.sort((a, b) => {
                const prio = { '赤': 3, '黄': 2, '緑': 1 };
                return (prio[b.patient.scene_triage_color] || 0) - (prio[a.patient.scene_triage_color] || 0);
            });
            const item = readyExams.shift();
            // examQueueからも削除
            const qIndex = examQueue.indexOf(item);
            if (qIndex > -1) examQueue.splice(qIndex, 1);

            const p = item.patient;
            p.status = '検査実施中';

            // 検査時間 (2〜3.5分)
            const examDuration = (120 + Math.floor(Math.random() * 90)) * 1000;
            staff.freeAt = now + examDuration;
            p.tests_completed = true;
            p.stabilization_completed = true;

            // 検査完了後、もともと担当していた医師/看護師、または空いているスタッフが治療を再開
            // ここでは簡易的に、検査完了後に再び `medicalQueue` に入り、次の手の空いた医療スタッフが担当する形式にします
            medicalQueue.push({ patient: p, enterTime: now + examDuration });
        }
    });
}

// 治療処置の逐次実行シミュレーション (医師・看護師の拘束)
function processTreatmentsForPatient(p, staff, startTime) {
    p.status = '処置実施中';
    const undone = p.required_treatments.filter(id => !p.completed_treatments.includes(id));
    
    if (undone.length > 0) {
        let currentTotalTime = startTime;
        undone.forEach(treatmentId => {
            // 処置時間 (2.5〜5分)
            const duration = (150 + Math.floor(Math.random() * 150)) * 1000;
            p.completed_treatments.push(treatmentId);
            currentTotalTime += duration;
        });
        
        staff.freeAt = currentTotalTime;
        p.post_vs_time_ms = currentTotalTime;
        p.status = '安定化・完了';
    } else {
        staff.freeAt = startTime;
        p.post_vs_time_ms = startTime;
        p.status = '安定化・完了';
    }
}

// 5. CSVの構築
const formatTimeStr = (ms) => {
    if (!ms) return '';
    const d = new Date(ms);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

const escapeCSVStr = (str) => {
    if (!str) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

const calcMinutesVal = (start, end) => {
    if (!start || !end) return '';
    const diffMs = end - start;
    if (diffMs < 0) return '0';
    return (diffMs / (1000 * 60)).toFixed(1);
};

const triageDiffVal = (p) => {
    if (p.scene_triage_color === p.triage_color) return '一致';
    const severity = { '赤': 4, '黄': 3, '緑': 2, '黒': 1 };
    const sceneSev = severity[p.scene_triage_color] || 0;
    const realSev = severity[p.triage_color] || 0;
    if (sceneSev > realSev) return 'オーバートリアージ';
    if (sceneSev < realSev) return 'アンダートリアージ';
    return '';
};

const headers = [
    '管理番号', '患者氏名', 'シナリオタグ', '年齢', '性別', '想定トリアージ区分', '現場トリアージ区分', '診断名',
    '現在ステータス', 'トリアージ完了日時', '初期V/S完了日時', '最終処置完了日時',
    '処置済み項目', '画像検査実施', '血液検査実施', 
    '初期V/S_SBP', '初期V/S_DBP', '初期V/S_HR', '初期V/S_RR', '初期V/S_SpO2', '初期V/S_Temp', '初期V/S_GCS_E', '初期V/S_GCS_V', '初期V/S_GCS_M',
    '最新V/S(テキスト)',
    'KPI_病着からトリアージまでの時間(分)', 'KPI_トリアージから初期評価までの時間(分)', 'KPI_病着から根本治療までの時間(分)', 'KPI_急変の有無', 'KPI_トリアージ乖離'
];

const rows = patients.map(p => {
    const vs_i = p.vitals_initial_struct;
    const row = [
        p.id,
        p.name,
        'シミュレーション',
        p.age,
        p.gender === 'M' ? '男性' : '女性',
        p.triage_color,
        p.scene_triage_color || '',
        p.diagnosis || '',
        p.status,
        formatTimeStr(p.triage_time_ms),
        formatTimeStr(p.initial_vs_time_ms),
        formatTimeStr(p.post_vs_time_ms),
        p.completed_treatments.join(','),
        p.tests_completed ? '済' : '未',
        p.stabilization_completed ? '済' : '未',
        vs_i.sbp, vs_i.dbp, vs_i.hr, vs_i.rr, vs_i.spo2, vs_i.temp, vs_i.gcs_e, vs_i.gcs_v, vs_i.gcs_m,
        `SBP:${vs_i.sbp} HR:${vs_i.hr} SpO2:${vs_i.spo2}`,
        calcMinutesVal(p.reception_time_ms, p.triage_time_ms),
        calcMinutesVal(p.triage_time_ms, p.initial_vs_time_ms),
        calcMinutesVal(p.reception_time_ms, p.post_vs_time_ms),
        'なし',
        triageDiffVal(p)
    ];
    return row.map(cell => escapeCSVStr(cell)).join(',');
});

const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

const outPath = path.join(__dirname, '../simulated_training_log.csv');
fs.writeFileSync(outPath, csvContent, 'utf-8');
console.log(`\nシミュレーションログCSVを出力しました: ${outPath}`);

// 統計
const totalPatients = patients.length;
const completedCount = patients.filter(p => p.status === '安定化・完了' || p.status === '死亡確認').length;
const vsMeasuredCount = patients.filter(p => p.initial_vs_time_ms !== null).length;
const triageCount = patients.filter(p => p.triage_time_ms !== null).length;

console.log('\n======================================');
console.log('   シミュレーション結果サマリー (改訂版)');
console.log('======================================');
console.log(`総患者数: ${totalPatients} 名`);
console.log(`トリアージ完了: ${triageCount} 名`);
console.log(`初期評価完了: ${vsMeasuredCount} 名`);
console.log(`治療完了 / 終了: ${completedCount} 名`);

const correctTriage = patients.filter(p => triageDiffVal(p) === '一致').length;
const overTriage = patients.filter(p => triageDiffVal(p) === 'オーバートリアージ').length;
const underTriage = patients.filter(p => triageDiffVal(p) === 'アンダートリアージ').length;
console.log(`\nトリアージ一致率: ${((correctTriage / triageCount) * 100).toFixed(1)}% (${correctTriage}/${triageCount})`);
console.log(`オーバートリアージ: ${overTriage} 名`);
console.log(`アンダートリアージ: ${underTriage} 名`);

const getAvgTime = (kpiIndex) => {
    let sum = 0;
    let count = 0;
    rows.forEach(r => {
        const val = r.split(',')[kpiIndex];
        if (val && !isNaN(val)) {
            sum += parseFloat(val);
            count++;
        }
    });
    return count > 0 ? (sum / count).toFixed(1) : 'N/A';
};

console.log(`\n--- KPI平均時間 ---`);
console.log(`病着からトリアージ完了: ${getAvgTime(25)} 分`);
console.log(`トリアージから初期評価: ${getAvgTime(26)} 分`);
console.log(`病着から最終処置完了 (赤・黄タグ): ${getAvgTime(27)} 分`);
console.log('======================================');
