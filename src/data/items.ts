// 物品マスターデータ
// 各物品のQRをスキャンすると対応する treatment_id として記録される

export interface MedicalItem {
  /** QRコードに埋め込む物品ID */
  item_id: string
  /** 表示名 */
  name: string
  /** マッピング先の treatment_id */
  maps_to_treatment_id: string
  /** カテゴリ（表示グループ分け用） */
  category: string
}

export const MEDICAL_ITEMS: MedicalItem[] = [
  // ルート・輸液
  { item_id: 'iv_access_kit',    name: 'ルート確保セット',        maps_to_treatment_id: 'iv_access',         category: '輸液・ルート' },
  { item_id: 'iv_fluid_set',     name: '輸液セット',              maps_to_treatment_id: 'iv_fluid',          category: '輸液・ルート' },
  { item_id: 'blood_bag',        name: '輸血バッグ',              maps_to_treatment_id: 'blood_transfusion', category: '輸液・ルート' },

  // 気道・呼吸
  { item_id: 'oxygen_mask',      name: '酸素マスク',              maps_to_treatment_id: 'oxygen',            category: '気道・呼吸' },
  { item_id: 'intubation_kit',   name: '挿管セット',              maps_to_treatment_id: 'intubation',        category: '気道・呼吸' },
  { item_id: 'chest_tube_kit',   name: 'トロッカーカテーテル',    maps_to_treatment_id: 'chest_tube',        category: '気道・呼吸' },

  // 固定・止血
  { item_id: 'pelvic_binder',    name: '骨盤固定バンド',          maps_to_treatment_id: 'pelvic_binder',     category: '固定・止血' },
  { item_id: 'tourniquet_band',  name: '止血帯',                  maps_to_treatment_id: 'tourniquet',        category: '固定・止血' },
  { item_id: 'traction_device',  name: '牽引装置',                maps_to_treatment_id: 'traction',          category: '固定・止血' },

  // 検査
  { item_id: 'ct_scan_slip',     name: 'CT オーダー票',          maps_to_treatment_id: 'ct',                category: '検査' },
  { item_id: 'xray_slip',        name: 'X-P オーダー票',         maps_to_treatment_id: 'xray',              category: '検査' },
  { item_id: 'xray_ct_slip',     name: 'X-P/CT オーダー票',      maps_to_treatment_id: 'xray_ct',           category: '検査' },

  // 薬剤
  { item_id: 'medication_bag',   name: '薬剤バッグ',             maps_to_treatment_id: 'medication',        category: '薬剤' },
  { item_id: 'sedation_kit',     name: '鎮静剤セット',           maps_to_treatment_id: 'sedation',          category: '薬剤' },

  // 処置
  { item_id: 'suture_kit',       name: '縫合セット',             maps_to_treatment_id: 'suture',            category: '処置' },
  { item_id: 'cpr_board',        name: 'CPRボード',              maps_to_treatment_id: 'cpr',               category: '処置' },
  { item_id: 'breathing_kit',    name: '呼吸誘導セット',         maps_to_treatment_id: 'breathing_support', category: '処置' },
]

/** item_id から MedicalItem を検索する */
export function getMedicalItemById(itemId: string): MedicalItem | undefined {
  return MEDICAL_ITEMS.find(item => item.item_id === itemId)
}

/** カテゴリ名の一覧を取得する */
export function getItemCategories(): string[] {
  return [...new Set(MEDICAL_ITEMS.map(item => item.category))]
}
