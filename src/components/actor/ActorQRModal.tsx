import React, { useState } from 'react'
import { generateInlineQrSvg } from '../../lib/inlineQr'
import { PROCEDURES_MASTER, PROCEDURE_CATEGORIES, ProcedureDefinition } from '../../data/procedures'
import { MEDICAL_ITEMS, getItemCategories, MedicalItem } from '../../data/items'
import { makeProcedureQR, makeItemQR } from '../../types/qr'

interface ActorQRModalProps {
  onClose: () => void
  patientName?: string
}

type TabMode = 'procedure' | 'item'

export const ActorQRModal: React.FC<ActorQRModalProps> = ({ onClose, patientName }) => {
  const [tabMode, setTabMode] = useState<TabMode>('procedure')
  const [selectedCategory, setSelectedCategory] = useState<string>('診察・評価')
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; qrData: string; category: string; desc?: string } | null>(() => {
    const params = new URLSearchParams(window.location.search)
    const initialItem = params.get('item')
    if (initialItem) {
      const proc = PROCEDURES_MASTER.find(p => p.id === initialItem)
      if (proc) {
        return {
          id: proc.id,
          name: proc.name,
          qrData: makeProcedureQR(proc.id),
          category: proc.category,
          desc: proc.description,
        }
      }
    }
    return null
  })

  // 処置リストのフィルタ
  const currentProcedures = PROCEDURES_MASTER.filter(p => p.category === selectedCategory)
  
  // 物品リストのカテゴリとフィルタ
  const itemCats = getItemCategories()
  const currentItems = MEDICAL_ITEMS.filter(item => item.category === selectedCategory)

  const handleSelectProcedure = (proc: ProcedureDefinition) => {
    setSelectedItem({
      id: proc.id,
      name: proc.name,
      qrData: makeProcedureQR(proc.id),
      category: proc.category,
      desc: proc.description,
    })
  }

  const handleSelectItem = (item: MedicalItem) => {
    setSelectedItem({
      id: item.item_id,
      name: item.name,
      qrData: makeItemQR(item.item_id),
      category: item.category,
      desc: `物品コード: ${item.item_id}`,
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: '#1e293b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>
              📱 処置・物品QR提示
            </h3>
            {patientName && (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                担当患者: {patientName} 様役
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '1.4rem',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* 単一QRコード拡大表示画面 */}
        {selectedItem ? (
          <div style={{
            padding: '1.5rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            overflowY: 'auto',
          }}>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
            }}>
              {selectedItem.category}
            </div>

            <h4 style={{
              margin: '0 0 0.5rem',
              fontSize: '1.35rem',
              color: '#0f172a',
              fontWeight: 800,
            }}>
              {selectedItem.name}
            </h4>

            {selectedItem.desc && (
              <p style={{
                margin: '0 0 1rem',
                fontSize: '0.85rem',
                color: '#64748b',
                maxWidth: '340px',
              }}>
                {selectedItem.desc}
              </p>
            )}

            {/* QRコード表示枠（大きく見やすく） */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#ffffff',
              border: '3px solid #2563eb',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
              margin: '0.5rem 0 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={generateInlineQrSvg(selectedItem.qrData, 240)}
                alt={selectedItem.name}
                style={{ width: '240px', height: '240px', display: 'block' }}
              />
            </div>

            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fde047',
              color: '#854d0e',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '600',
              marginBottom: '1.25rem',
              width: '100%',
              maxWidth: '320px',
            }}>
              📸 この画面を医師・看護師のカメラに見せてスキャンしてもらってください
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '320px' }}>
              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                ← 一覧に戻る
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                完了（閉じる）
              </button>
            </div>
          </div>
        ) : (
          /* 選択ステップ画面 */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* モード切替タブ（診察・処置手技のみ） */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
            }}>
              <div
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderBottom: '3px solid #2563eb',
                  backgroundColor: '#ffffff',
                  fontWeight: 'bold',
                  color: '#2563eb',
                  fontSize: '0.95rem',
                  textAlign: 'center',
                }}
              >
                🩺 診察・処置手技
              </div>
            </div>

            {/* カテゴリ選択（横スクロールチップ） */}
            <div style={{
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
              padding: '0.6rem 0.8rem',
              backgroundColor: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              scrollbarWidth: 'none',
            }}>
              {(tabMode === 'procedure' ? PROCEDURE_CATEGORIES : itemCats).map(cat => {
                const isActive = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 'bold' : 'normal',
                      backgroundColor: isActive ? '#2563eb' : '#ffffff',
                      color: isActive ? '#ffffff' : '#334155',
                      border: isActive ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 4px rgba(37,99,235,0.2)' : 'none',
                    }}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>

            {/* 選択肢リスト */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                医師・看護師から指示された手技または物品をタップしてください:
              </div>

              {tabMode === 'procedure' ? (
                currentProcedures.map(proc => (
                  <button
                    key={proc.id}
                    onClick={() => handleSelectProcedure(proc)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.8rem 1rem',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563eb'
                      e.currentTarget.style.backgroundColor = '#eff6ff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.backgroundColor = '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>
                        {proc.name}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 'bold' }}>
                        QR表示 →
                      </span>
                    </div>
                    {proc.description && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {proc.description}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                currentItems.map(item => (
                  <button
                    key={item.item_id}
                    onClick={() => handleSelectItem(item)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.8rem 1rem',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563eb'
                      e.currentTarget.style.backgroundColor = '#eff6ff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.backgroundColor = '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>
                        📦 {item.name}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 'bold' }}>
                        QR表示 →
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      対応処置: {item.maps_to_treatment_id}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* フッター */}
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              textAlign: 'right',
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#64748b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
