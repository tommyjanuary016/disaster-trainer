const fs = require('fs');
const path = require('path');

// 1. シミュレーション初期設定 (開始時刻: 2026-06-09 13:00:00)
const BASE_TIME = new Date('2026-06-09T13:00:00+09:00').getTime();
const DURATION_LIMIT = 60 * 60 * 1000; // 1時間 (ms)

// 2. 模擬患者20名データ定義
const patientTemplates = [
    { id: 1, name: 'アカシ シンイチ', age: 34, gender: 'M', scene_triage_color: '赤', diagnosis: '骨盤骨折・出血性ショック', required_treatments: ['blood_transfusion', 'pelvic_binder'], need_exam: true },
    { id: 2, name: 'イチカワ ユウキ', age: 25, gender: 'M', scene_triage_color: '赤', diagnosis: '緊張性気胸', required_treatments: ['needle_decompression', 'chest_tube'], need_exam: true },
    { id: 3, name: 'ウエダ マリ', age: 42, gender: 'F', scene_triage_color: '赤', diagnosis: '吸入外傷・気道熱傷', required_treatments: ['intubation', 'oxygen'], need_exam: false },
    { id: 4, name: 'エンドウ ナオコ', age: 58, gender: 'F', scene_triage_color: '赤', diagnosis: '大腿動脈損傷・活動性外出血', required_treatments: ['tourniquet', 'hemostasis_compression'], need_exam: true },
    { id: 5, name: 'オオタ ケンジ', age: 47, gender: 'M', scene_triage_color: '赤', diagnosis: 'クラッシュ症候群', required_treatments: ['fluid_resuscitation', 'ecg_monitoring'], need_exam: true },
    
    { id: 6, name: 'カトウ タクヤ', age: 38, gender: 'M', scene_triage_color: '黄', diagnosis: '右肋骨骨折・血気胸', required_treatments: ['oxygen', 'chest_tube'], need_exam: true },
    { id: 7, name: 'キムラ マイ', age: 29, gender: 'F', scene_triage_color: '黄', diagnosis: '大腿骨閉鎖性骨折', required_treatments: ['splint_immobilization', 'analgesia'], need_exam: true },
    { id: 8, name: 'クドウ カズキ', age: 51, gender: 'M', scene_triage_color: '黄', diagnosis: '右手挫創活動性出血', required_treatments: ['pressure_bandage'], need_exam: false },
    { id: 9, name: 'コバヤシ ヒロシ', age: 63, gender: 'M', scene_triage_color: '黄', diagnosis: '肋骨多発骨折', required_treatments: ['analgesia'], need_exam: true },
    { id: 10, name: 'サトウ ユミ', age: 19, gender: 'F', scene_triage_color: '黄', diagnosis: '頭部打撲・軽度意識障害', required_treatments: ['c-collar'], need_exam: true },
    { id: 11, name: 'サイトウ ツバサ', age: 44, gender: 'M', scene_triage_color: '黄', diagnosis: '鎖骨骨折・肩関節脱臼', required_treatments: ['triangular_bandage'], need_exam: true },

    { id: 12, name: 'スズキ タロウ', age: 31, gender: 'M', scene_triage_color: '緑', diagnosis: '右手首捻挫', required_treatments: [], need_exam: false },
    { id: 13, name: 'タナカ ハナコ', age: 67, gender: 'F', scene_triage_color: '緑', diagnosis: '左下腿擦過傷', required_treatments: [], need_exam: false },
    { id: 14, name: 'ナカムラ ジロウ', age: 53, gender: 'M', scene_triage_color: '緑', diagnosis: '過換気症候群', required_treatments: [], need_exam: false },
    { id: 15, name: 'ハヤシ ヨウコ', age: 26, gender: 'F', scene_triage_color: '緑', diagnosis: '不安神経症', required_treatments: [], need_exam: false },
    { id: 16, name: 'ヤマダ イチロウ', age: 72, gender: 'M', scene_triage_color: '緑', diagnosis: '軽度頭部打撲', required_treatments: [], need_exam: false },
    { id: 17, name: 'イトウ サクラ', age: 22, gender: 'F', scene_triage_color: '緑', diagnosis: '左前腕切創・軽度出血', required_treatments: [], need_exam: false },
    { id: 18, name: 'タカハシ レン', age: 18, gender: 'M', scene_triage_color: '緑', diagnosis: '打撲・挫創', required_treatments: [], need_exam: false },
    { id: 19, name: 'ワタナベ アオイ', age: 35, gender: 'F', scene_triage_color: '緑', diagnosis: '全身過緊張', required_treatments: [], need_exam: false },

    { id: 20, name: 'コジマ ソウタ', age: 80, gender: 'M', scene_triage_color: '黒', diagnosis: '心肺停止・体温低下', required_treatments: [], need_exam: false }
];

// 3. 各患者オブジェクトのステータス初期化
const patients = patientTemplates.map(p => {
    // 0分〜20分の間にランダムに病着（秒単位）
    const arrivalDelay = Math.floor(Math.random() * 20 * 60 * 1000); 
    const arrivalTime = BASE_TIME + arrivalDelay;

    // トリアージ判定のランダム乖離 (15%の確率で誤判定)
    let triageColor = p.scene_triage_color;
    if (p.scene_triage_color !== '黒' && Math.random() < 0.15) {
        if (p.scene_triage_color === '赤') triageColor = '黄'; // アンダートリアージ
        else if (p.scene_triage_color === '黄') triageColor = Math.random() < 0.5 ? '赤' : '緑'; // 乖離
        else if (p.scene_triage_color === '緑') triageColor = '黄'; // オーバートリアージ
    }

    return {
        id: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        triage_color: triageColor, // 想定 (本来の設定値)
        scene_triage_color: triageColor, // 現場でトリアージした結果 (乖離判定用)
        diagnosis: p.diagnosis,
        required_treatments: p.required_treatments,
        need_exam: p.need_exam,
        status: '未着手',
        reception_time_ms: arrivalTime, // 病着時間
        triage_time_ms: null,
        initial_vs_time_ms: null,
        post_vs_time_ms: null, // 最終処置完了時間
        completed_treatments: [],
        tests_completed: false,
        stabilization_completed: false,
        vitals_initial_struct: {
            sbp: triageColor === '赤' ? '88' : '122',
            dbp: triageColor === '赤' ? '50' : '78',
            hr: triageColor === '赤' ? '125' : '82',
            rr: triageColor === '赤' ? '28' : '16',
            spo2: triageColor === '赤' ? '91' : '98',
            temp: '36.5',
            gcs_e: triageColor === '赤' ? '3' : '4',
            gcs_v: triageColor === '赤' ? '4' : '5',
            gcs_m: triageColor === '赤' ? '5' : '6'
        },
        vitals_initial: 'Vitals detail text'
    };
});

// 4. イベントスケジューリングと状態遷移エンジン
// 10名のプレイヤー：
// - Triage Staff (受付・トリアージ担当) : 2名
// - Doctor/Nurse (診療・処置担当) : 6名 (D1~D3, N1~N3)
// - Lab/Rad Tech (放射線/検査技師) : 2名 (T1~T2)
const triageStaff = [
    { id: 'TS1', busyUntil: 0 },
    { id: 'TS2', busyUntil: 0 }
];

const medicalStaff = [
    { id: 'MED1', busyUntil: 0 },
    { id: 'MED2', busyUntil: 0 },
    { id: 'MED3', busyUntil: 0 },
    { id: 'MED4', busyUntil: 0 },
    { id: 'MED5', busyUntil: 0 },
    { id: 'MED6', busyUntil: 0 }
];

const techStaff = [
    { id: 'TECH1', busyUntil: 0 },
    { id: 'TECH2', busyUntil: 0 }
];

// キューの管理
const triageQueue = []; // トリアージ待ち
const treatmentQueue = []; // 診療待ち
const examQueue = []; // 技師検査待ち

// シミュレーション実行 (秒ステップで進行)
console.log('--- 災害訓練シミュレーション開始 (1時間想定) ---');
console.log(`開始仮想時刻: ${new Date(BASE_TIME).toLocaleTimeString('ja-JP')}`);

for (let timeOffset = 0; timeOffset < DURATION_LIMIT; timeOffset += 1000) {
    const currentVirtualTime = BASE_TIME + timeOffset;

    // A. 患者の到着チェック
    patients.forEach(p => {
        if (p.reception_time_ms === currentVirtualTime) {
            triageQueue.push(p);
            p.status = '待合';
        }
    });

    // B. トリアージスタッフの稼働
    triageStaff.forEach(staff => {
        if (currentVirtualTime >= staff.busyUntil && triageQueue.length > 0) {
            // 到着順に処理
            const p = triageQueue.shift();
            p.status = 'トリアージ中';
            
            // トリアージ所要時間 (45秒〜90秒)
            const duration = (45 + Math.floor(Math.random() * 45)) * 1000;
            staff.busyUntil = currentVirtualTime + duration;
            p.triage_time_ms = currentVirtualTime + duration;
            
            // トリアージ完了後、診療待ちに投入 (黒以外)
            setTimeout(() => {
                p.status = 'トリアージ済';
                if (p.scene_triage_color !== '黒') {
                    treatmentQueue.push(p);
                } else {
                    p.status = '死亡確認';
                }
            }, duration);
        }
    });

    // C. 医師・看護師スタッフの稼働 (トリアージ済みの患者を診療)
    medicalStaff.forEach(staff => {
        if (currentVirtualTime >= staff.busyUntil && treatmentQueue.length > 0) {
            // トリアージ優先度順（赤 ＞ 黄 ＞ 緑）に並び替えて選択
            // ただし、混乱度を再現するために 15% の確率で順不同（到着順）で選択してしまう
            let pIndex = 0;
            if (Math.random() > 0.15) {
                const colorPriority = { '赤': 3, '黄': 2, '緑': 1 };
                let highestPriority = -1;
                for (let i = 0; i < treatmentQueue.length; i++) {
                    const pri = colorPriority[treatmentQueue[i].scene_triage_color] || 0;
                    if (pri > highestPriority) {
                        highestPriority = pri;
                        pIndex = i;
                    }
                }
            }
            
            const p = treatmentQueue.splice(pIndex, 1)[0];
            p.status = '診療中';

            // 1. まず初期バイタル測定＆診察 (所要時間: 90秒〜150秒)
            const examDuration = (90 + Math.floor(Math.random() * 60)) * 1000;
            staff.busyUntil = currentVirtualTime + examDuration;
            
            setTimeout(() => {
                p.initial_vs_time_ms = currentVirtualTime + examDuration;
                p.completed_treatments.push('vitals');
                p.completed_treatments.push('head_and_neck');
                p.completed_treatments.push('chest');
                p.completed_treatments.push('abdomen_and_pelvis');
                
                // 検査オーダーが必要かチェック
                if (p.need_exam && !p.tests_completed) {
                    p.status = '検査待ち';
                    examQueue.push(p);
                } else {
                    // 処置ステップへ移行
                    conductTreatment(p, staff, currentVirtualTime + examDuration);
                }
            }, examDuration);
        }
    });

    // D. 技師の稼働 (検査待ち患者をスキャンして実施)
    techStaff.forEach(staff => {
        if (currentVirtualTime >= staff.busyUntil && examQueue.length > 0) {
            // 優先順 (トリアージ順)
            examQueue.sort((a, b) => {
                const colorPriority = { '赤': 3, '黄': 2, '緑': 1 };
                return (colorPriority[b.scene_triage_color] || 0) - (colorPriority[a.scene_triage_color] || 0);
            });
            const p = examQueue.shift();
            p.status = '検査中';
            
            // 検査完了所要時間 (2分〜3分)
            const duration = (120 + Math.floor(Math.random() * 60)) * 1000;
            staff.busyUntil = currentVirtualTime + duration;

            setTimeout(() => {
                p.tests_completed = true;
                p.stabilization_completed = true; // 血液も完了
                p.status = '検査完了';
                
                // 再び治療待ちに戻す
                treatmentQueue.push(p);
            }, duration);
        }
    });
}

// 診療中の処置実施サブフロー
function conductTreatment(p, staff, currentTime) {
    if (p.required_treatments.length === 0) {
        // 処置なし（緑など）は即完了
        p.post_vs_time_ms = currentTime;
        p.status = '安定化・完了';
        return;
    }

    // まだ終わっていない必須処置があるか
    const undone = p.required_treatments.filter(id => !p.completed_treatments.includes(id));
    if (undone.length > 0) {
        const nextTreatment = undone[0];
        p.status = `処置実施中(${nextTreatment})`;
        
        // 処置時間 (2分〜4分)
        const duration = (120 + Math.floor(Math.random() * 120)) * 1000;
        staff.busyUntil = currentTime + duration;
        
        setTimeout(() => {
            p.completed_treatments.push(nextTreatment);
            
            // 次の処置があるか再帰的に呼び出し
            const remaining = p.required_treatments.filter(id => !p.completed_treatments.includes(id));
            if (remaining.length > 0) {
                // 継続処置
                conductTreatment(p, staff, currentTime + duration);
            } else {
                p.post_vs_time_ms = currentTime + duration;
                p.status = '安定化・完了';
            }
        }, duration);
    } else {
        p.post_vs_time_ms = currentTime;
        p.status = '安定化・完了';
    }
}

// タイマー遅延実行のエミュレーションを即時実行するためのダミーsetTimeoutヘルパー
function setTimeout(fn, delay) {
    fn();
}

// 5. 振り返り用CSVの出力
const formatTime = (ms) => {
    if (!ms) return '';
    const d = new Date(ms);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

const escapeCSV = (str) => {
    if (!str) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

const calcMinutes = (start, end) => {
    if (!start || !end) return '';
    const diffMs = end - start;
    if (diffMs < 0) return '0';
    return (diffMs / (1000 * 60)).toFixed(1);
};

const triageDiff = (p) => {
    if (p.scene_triage_color === p.triage_color) return '一致';
    const severity = { '赤': 4, '黄': 3, '緑': 2, '黒': 1 };
    const sceneSev = severity[p.scene_triage_color] || 0;
    const realSev = severity[p.triage_color] || 0;
    if (sceneSev > realSev) return 'オーバートリアージ';
    if (sceneSev < realSev) return 'アンダートリアージ';
    return '';
};

// CSVの組み立て
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
        formatTime(p.triage_time_ms),
        formatTime(p.initial_vs_time_ms),
        formatTime(p.post_vs_time_ms),
        p.completed_treatments.join(','),
        p.tests_completed ? '済' : '未',
        p.stabilization_completed ? '済' : '未',
        vs_i.sbp, vs_i.dbp, vs_i.hr, vs_i.rr, vs_i.spo2, vs_i.temp, vs_i.gcs_e, vs_i.gcs_v, vs_i.gcs_m,
        'Vitals initial mock text',
        calcMinutes(p.reception_time_ms, p.triage_time_ms),
        calcMinutes(p.triage_time_ms, p.initial_vs_time_ms),
        calcMinutes(p.reception_time_ms, p.post_vs_time_ms),
        'なし',
        triageDiff(p)
    ];
    return row.map(cell => escapeCSV(cell)).join(',');
});

const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

// CSVファイルに書き込み
const outPath = path.join(__dirname, '../simulated_training_log.csv');
fs.writeFileSync(outPath, csvContent, 'utf-8');
console.log(`\nシミュレーションログCSVを出力しました: ${outPath}`);

// 6. コソール要約 (KPI分析用)
const totalPatients = patients.length;
const completedCount = patients.filter(p => p.status === '安定化・完了' || p.status === '死亡確認').length;
const vsMeasuredCount = patients.filter(p => p.initial_vs_time_ms !== null).length;
const triageCount = patients.filter(p => p.triage_time_ms !== null).length;

console.log('\n======================================');
console.log('   シミュレーション結果サマリー');
console.log('======================================');
console.log(`総患者数: ${totalPatients} 名`);
console.log(`トリアージ完了: ${triageCount} 名`);
console.log(`初期評価完了: ${vsMeasuredCount} 名`);
console.log(`治療完了 / 終了: ${completedCount} 名`);

// 乖離分析
const correctTriage = patients.filter(p => triageDiff(p) === '一致').length;
const overTriage = patients.filter(p => triageDiff(p) === 'オーバートリアージ').length;
const underTriage = patients.filter(p => triageDiff(p) === 'アンダートリアージ').length;
console.log(`\nトリアージ一致率: ${((correctTriage / triageCount) * 100).toFixed(1)}% (${correctTriage}/${triageCount})`);
console.log(`オーバートリアージ: ${overTriage} 名`);
console.log(`アンダートリアージ: ${underTriage} 名`);

// 平均時間
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
