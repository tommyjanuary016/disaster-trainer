// QRコードの型定義とパースユーティリティ

/** QRコードの種別 */
export type QRCodeType = 'patient' | 'procedure' | 'item'

/** QRコードのパース結果 */
export interface ParsedQRCode {
  type: QRCodeType
  id: string
}

/**
 * QRコードの文字列をパースして種別とIDを返す。
 * 不正なフォーマットの場合は null を返す。
 */
export function parseQRCode(text: string): ParsedQRCode | null {
  if (text.startsWith('patient:'))   return { type: 'patient',   id: text.slice(8) }
  if (text.startsWith('procedure:')) return { type: 'procedure', id: text.slice(10) }
  if (text.startsWith('item:'))      return { type: 'item',      id: text.slice(5) }
  return null
}

/**
 * 患者QRコードの文字列を生成する
 */
export function makePatientQR(patientId: number): string {
  return `patient:${patientId}`
}

/**
 * 手技QRコードの文字列を生成する
 */
export function makeProcedureQR(procedureId: string): string {
  return `procedure:${procedureId}`
}

/**
 * 物品QRコードの文字列を生成する
 */
export function makeItemQR(itemId: string): string {
  return `item:${itemId}`
}
