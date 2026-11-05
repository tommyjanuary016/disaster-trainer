// 臨床処置・手技マスターデータ
// 各処置・手技のID、名称、カテゴリ、説明

export interface ProcedureDefinition {
  id: string
  name: string
  category: string
  description?: string
}

export const PROCEDURES_MASTER: ProcedureDefinition[] = [
  // 診察・バイタル
  { id: 'triage',             name: 'トリアージ迅速評価 (V/S測定)', category: '診察・評価', description: '初期バイタル測定および全身外観評価' },
  { id: 'vitals',             name: '診療エリア詳細評価 (V/S測定)', category: '診察・評価', description: '診療エリアでの系統的バイタルサイン測定' },
  { id: 'head_and_neck',      name: '頭頸部診察',                   category: '診察・評価', description: '頭部外傷・頸静脈怒張・気管偏位等の確認' },
  { id: 'chest',              name: '胸部診察',                     category: '診察・評価', description: '呼吸音・胸郭変形・皮下気腫・打診痛の確認' },
  { id: 'abdomen_and_pelvis', name: '腹部・骨盤診察',               category: '診察・評価', description: '腹膜刺激徴候・骨盤動揺の確認' },
  { id: 'limbs',              name: '四肢診察',                     category: '診察・評価', description: '変形・腫脹・末梢動脈拍動・運動知覚の確認' },
  { id: 'fast',               name: '超音波検査 (FAST)',            category: '診察・評価', description: '心嚢・腹腔内出血・胸腔出血の迅速エコー診断' },
  { id: 'ample',              name: '問診 (AMPLE聴取)',             category: '診察・評価', description: 'アレルギー・持病・内服薬・最終食事等の聴取' },
  { id: 'background',         name: '状況・受傷機転の聴取',         category: '診察・評価', description: '事故状況や受傷の経緯の確認' },

  // 気道・呼吸
  { id: 'oxygen',             name: '酸素マスク投与',               category: '気道・呼吸', description: 'リザーバーマスク等による高濃度酸素投与' },
  { id: 'hfnc',               name: 'ハイフロー酸素吸入 (HFNC)',    category: '気道・呼吸', description: '高流量鼻カニューラ酸素療法' },
  { id: 'intubation',         name: '気管挿管',                     category: '気道・呼吸', description: '喉頭鏡を用いた気管内チューブ留置' },
  { id: 'surgical_airway',    name: '外科的気道確保',               category: '気道・呼吸', description: '輪状甲状膜切開・切開穿刺' },
  { id: 'ventilator',         name: '人工呼吸器管理',               category: '気道・呼吸', description: '人工呼吸器の接続と換気管理' },
  { id: 'needle_decompression', name: '胸腔穿刺 (緊急脱気)',        category: '気道・呼吸', description: '緊張性気胸に対する緊急減圧' },
  { id: 'chest_tube',         name: '胸腔ドレーン挿入',             category: '気道・呼吸', description: '血胸・気胸に対する胸腔ドレナージ' },
  { id: 'gauze_towel_fixation', name: 'ガーゼ・タオル固定',         category: '気道・呼吸', description: '動揺胸郭等に対する外固定・圧迫' },
  { id: 'three_sided_taping', name: '三辺テーピング',               category: '気道・呼吸', description: '開放性気胸に対するチェック弁ドレッシング' },

  // 循環・輸液・輸血
  { id: 'iv_access',          name: '末梢静脈路確保 (1本目)',       category: '循環・輸液', description: '末梢血管への点滴ライン確保' },
  { id: 'iv_access_2',        name: '末梢静脈路確保 (2本目)',       category: '循環・輸液', description: '急速輸液用の2本目の静脈路確保' },
  { id: 'cv_access',          name: '中心静脈路確保 (CV)',          category: '循環・輸液', description: '内頸・鎖骨下静脈からの太い中心静脈ライン確保' },
  { id: 'quinton_catheter',   name: '太径カテーテル挿入 (クイントン)', category: '循環・輸液', description: '大量輸血・急性血液浄化用カテーテル' },
  { id: 'iv_fluid',           name: '外液急速輸液 (加圧投与)',      category: '循環・輸液', description: '乳酸リンゲル液等の急速全開投与' },
  { id: 'blood_transfusion',  name: '緊急輸血 (RBC/FFP/PC)',        category: '循環・輸液', description: '赤血球・血漿・血小板の緊急輸血' },
  { id: 'tourniquet',         name: '止血帯装着 (ターニケット)',    category: '循環・輸液', description: '四肢大出血に対する圧迫止血帯' },

  // 固定・止血・処置
  { id: 'pelvic_binder',      name: '骨盤固定具装着 (サムスリング)', category: '固定・止血', description: '骨盤骨折・動揺骨盤の安定化' },
  { id: 'splint',             name: 'シーネ固定 (副子固定)',        category: '固定・止血', description: '四肢骨折・関節損傷の固定' },
  { id: 'traction',           name: '直達牽引・牽引固定',           category: '固定・止血', description: '大腿骨骨折等の牽引整復・固定' },
  { id: 'suture',             name: '創傷処置 (洗浄・縫合)',        category: '固定・止血', description: '切創・挫創の局所洗浄と縫合' },

  // 薬剤投与
  { id: 'vasopressor',        name: '昇圧剤投与 (ノルアドレナリン等)', category: '薬剤投与', description: 'ショックに対する血管収縮・昇圧薬' },
  { id: 'antihypertensive',   name: '降圧剤投与 (ニカルジピン等)',  category: '薬剤投与', description: '頭蓋内出血・大動脈解離等の血圧降下薬' },
  { id: 'antibiotics',        name: '抗菌薬投与',                   category: '薬剤投与', description: '開放骨折・重度外傷に対する緊急抗菌薬' },
  { id: 'sedation',           name: '鎮静・鎮痛薬投与',             category: '薬剤投与', description: '疼痛緩和・処置時の鎮静鎮痛' },

  // 蘇生・高度救急医療
  { id: 'cpr',                name: '胸骨圧迫 / 心肺蘇生 (ACLS)',    category: '蘇生・高度救急', description: '心停止に対する高品質CPRおよびACLSプロトコル' },
  { id: 'fasciotomy',         name: '減張切開',                     category: '蘇生・高度救急', description: 'コンパートメント症候群に対する筋膜切開' },
  { id: 'open_cardiac_massage', name: '開胸心臓マッサージ',         category: '蘇生・高度救急', description: '緊急開胸による直視下心臓マッサージ' },
  { id: 'aortic_cross_clamping', name: '開胸大動脈遮断 (クランプ)',  category: '蘇生・高度救急', description: '横隔膜直上での下行動脈遮断' },
  { id: 'exploratory_laparotomy', name: '緊急開腹手術 (ダメージコントロール)', category: '蘇生・高度救急', description: '活動性腹腔内出血のパッキング・止血' },
  { id: 'emergency_c_section', name: '死戦期帝王切開 (PMCA)',       category: '蘇生・高度救急', description: '母体・胎児救命のための蘇生的開腹帝王切開' },
  { id: 'iabo',               name: '大動脈バルーン遮断 (IABO/REBOA)', category: '蘇生・高度救急', description: '大腿動脈経由のカテーテル的大動脈血流遮断' },
  { id: 'iabp',               name: '大動脈バルーンパンピング (IABP)', category: '蘇生・高度救急', description: '冠血流増加・後負荷軽減の補助循環' },
  { id: 'pcps',               name: '体外式膜型人工肺 (PCPS/VA-ECMO)', category: '蘇生・高度救急', description: '重症心肺虚脱に対する緊急補助循環' },
  { id: 'pericardiocentesis', name: '心嚢穿刺ドレナージ',           category: '蘇生・高度救急', description: '心タンポナーデに対する緊急排液' },
]

export const PROCEDURE_CATEGORIES = [
  '気道・呼吸',
  '循環・輸液',
  '診察・評価',
  '固定・止血',
  '薬剤投与',
  '蘇生・高度救急',
]
