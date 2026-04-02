import React from 'react'
import { ParsedQRCode } from '../types/qr'
import { getMedicalItemById } from '../data/items'
import { Patient } from '../types/patient'

// 手技IDと表示名のマッピング
const PROCEDURE_NAMES: Record<string, string> = {
  vitals:             'バイタルサイン測定',
  head_and_neck:      '頭頸部診察',
  chest:              '胸部診察',
  abdomen_and_pelvis: '腹部・骨盤診察',
  limbs:              '四肢診察',
  fast:               'FAST',
  ample:              'AMPLE',
  background:         '背景聴取',
  diagnosis:          '診断',
}

interface QRConfirmModalProps {
  /** パース済みQRコード情報 */
  parsed: ParsedQRCode
  /** 患者情報（患者QRの確認表示に使用） */
  patient?: Patient | null
  /** OK（確定）ボタン押下時のコールバック */
  onConfirm: () => void
  /** キャンセルボタン押下時のコールバック */
  onCancel: () => void
}

const QRConfirmModal: React.FC<QRConfirmModalProps> = ({
  parsed,
  patient,
  onConfirm,
  onCancel,
}) => {
  // QR種別に応じたラベルと詳細を生成
  const getLabel = (): { badge: string; badgeClass: string; title: string; detail: string } => {
    if (parsed.type === 'patient') {
      return {
        badge: '患者QR',
        badgeClass: 'qr-modal__badge--patient',
        title: patient
          ? `${Math.floor(patient.age / 10) * 10}代 ${patient.gender === 'M' ? '男性' : '女性'}`
          : `患者データ`,
        detail: patient ? `トリアージ: ${patient.triage_color}` : '',
      }
    }

    if (parsed.type === 'procedure') {
      const name = PROCEDURE_NAMES[parsed.id] ?? parsed.id
      return {
        badge: '手技QR',
        badgeClass: 'qr-modal__badge--procedure',
        title: name,
        detail: `手技ID: ${parsed.id}`,
      }
    }

    // item
    const item = getMedicalItemById(parsed.id)
    return {
      badge: '物品QR',
      badgeClass: 'qr-modal__badge--item',
      title: item ? item.name : parsed.id,
      detail: item
        ? `物品ID: ${parsed.id} → 処置: ${item.maps_to_treatment_id}`
        : `物品ID: ${parsed.id}`,
    }
  }

  const { badge, badgeClass, title, detail } = getLabel()

  return (
    <div className="qr-modal-overlay" onClick={onCancel}>
      <div className="qr-modal" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="qr-modal__header">
          <div className="qr-modal__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="qr-modal__sub">QRコードを読み取りました</p>
            <span className={`qr-modal__badge ${badgeClass}`}>{badge}</span>
          </div>
        </div>

        {/* 内容 */}
        <div className="qr-modal__body">
          <p className="qr-modal__title">{title}</p>
          {detail && <p className="qr-modal__detail">{detail}</p>}
        </div>

        {/* アクション */}
        <div className="qr-modal__actions">
          <button className="button button--secondary" onClick={onCancel}>
            キャンセル
          </button>
          <button className="button button--primary" onClick={onConfirm}>
            OK　→
          </button>
        </div>
      </div>
    </div>
  )
}

export default QRConfirmModal
