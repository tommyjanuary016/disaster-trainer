import { Patient } from '../types/patient'

export const mockPatients: Patient[] = [
  {
    id: 1,
    name: 'アカシ シンイチ',
    age: 65,
    gender: 'M',
    triage_color: '赤',
    vitals_triage: 'GCS:E3V4M5\n・BP82/55\n・HR：120\n・R:28\n・SPO2:98％\n（10L)\n・KT:35.8',
    vitals_initial: 'GCS:E2V4M5\n・BP:70/48\n・HR：120\n・R:30\n・SPO2:98%（10L)\n・KT:35.5',
    vitals_post: 'GCS:E4V5M5\n・BP:104/60\n・HR：90\n・R:28\n・SPO2:99%（10L)\n・KT:35.8',
    findings: {
      head_and_neck: '顔面に打撲痕あり',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '下腹部右側に打撲痕\n・骨盤：腸骨稜に圧痛、骨盤の同様あり',
      limbs: '右下肢の短縮あり、右大腿部に打撲痕あり',
      fast: 'ダグラスク窩にecho free space(＋)',
      ample: 'A:アレルギー：なし\n・M:内服薬：高血圧で降圧剤のみ\n・P:既往歴：高血圧\n・L:最終飲食：事故の2時間前に昼食\n・E受傷機転：通院帰りに乗っていたバスが多重事故に巻き込まれ、座席から転落し骨盤を強く打った。',
      background: '妻（62歳）と2人暮らし、子供は成人し大阪在住、門司区在住、トラック運転手、週3日勤務、ADL自立'
    },
    diagnosis: '骨盤骨折',
    required_treatments: [
      { treatment_id: 'iv_fluid', treatment_name: '外液急速投与 (2L負荷)', lock_timer_minutes: 0 },
      { treatment_id: 'blood_transfusion', treatment_name: '緊急輸血 (RBC4/FFP4)', lock_timer_minutes: 0 },
      { treatment_id: 'pelvic_binder', treatment_name: 'サムスリング装着 (骨盤固定)', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 2,
    name: 'ナリタ タケシ',
    age: 78,
    gender: 'M',
    triage_color: '赤',
    vitals_triage: 'GCS:E3V3M5\n・BP95/66\n・HR：122\n・R:36\n・SPO2:90%\n（10L)\n・KT:36.0',
    vitals_initial: 'GCS:E3V3M4\n・BP88/40\n・HR：130\n・R:36\n・SPO2:88%（10L)\n・KT:36.0',
    vitals_post: 'GCS:E3V4M5\n・BP130/70\n・HR：102\n・R:20\n・SPO2:98%（10L)\n・KT:36.0',
    findings: {
      head_and_neck: '頸静脈怒張あり\n・左側に気管支偏位あり',
      chest: '右前胸部に痛みと打撲痕あり、右呼吸音減弱、右胸郭運動の低下、右胸部に皮下気腫、打診で鼓音',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '右大腿部に打撲痕と痛みあり、下肢短縮なし',
      fast: '右胸腔内でiung slidingとcommet tailartifactの消失',
      ample: 'A:アレルギー：なし\n・M:内服薬：降圧剤、抗不整脈\n・P:既往歴：高血圧・不整脈\n・L:最終飲食：事故の3時間前に軽食\n・E受傷機転：バスが多重事故にて右側胸部を強打→急激な呼吸苦出現。',
      background: '妻（73歳）と2人暮らしで門司区在住。長男・長女は県内在住（小倉と福岡市）退職後、地域の清掃ボランチェアに週2回参加、ADL自立、杖なしで歩行可能'
    },
    diagnosis: '右緊張性気胸',
    required_treatments: [
      { treatment_id: 'chest_tube', treatment_name: '胸腔ドレーン挿入', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 3,
    name: 'カワグチ ハルカ',
    age: 30,
    gender: 'F',
    triage_color: '緑',
    vitals_triage: 'GCS:E2V3M6\n・BP140/95\n・HR：119\n・R:35\n・SPO2:100%\n・KT:36.6',
    vitals_initial: 'GCS:E2V2M6\n・BP140/101\n・HR：128\n・R:40\n・SPO2:100%\n・KT:36.7',
    vitals_post: 'GCS:E4V5M6\n・BP106/48\n・HR：90\n・R:20\n・SPO2:99%\n・KT:36.0',
    findings: {
      head_and_neck: '口唇の震えあり',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '四肢に擦過傷あり、血圧計による加圧でトリソー徴候出現',
      fast: '明らかな異常なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：不安症で過去に過換気発作が数回、妊娠なし（本人談）\n・L:最終飲食：事故の1時間前に軽食\n・E受傷機転：乗車したバスが多重事故',
      background: '夫（32歳）と2人暮らし、子供なし、実家は北九州市若松区、門司区在住、事務職（デスクワーク）、不安神経症で心療内科通院歴あり（現在落ちついている）、ADL自立'
    },
    diagnosis: '過換気症候群',
    required_treatments: [
      { treatment_id: 'sedation', treatment_name: '鎮静・鎮痛薬投与', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 4,
    name: 'オダ エイイチロウ',
    age: 35,
    gender: 'M',
    triage_color: '赤',
    vitals_triage: 'GCS:E3V4M5\n・BP86/60\n・HR：120\n・R:26\n・SPO2:97%\n(10L)\n・KT:36.4',
    vitals_initial: 'GCS:E2V4M5\n・BP86/50\n・HR：124\n・R:30\n・SPO2:97%\n(10L)\n・KT:36.5',
    vitals_post: 'GCS:E2V5M5\n・BP88/58\n・HR：100\n・R:24\n・SPO2:97%\n(6L)\n・KT:35.5',
    findings: {
      head_and_neck: '前額部に皮下血腫',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '左背部〜側腹部にかけて打撲痕と痛み',
      limbs: '左上腕に打撲痕',
      fast: '脾腎境界にecho free space(＋)',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：なし\n・L:最終飲食：事故の2時間前に昼食\n・E受傷機転：バスが事故で左側に体ごと強く打ちつけられた',
      background: '妻（33歳)、子供(3歳)の3人で門司区に在住、工場勤務、交代制勤務、週末は子供の保育園行事に参加、ADL自立、健康状態は普段は良好'
    },
    diagnosis: '左腎損傷 GradeⅣ',
    required_treatments: [
      { treatment_id: 'iv_fluid', treatment_name: '外液急速投与', lock_timer_minutes: 0 },
      { treatment_id: 'blood_transfusion', treatment_name: '緊急輸血 (RBC/FFP)', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 5,
    name: 'スズキ ハナ',
    age: 26,
    gender: 'F',
    triage_color: '赤',
    vitals_triage: 'GCS:E3V1M4\n・BP104/82\n・HR：106\n・R:36\n・SPO2:90%\n(10L)\n・KT:36.5',
    vitals_initial: 'GCS:E3V1M4\n・BP90/70\n・HR：110\n・R:40\n・SPO2:88%\n(10L)\n・KT:36.6\nCRT延長',
    vitals_post: 'RASS :-4\n・BP110/80\n・HR：88\n・R:15\n(人工呼吸器管理下）\n・SPO2:100%\n・KT:36.4',
    findings: {
      head_and_neck: '下顎の変形と動揺、泡沫様の血液が口腔内から溢流',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '明らかな外傷性変化なし',
      fast: '明らかな異常なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：虫歯治療のみ\n・L:最終飲食：事故の2時間前に昼食（パン・コーヒー）\n・E受傷機転：バスが事故で前方へ投げ出され、座席に顔面強打',
      background: '夫（28歳）と2人暮らし、兄1人（市内住んでいる）、小倉北区在住、接客業、　健康良好、ADL自立'
    },
    diagnosis: '下顎骨折 気道閉塞',
    required_treatments: [
      { treatment_id: 'iv_fluid', treatment_name: '外液急速投与', lock_timer_minutes: 0 },
      { treatment_id: 'intubation', treatment_name: '気管挿管', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 6,
    name: 'ヨシノ キョウコ',
    age: 48,
    gender: 'F',
    triage_color: '赤',
    vitals_triage: 'GCS:E2V2M4\n・BP187/106\n・HR：64\n・R:10\n・SPO2:97%\n(10L)\n・KT:37.1',
    vitals_initial: 'GCS:E1V2M4\n・BP220/110\n・HR：55\n・R:6\n・SPO2:95%\n(10L)\n・KT:37.0',
    vitals_post: 'GCS:E1T1M4\n・BP166/98\n・HR：66\n・R:10\n・SPO2:100%\n(10L)\n・KT:37.0\n',
    findings: {
      head_and_neck: '右頭部に打撲痕あり、瞳孔5.0/2.5、右対光反射消失、右共同偏視あり',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '明らかな外傷性変化なし',
      fast: '明らかな異常なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：降圧剤内服\n・P:既往歴：高血圧、片頭痛、妊娠なし\n・L:最終飲食：事故の2時間前に昼食\n・E受傷機転：バス同士の衝突により座席から転倒し右側頭部を強打',
      background: '夫(50歳)と2人暮らし、子供2人（大学生・福岡市在住）、門司区在住、スーパーのパート勤務（週4日）、家事と仕事の両立で多忙'
    },
    diagnosis: '右頭蓋内血腫',
    required_treatments: [
      { treatment_id: 'iv_access', treatment_name: '静脈路確保(末梢)', lock_timer_minutes: 0 },
      { treatment_id: 'intubation', treatment_name: '気管挿管', lock_timer_minutes: 0 },
      { treatment_id: 'antihypertensive', treatment_name: '降圧剤投与', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 7,
    name: 'ナカゾノ ユウヤ',
    age: 28,
    gender: 'M',
    triage_color: '赤',
    vitals_triage: 'GCS:E4V5M6\n・BP120/68\n・HR：100\n・R:26\n・SPO2:92％\n（RA）\n・KT:36.0',
    vitals_initial: 'GCS:E4V5M6\n・BP122/60\n・HR：102\n・R:28\n・SPO2:92％\n（RA）\n・KT:36.0',
    vitals_post: 'SPO2:98%まで改善。呼吸困難軽減。',
    findings: {
      head_and_neck: '明らかな外傷性変化なし',
      chest: '左前胸部痛、左前胸部に打撲痕、左肺野で呼吸音減弱、左前胸部〜側胸部に握雪感あり',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '明らかな外傷性変化なし',
      fast: '左肺でlung slidingの消失',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：なし\n・L:最終飲食：事故の3時間前に昼食（ラーメン）\n・E受傷機転：バス乗車中、門司駅付近で多重事故に遭遇。急停止と衝突で左胸部を座席に強打',
      background: '両親と同居（門司区）、独身、門司区在住、会社員（営業職）、フルタイム勤務'
    },
    diagnosis: '左外傷性気胸',
    required_treatments: [
      { treatment_id: 'chest_tube', treatment_name: '胸腔ドレーン挿入', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 8,
    name: 'ワタナベ エリコ',
    age: 67,
    gender: 'F',
    triage_color: '黄',
    vitals_triage: 'GCS:E4V5M6\n・BP170/87\n・HR：85\n・R:20\n・SPO2:97％\n（RA）\n・KT:36.0',
    vitals_initial: 'GCS:E4V5M6\n・BP164/88\n・HR：79\n・R:20\n・SPO2:97％\n（RA）\n・KT:35.9',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '頭部に打撲痕あり',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '四肢に擦過傷あり、右股関節痛あり、右下肢短縮あり、パトリックテスト陽性',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：降圧剤内服（詳細不明）\n・P:既往歴：高血圧症、妊娠なし\n・L:最終飲食：事故の2時間前に軽食\n・E受傷機転：門司駅付近でバスが急停止・衝突。転倒し右側から座席・床に強打',
      background: '夫（70歳）と2人暮らし。門司区在住。子供は成人し福岡市内在住、日常生活自立、買い物などは徒歩・バス利用。'
    },
    diagnosis: '右大腿骨頸部骨折',
    required_treatments: [
      { treatment_id: 'splint', treatment_name: 'シーネ固定', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 9,
    name: 'サイトウ コウイチ',
    age: 67,
    gender: 'M',
    triage_color: '黄',
    vitals_triage: 'GCS:E3V4M5\n・BP168/102\n・HR：99\n・R:20\n・SPO2:99％\n（RA）\n・KT:36.2',
    vitals_initial: 'GCS:E3V4M5\n・BP167/100\n・HR：99\n・R:22\n・SPO2:99％\n（RA）\n・KT:36.3',
    vitals_post: 'GCS:E3V4M5\n・BP130/85\n・HR：91\n・R:22\n・SPO2:99％\n（RA）\n・KT:36.3',
    findings: {
      head_and_neck: '頭頂部の皮下血腫、顔面に打撲痕、歯牙の欠損あり',
      chest: '明らかな身体所見なし',
      abdomen_and_pelvis: '明らかな身体所見なし',
      limbs: '右前腕、及び膝関節に擦過傷あり',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：降圧剤内服（名称不明）\n・P:既往歴：高血圧症\n・L:最終飲食：事故の1時間前に間食\n・E受傷機転：門司駅付近でバスが衝突。立位でバランスを崩し転倒。頭頂部と顔面を床・手すりに強打',
      background: '妻（65歳）と2人暮らし。子供は成人し県外在住。門司区在住、定年退職後、地域活動に参加。日常生活は自立。'
    },
    diagnosis: '外傷性SAH',
    required_treatments: [
      { treatment_id: 'iv_access', treatment_name: '静脈路確保(末梢)', lock_timer_minutes: 0 },
      { treatment_id: 'antihypertensive', treatment_name: '降圧剤投与', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 10,
    name: 'コウモト マホ',
    age: 28,
    gender: 'F',
    triage_color: '黄',
    vitals_triage: 'GCS:E4V4M6\n・BP162/98\n・HR：105\n・R:24\n・SPO2:99％\n（RA）\n・KT:36.4',
    vitals_initial: 'GCS:E4V4M6\n・BP161/98\n・HR：106\n・R:22\n・SPO2:99％\n（RA）\n・KT:36.4',
    vitals_post: 'GCS:E4V4M6\n・BP128/77\n・HR：100\n・R:20\n・SPO2:99％\n（RA）\n・KT:36.4',
    findings: {
      head_and_neck: '後頭部血腫と擦過傷あり、右顔面打撲痕あり',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '明らかな外傷性変化なし',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：なし、妊娠なし\n・L:最終飲食：事故の1時間前に軽食\n・E受傷機転：門司駅付近でバスが衝突。立位でよろけ後方に転倒し、後頭部と顔面を手すり・床に打撲。',
      background: '夫（60歳）と子供（男児5歳：コウモト　ヒロト）の3人暮らし。門司区在住。会社員（事務職）フルタイム勤務。'
    },
    diagnosis: '脳挫傷',
    required_treatments: [
      { treatment_id: 'iv_access', treatment_name: '静脈路確保(末梢)', lock_timer_minutes: 0 },
      { treatment_id: 'antihypertensive', treatment_name: '降圧剤投与', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 11,
    name: 'サクライ ジュンコ',
    age: 69,
    gender: 'F',
    triage_color: '緑',
    vitals_triage: 'GCS:E4V5M5\n・BP172/90\n・HR：90\n・R:20\n・SPO2:97％\n（RA）\n・KT:36.7',
    vitals_initial: 'GCS:E4V5M5\n・BP168/88\n・HR：88\n・R:20\n・SPO2:98％\n（RA）\n・KT:36.7',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '明らかな外傷性変化なし',
      chest: '前胸部・側胸部に打撲痕あり',
      abdomen_and_pelvis: '右上腹部、左側腹部に打撲痕あり',
      limbs: '四肢に数箇所打撲痕あり',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：骨粗鬆症治療薬、降圧剤内服中\n・P:既往歴：高血圧症、骨粗鬆症\n・L:最終飲食：事故の1時間前に軽食\n・E受傷機転：門司駅付近でバスが衝突。座位から前後にふさぶられ、体幹・四肢を座席や手すりに強打。',
      background: '夫（72歳）と2人暮らし。子供は成人し県外在住。門司区在住。外出は主に徒歩とバス。日常生活は自立。'
    },
    diagnosis: '全身打撲傷',
    required_treatments: [
      { treatment_id: 'iv_access', treatment_name: '静脈路確保(末梢)', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 12,
    name: 'ミナミ タケシ',
    age: 70,
    gender: 'M',
    triage_color: '黄',
    vitals_triage: 'GCS:E4V5M6\n・BP168/95\n・HR：82\n・R:24\n・SPO2:99％\n（RA）\n・KT:36.7',
    vitals_initial: 'GCS:E4V5M6\n・BP164/90\n・HR：78\n・R:24\n・SPO2:99％\n（RA）\n・KT:36.7',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '後頭部に皮下血腫',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '腰背部に体動時痛み',
      limbs: '下肢痺れなし',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：降圧剤内服（名称不明）\n・P:既往歴：高血圧症・腰椎症\n・L:最終飲食：事故の2時間前に昼食\n・E受傷機転：門司駅付近でバスが衝突。座位のまま強い衝撃を受け、体幹を前後に大きく揺さぶられ腰背部を強打。',
      background: '妻（68歳）と2人暮らし。子供は成人し県外在住。門司区在住。退職後、日常生活は自立。外出は主に徒歩とバス。'
    },
    diagnosis: '胸腰椎圧迫骨折',
    required_treatments: [
      { treatment_id: 'splint', treatment_name: 'シーネ固定', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 13,
    name: 'シマザキ ダイスケ',
    age: 53,
    gender: 'M',
    triage_color: '黄',
    vitals_triage: 'GCS:E4V5M6\n・BP160/75\n・HR：88\n・R:25\n・SPO2:100％\n（RA）\n・KT:36.6',
    vitals_initial: 'GCS:E4V5M6\n・BP162/78\n・HR：87\n・R:25\n・SPO2:100％\n（RA）\n・KT:36.5',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '明らかな外傷性変化なし',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '右大腿部に強い腫脹、変形',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：なし\n・L:最終飲食：事故の3時間前に昼食\n・E受傷機転：バス乗車中、門司駅付近でバスが衝突。立位で踏ん張れず転倒、右大腿部を座席フレームで強打。',
      background: '妻（50歳）と2人暮らし。子供は成人し県外在住。門司区在住。会社員（製造業）フルタイム勤務。'
    },
    diagnosis: '右大腿骨幹部骨折',
    required_treatments: [
      { treatment_id: 'traction', treatment_name: '直達牽引', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 14,
    name: 'オオクボ カヨ',
    age: 44,
    gender: 'F',
    triage_color: '黄',
    vitals_triage: 'GCS:E4V5M6\n・BP144/72\n・HR：90\n・R:26\n・SPO2:98％\n（RA）\n・KT:36.3',
    vitals_initial: 'GCS:E4V5M6\n・BP140/68\n・HR：85\n・R:28\n・SPO2:98％\n（RA）\n・KT:36.2',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '顔面に打撲痕',
      chest: '左前胸部に打撲痕',
      abdomen_and_pelvis: '下腹部に打撲痕',
      limbs: '左膝上、左下腿に打撲痕と腫脹痛み',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：なし、本人申告で妊娠なし\n・L:最終飲食：事故の2時間前に昼食\n・E受傷機転：バス乗車中、門司駅付近でバスが衝突。立位で踏ん張れず転倒、左膝上と下腿を座席フレームで強打。',
      background: '夫（46歳）と子供1人（中学生）の3人暮らし。門司区在住。パート勤務。自家用車とバスを併用。'
    },
    diagnosis: '左大腿骨顆上骨折、左脛腓骨骨折',
    required_treatments: [
      { treatment_id: 'traction', treatment_name: '直達牽引', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 15,
    name: 'スギタ ナオミ',
    age: 66,
    gender: 'F',
    triage_color: '緑',
    vitals_triage: 'GCS:E4V5M6\n・BP140/78\n・HR：79\n・R:20\n・SPO2:97％\n（RA）\n・KT:36.6',
    vitals_initial: 'GCS:E4V5M6\n・BP138/78\n・HR：79\n・R:20\n・SPO2:97％\n（RA）\n・KT:36.6',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '左頬部に打撲痕',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '右膝痛と挫創、右膝関節の屈曲伸展不可',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：変形性膝関節症（右）妊娠なし\n・L:最終飲食：事故の2時間前に軽食\n・E受傷機転：バス乗車中、門司駅付近でバスが衝突。立位から前方に転倒し右膝と顔面を強打。',
      background: '夫（68歳）と2人暮らし。子供は成人し県外在住。門司区在住。日常生活は自立。外出は主に徒歩とバス。'
    },
    diagnosis: '右膝蓋骨骨折',
    required_treatments: [
      { treatment_id: 'splint', treatment_name: 'シーネ固定', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 16,
    name: 'コウモト ヒロト',
    age: 5,
    gender: 'M',
    triage_color: '緑',
    vitals_triage: 'JCS:Ⅰ-1\n・BP:92/64\n・HR:112\n・SPO2:100%\n(RA)\n・R:24',
    vitals_initial: 'JCS:Ⅰ-1\n・BP:90/60\n・HR:110\n・SPO2:100%\n(RA)\n・R:24',
    vitals_post: 'V/S変動なし',
    findings: {
      head_and_neck: '前額部に約3cmの皮下血腫と擦過傷',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '明らかな外傷性変化なし',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：特記事項なし\n・L:最終飲食：事故の1時間前におやつ\n・E受傷機転：門司駅付近でバスが衝突。座席に額をぶつけ受傷',
      background: '母（28歳）・父と3人家族。両親と門司区在住。保育園通園中。'
    },
    diagnosis: '前額部打撲傷',
    required_treatments: [],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 17,
    name: 'シラキ ヒトミ',
    age: 66,
    gender: 'F',
    triage_color: '緑',
    vitals_triage: 'GCS:E4V5M6\n・BP102/55\n・HR：94\n・R:24\n・SPO2:96％\n（RA）\n・KT:36.8',
    vitals_initial: 'GCS:E4V5M6\n・BP102/50\n・HR：99\n・R:24\n・SPO2:96％\n（RA）\n・KT:36.8',
    vitals_post: 'V/S変動なし',
    findings: {
      head_and_neck: '明らかな外傷性変化なし',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '両肩の痛み、両上肢挙上困難、両上腕広範囲に内出血',
      fast: '明らかな外傷性変化なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：降圧剤内服中\n・P:既往歴：高血圧症・五十肩・妊娠なし\n・L:最終飲食：事故の約2時間前に昼食\n・E受傷機転：門司駅付近で乗っていたバスが衝突。座位のまま体を支えきれず、両肩と右上肢を座席・手すりに強打。',
      background: '夫（68歳）と2人暮らし。子供は成人し県外在住。門司区在住。退職後、日常生活は自立。外出は主に徒歩とバス。'
    },
    diagnosis: '両肩、右上肢打撲傷',
    required_treatments: [
      { treatment_id: 'splint', treatment_name: 'シーネ固定', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 18,
    name: 'ヤマグチ エミ',
    age: 31,
    gender: 'F',
    triage_color: '緑',
    vitals_triage: 'GCS:E4V5M6\n・BP132/70\n・HR：82\n・R:20\n・SPO2:98％\n（RA）\n・KT:36.5',
    vitals_initial: 'GCS:E4V5M6\n・BP134/68\n・HR：82\n・R:20\n・SPO2:98％\n（RA）\n・KT:36.5',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '頭痛あり、前額部〜頭頂部にかけて挫創形成、活動性出血なし',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '明らかな外傷性変化なし',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：歯科で鎮痛薬を処方されている\n・P:既往歴：う歯で治療中・妊娠なし\n・L:最終飲食：11時頃\n・E受傷機転：乗っていたバスが多重事故に遭遇。つり革を持って立っていたが前んい投げ出され頭部を打撲した。',
      background: '34歳の夫と6歳、3歳の子供と同居。門司区在住。兄の経営する会社でパートで働いている。'
    },
    diagnosis: '頭部挫創',
    required_treatments: [
      { treatment_id: 'suture', treatment_name: '挫創処置 (洗浄縫合)', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 19,
    name: 'ワカツキ ユミ',
    age: 25,
    gender: 'F',
    triage_color: '緑',
    vitals_triage: 'GCS:E4V5M6\n・BP112/61\n・HR：84\n・R:22\n・SPO2:99％\n（RA）\n・KT:37.2',
    vitals_initial: 'GCS:E4V5M6\n・BP110/64\n・HR：83\n・R:22\n・SPO2:99％\n（RA）\n・KT:37.2',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '明らかな外傷性変化なし',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '左腰部に打撲痕と痛み',
      limbs: '下肢痺れなし',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：妊娠なし\n・L:最終飲食：昼食後2時間\n・E受傷機転：乗っていたバスが多重事故に遭遇。座席を立とうと中腰になっていたところをバランスを崩して腰を打撲した。',
      background: '一人暮らし、両親と弟は福岡市に住んでいる。門司区在住、販売業。'
    },
    diagnosis: '腰部打撲傷',
    required_treatments: [
      { treatment_id: 'xray', treatment_name: 'X-P', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 20,
    name: 'タナカ レナ',
    age: 38,
    gender: 'F',
    triage_color: '黄',
    vitals_triage: 'GCS:E4V5M6\n・BP133/63\n・HR：90\n・R:15\n・SPO2:97％\n（RA）\n・KT:36.0',
    vitals_initial: 'GCS:E4V5M6\n・BP134/60\n・HR：94\n・R:15\n・SPO2:96％\n（RA）\n・KT:36.0',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '明らかな外傷性変化なし',
      chest: '右前胸部痛あり、吸気時に痛みが増悪、呼吸音は正常',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '明らかな外傷性変化なし',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：鎮痛薬時々使用\n・P:既往歴：妊娠なし\n・L:最終飲食：昼食後3時間\n・E受傷機転：乗っていたバスが多重事故に遭遇。衝突時に座席に胸を打ち付けた。',
      background: '夫（20歳）、子供2人。門司区在住、パート勤務。'
    },
    diagnosis: '右肋骨骨折',
    required_treatments: [
      { treatment_id: 'xray', treatment_name: 'X-P', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 21,
    name: 'サワノ エリカ',
    age: 19,
    gender: 'F',
    triage_color: '緑',
    vitals_triage: 'GCS:E4V5M6\n・BP102/55\n・HR：93\n・R:23\n・SPO2:98％\n（RA）\n・KT:36.9',
    vitals_initial: 'GCS:E4V5M6\n・BP108/58\n・HR：93\n・R:22\n・SPO2:100％\n（RA）\n・KT:36.9',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '鼻部を中心に顔面腫脹、鼻出血あり',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '明らかな外傷性変化なし',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：特記事項なし・妊娠なし\n・L:最終飲食：昼食後1時間\n・E受傷機転：乗っていたバスが多重事故に遭遇。前方に転倒し顔面を打撲。',
      background: '両親と同居。門司区在住、大学生'
    },
    diagnosis: '鼻骨骨折',
    required_treatments: [
      { treatment_id: 'ct', treatment_name: 'CT', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 22,
    name: 'タケウチ ユウコ',
    age: 31,
    gender: 'F',
    triage_color: '緑',
    vitals_triage: 'GCS:E4V5M6\n・BP130/77\n・HR：70\n・R:15\n・SPO2:98％\n（RA）\n・KT:36.3',
    vitals_initial: 'GCS:E4V5M6\n・BP132/78\n・HR：71\n・R:16\n・SPO2:97％\n（RA）\n・KT:36.3',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '明らかな外傷性変化なし',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '左肩の痛み、打撲痕あり、挙上可能',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：なし\n・P:既往歴：特記事項なし・妊娠なし\n・L:最終飲食：昼食後2時間\n・E受傷機転：乗っていたバスが多重事故に遭遇。立位で衝突し肩を打撲。',
      background: '夫と2人暮らし。門司区在住、事務職。'
    },
    diagnosis: '左肩、上腕打撲傷',
    required_treatments: [
      { treatment_id: 'xray', treatment_name: 'X-P', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 23,
    name: 'オシカタ シンゴ',
    age: 63,
    gender: 'M',
    triage_color: '緑',
    vitals_triage: 'GCS:E4V5M6\n・BP144/82\n・HR：68\n・R:18\n・SPO2:97％\n（RA）\n・KT:35.7',
    vitals_initial: 'GCS:E4V5M6\n・BP148/88\n・HR：64\n・R:18\n・SPO2:97％\n（RA）\n・KT:35.7',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '明らかな外傷性変化なし',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '右膝に擦過傷と腫脹あり',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：降圧剤\n・P:既往歴：高血圧\n・L:最終飲食：昼食後2時間\n・E受傷機転：乗っていたバスが多重事故に遭遇。衝突時に前方に踏み出し転倒。',
      background: '妻（60歳）と2人暮らし。門司区在住、退職後。'
    },
    diagnosis: '右膝打撲',
    required_treatments: [
      { treatment_id: 'xray', treatment_name: 'X-P', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 24,
    name: 'ハナヤマ カオル',
    age: 20,
    gender: 'F',
    triage_color: '黄',
    vitals_triage: 'GCS:E4V5M6\n・BP118/66\n・HR：82\n・R:20\n・SPO2:99％\n（RA）\n・KT:36.4',
    vitals_initial: 'GCS:E4V5M6\n・BP118/62\n・HR：85\n・R:15\n・SPO2:99％\n（RA）\n・KT:36.4',
    vitals_post: 'V/S変動なく安定',
    findings: {
      head_and_neck: '左側頭部お皮下血腫、左耳朶の腫脹、外出血なし',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '明らかな外傷性変化なし',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：セフェム系\n・M:内服薬：なし\n・P:既往歴：妊娠なし\n・L:最終飲食：事故の2時間前（パンとコーヒー）\n・E受傷機転：乗っていたバスが多重事故に遭遇。座席から投げ出され、手すりに左側頭部を打ち付けた。',
      background: '父親と要介護の祖母と中学生の弟と4人暮らし。門司区在住。専門学生。多忙な父に変わりに祖母の介護と弟の面倒を見ながら学業に追われるヤングケアラー。'
    },
    diagnosis: '頭部打撲傷',
    required_treatments: [
      { treatment_id: 'ct', treatment_name: 'CT', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  },
  {
    id: 25,
    name: 'ナカオカ キイチ',
    age: 55,
    gender: 'M',
    triage_color: '緑',
    vitals_triage: 'GCS:E4V5M6\n・BP106/95\n・HR：70\n・R:20\n・SPO2:98％\n（RA）\n・KT:36.9',
    vitals_initial: 'GCS:E4V5M6\n・BP154/91\n・HR：68\n・R:18\n・SPO2:97％\n（RA）\n・KT:36.8',
    vitals_post: 'V/S変動なし',
    findings: {
      head_and_neck: '明らかな外傷性変化なし',
      chest: '明らかな外傷性変化なし',
      abdomen_and_pelvis: '明らかな外傷性変化なし',
      limbs: '両膝に打撲痕と軽度の腫脹',
      fast: '明らかな異常所見なし',
      ample: 'A:アレルギー：なし\n・M:内服薬：メトホルミン\n・P:既往歴：糖尿病\n・L:最終飲食：事故の3時間前（菓子パン）\n・E受傷機転：乗っていたバスが多重事故に遭遇。つり革を持って立っていたが、バランスを崩し両膝から床について受傷。',
      background: '門司区在住、単身赴任。妻と高校生の息子は神奈川県に住んでいる。昼は企業の重役だが、裏の顔は登録者50万人を超える美少女系V-tuderであることを誰も知らない。'
    },
    diagnosis: '両膝打撲傷',
    required_treatments: [
      { treatment_id: 'xray', treatment_name: 'X-P', lock_timer_minutes: 0 }
    ],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    completed_treatments: []
  }
]
