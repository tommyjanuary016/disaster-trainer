import React, { useState, useMemo } from 'react'
import { Patient, TrainingSession, VitalSignStruct } from '../types/patient'
import { resolveActorGuidance } from '../lib/actorGuidance'
import { generateInlineQrSvg } from '../lib/inlineQr'

interface SessionPatientSheetTabProps {
    patients: Patient[]
    session?: TrainingSession | null
    sessionTitle?: string | null
}

function formatStructOneLine(s?: VitalSignStruct | null, fallbackText?: string): string {
    if (!s) return (fallbackText || '—').replace(/\n/g, ' / ')
    const gcs = (s.gcs_e !== undefined || s.gcs_v !== undefined || s.gcs_m !== undefined)
        ? ` GCS E${s.gcs_e ?? 4}V${s.gcs_v ?? 5}M${s.gcs_m ?? 6}`
        : ''
    return `BP ${s.sbp}/${s.dbp} | HR ${s.hr} | RR ${s.rr} | SpO2 ${s.spo2}% | KT ${s.temp.toFixed(1)}${gcs}`
}

export const SessionPatientSheetTab: React.FC<SessionPatientSheetTabProps> = ({
    patients,
    session,
    sessionTitle,
}) => {
    const [viewStyle, setViewStyle] = useState<'table' | 'cards'>('table')
    const [triageFilter, setTriageFilter] = useState<string>('ALL')
    const [showQrOnCards, setShowQrOnCards] = useState<boolean>(true)

    // 模擬患者選択画面（PatientActorListPage）と番号が一致するようトリアージ色順でソート
    const sortedPatients = useMemo(() => {
        const order: Record<string, number> = { '赤': 1, '黄': 2, '緑': 3, '黒': 4 }
        return [...patients].sort((a, b) => (order[a.triage_color] || 9) - (order[b.triage_color] || 9))
    }, [patients])

    const numberedPatients = useMemo(() => {
        return sortedPatients.map((p, index) => ({ patient: p, actorNumber: index + 1 }))
    }, [sortedPatients])

    const visibleItems = useMemo(() => {
        if (triageFilter === 'ALL') return numberedPatients
        return numberedPatients.filter(item => item.patient.triage_color === triageFilter)
    }, [numberedPatients, triageFilter])

    const triageBadgeStyle = (color: string) => {
        switch (color) {
            case '赤': return { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', label: '赤（重症）' }
            case '黄': return { bg: '#fef3c7', border: '#d97706', text: '#92400e', label: '黄（中等症）' }
            case '緑': return { bg: '#dcfce7', border: '#16a34a', text: '#166534', label: '緑（軽症）' }
            case '黒': return { bg: '#e2e8f0', border: '#334155', text: '#1e293b', label: '黒（搬送不能）' }
            default:   return { bg: '#f1f5f9', border: '#94a3b8', text: '#334155', label: color }
        }
    }

    return (
        <div className="patient-sheet-print-root">
            {/* 操作バー（印刷時は非表示） */}
            <div className="no-print" style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                            🖨️ 患者一覧表・模擬患者指導シート
                        </h2>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#475569' }}>
                            模擬患者役の学生への演技指導や運営本部のマスター確認用としてそのままA4印刷／PDF保存ができます。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="button button--primary"
                        style={{ width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.92rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <span>🖨️</span>
                        <span>この一覧を印刷 / PDF出力</span>
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                    {/* レイアウト切替 */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setViewStyle('table')}
                            className={`button ${viewStyle === 'table' ? 'button--primary' : 'button--secondary'}`}
                            style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                        >
                            📋 全体一覧表（マスター表）
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewStyle('cards')}
                            className={`button ${viewStyle === 'cards' ? 'button--primary' : 'button--secondary'}`}
                            style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                        >
                            🎭 模擬患者 個別指導シート
                        </button>
                        {viewStyle === 'cards' && (
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', marginLeft: '0.5rem', cursor: 'pointer', color: '#334155' }}>
                                <input
                                    type="checkbox"
                                    checked={showQrOnCards}
                                    onChange={(e) => setShowQrOnCards(e.target.checked)}
                                />
                                患者QRも表示
                            </label>
                        )}
                    </div>

                    {/* トリアージフィルター */}
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#475569' }}>絞り込み:</span>
                        {['ALL', '赤', '黄', '緑', '黒'].map(key => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTriageFilter(key)}
                                style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 'bold',
                                    borderRadius: '6px',
                                    border: triageFilter === key ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                    backgroundColor: triageFilter === key ? '#eff6ff' : '#ffffff',
                                    color: triageFilter === key ? '#1d4ed8' : '#334155',
                                    cursor: 'pointer',
                                }}
                            >
                                {key === 'ALL' ? `すべて (${numberedPatients.length})` : key}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 印刷用ヘッダー */}
            <div className="print-sheet-header" style={{
                marginBottom: '0.85rem',
                paddingBottom: '0.5rem',
                borderBottom: '2px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: '0.5rem',
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
                        {session?.title || sessionTitle || '災害医療訓練'} — {viewStyle === 'table' ? '患者一覧＆模擬患者指導マスター表' : '模擬患者役 個別指導シート'}
                    </h1>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                        対象患者数: {visibleItems.length}名（番号は模擬患者端末「担当患者を選択」の表示番号と一致しています）
                    </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    出力日時: {new Date().toLocaleString('ja-JP')}
                </div>
            </div>

            {visibleItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    該当する患者データがありません。
                </div>
            ) : viewStyle === 'table' ? (
                /* =========================================================
                    モード1：全体一覧表（テーブル表示）
                   ========================================================= */
                <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <table className="print-master-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: '#0f172a' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #94a3b8' }}>
                                <th style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', width: '56px' }}>番号<br />区分</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #cbd5e1', minWidth: '130px' }}>氏名・属性<br />疾患名</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #cbd5e1', minWidth: '170px' }}>バイタルサイン設定</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #cbd5e1', minWidth: '210px' }}>身体所見・検査・背景</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #cbd5e1', minWidth: '140px' }}>必要処置・検査</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', minWidth: '230px' }}>模擬患者への具体的演技指導</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleItems.map(({ patient: p, actorNumber }) => {
                                const tb = triageBadgeStyle(p.triage_color)
                                const guidance = resolveActorGuidance(p, p.vitals_initial_struct, p.vitals_initial)
                                const f = p.findings || ({} as any)
                                return (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #cbd5e1', verticalAlign: 'top', breakInside: 'avoid' }}>
                                        {/* 番号・トリアージ */}
                                        <td style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                            <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>No.{actorNumber}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>ID:{p.base_patient_id || p.id}</div>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.15rem 0.45rem',
                                                borderRadius: '4px',
                                                backgroundColor: tb.bg,
                                                border: `1px solid ${tb.border}`,
                                                color: tb.text,
                                                fontWeight: 'bold',
                                                fontSize: '0.72rem',
                                            }}>
                                                {p.triage_color}
                                            </span>
                                        </td>

                                        {/* 氏名・疾患名 */}
                                        <td style={{ padding: '0.5rem', borderRight: '1px solid #e2e8f0' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: '#0f172a' }}>{p.name || '名称未設定'}</div>
                                            <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: '0.35rem' }}>
                                                {p.age}歳 {p.gender === 'M' ? '男性' : '女性'}
                                            </div>
                                            <div style={{
                                                padding: '0.25rem 0.4rem',
                                                backgroundColor: '#eff6ff',
                                                borderLeft: '3px solid #2563eb',
                                                borderRadius: '3px',
                                                fontWeight: 'bold',
                                                color: '#1e3a8a',
                                                fontSize: '0.78rem',
                                            }}>
                                                {p.diagnosis || '疾患名未設定'}
                                            </div>
                                        </td>

                                        {/* バイタルサイン */}
                                        <td style={{ padding: '0.5rem', borderRight: '1px solid #e2e8f0', lineHeight: '1.45' }}>
                                            <div><strong>トリアージ:</strong> {formatStructOneLine(p.vitals_triage_struct, p.vitals_triage)}</div>
                                            <div style={{ marginTop: '0.25rem' }}><strong>初療到着:</strong> {formatStructOneLine(p.vitals_initial_struct, p.vitals_initial)}</div>
                                            <div style={{ marginTop: '0.25rem', color: '#047857' }}><strong>処置後目標:</strong> {formatStructOneLine(p.vitals_post_struct, p.vitals_post)}</div>
                                            {p.deterioration_enabled && (
                                                <div style={{ marginTop: '0.25rem', color: '#b91c1c', fontWeight: 'bold' }}>
                                                    ⏱️ 悪化設定: {p.deterioration_time_minutes || '?'}分で急変
                                                    {p.vitals_deterioration_struct ? ` (${formatStructOneLine(p.vitals_deterioration_struct)})` : ''}
                                                </div>
                                            )}
                                        </td>

                                        {/* 身体所見・検査・背景 */}
                                        <td style={{ padding: '0.5rem', borderRight: '1px solid #e2e8f0', lineHeight: '1.45' }}>
                                            {f.head_and_neck && <div><strong>頭頸部:</strong> {f.head_and_neck}</div>}
                                            {f.chest && <div><strong>胸部:</strong> {f.chest}</div>}
                                            {f.abdomen_and_pelvis && <div><strong>腹骨盤:</strong> {f.abdomen_and_pelvis}</div>}
                                            {f.limbs && <div><strong>四肢:</strong> {f.limbs}</div>}
                                            {f.fast && <div><strong>FAST:</strong> {f.fast}</div>}
                                            {p.blood_test_data && <div><strong>採血:</strong> {p.blood_test_data}</div>}
                                            {f.ample && <div style={{ marginTop: '0.2rem', color: '#334155' }}><strong>AMPLE:</strong> {f.ample}</div>}
                                            {f.background && <div style={{ color: '#475569' }}><strong>背景:</strong> {f.background}</div>}
                                        </td>

                                        {/* 必要処置 */}
                                        <td style={{ padding: '0.5rem', borderRight: '1px solid #e2e8f0', lineHeight: '1.45' }}>
                                            {p.required_treatments && p.required_treatments.length > 0 ? (
                                                <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                                                    {p.required_treatments.map((rt, i) => (
                                                        <li key={i} style={{ marginBottom: '0.2rem' }}>
                                                            <strong>{rt.treatment_name}</strong>
                                                            {rt.lock_timer_minutes > 0 && (
                                                                <span style={{ color: '#64748b', fontSize: '0.7rem' }}> ({Math.round(rt.lock_timer_minutes * 10) / 10}分)</span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span style={{ color: '#64748b' }}>必須処置なし</span>
                                            )}
                                            {p.necessary_tests_and_treatments && (
                                                <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: '#475569' }}>
                                                    <strong>補足:</strong> {p.necessary_tests_and_treatments}
                                                </div>
                                            )}
                                        </td>

                                        {/* 模擬患者への具体的演技指導 */}
                                        <td style={{ padding: '0.5rem', lineHeight: '1.45' }}>
                                            <div style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.15rem' }}>
                                                👁️ 目 (E{guidance.gcs.e}): {guidance.eye.headline}
                                            </div>
                                            <div style={{ fontWeight: 'bold', color: '#b91c1c', marginBottom: '0.15rem' }}>
                                                🗣️ 声 (V{guidance.gcs.v}): {guidance.verbal.headline}
                                            </div>
                                            <div style={{ fontWeight: 'bold', color: '#047857', marginBottom: '0.25rem' }}>
                                                💪 動 (M{guidance.gcs.m}): {guidance.motor.headline}
                                            </div>
                                            {guidance.specialInstruction && (
                                                <div style={{ backgroundColor: '#fef3c7', padding: '0.2rem 0.35rem', borderRadius: '3px', marginBottom: '0.2rem', color: '#78350f' }}>
                                                    ⭐ {guidance.specialInstruction}
                                                </div>
                                            )}
                                            {guidance.painGuides.length > 0 && (
                                                <div style={{ fontSize: '0.72rem', color: '#334155' }}>
                                                    {guidance.painGuides.join(' / ')}
                                                </div>
                                            )}
                                            {!guidance.canAnswerQuestions && (
                                                <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.2rem', fontWeight: 'bold' }}>
                                                    ※質問への背景回答は禁止（{guidance.v4FallbackReply ? '曖昧回答のみ' : '完全不可'}）
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* =========================================================
                    モード2：模擬患者別 個別指導シート（印刷配布・直接指導向け）
                   ========================================================= */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {visibleItems.map(({ patient: p, actorNumber }) => {
                        const tb = triageBadgeStyle(p.triage_color)
                        const guidance = resolveActorGuidance(p, p.vitals_initial_struct, p.vitals_initial)
                        const f = p.findings || ({} as any)
                        return (
                            <div
                                key={p.id}
                                className="print-actor-card"
                                style={{
                                    backgroundColor: '#ffffff',
                                    border: `2px solid ${tb.border}`,
                                    borderRadius: '12px',
                                    padding: '1rem 1.25rem',
                                    breakInside: 'avoid',
                                    pageBreakInside: 'avoid',
                                }}
                            >
                                {/* カードヘッダー */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid #e2e8f0',
                                    paddingBottom: '0.6rem',
                                    marginBottom: '0.75rem',
                                    gap: '1rem',
                                    flexWrap: 'wrap',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            padding: '0.3rem 0.75rem',
                                            borderRadius: '8px',
                                            backgroundColor: tb.bg,
                                            border: `1.5px solid ${tb.border}`,
                                            color: tb.text,
                                            fontWeight: '800',
                                            fontSize: '1.05rem',
                                        }}>
                                            模擬患者 {actorNumber}番 ・ {tb.label}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                                                {p.name} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#475569' }}>({p.age}歳 {p.gender === 'M' ? '男性' : '女性'} / ID:{p.base_patient_id || p.id})</span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                                                疾患名: {p.diagnosis || '未設定'}
                                            </div>
                                        </div>
                                    </div>
                                    {showQrOnCards && (
                                        <div style={{ textAlign: 'center' }}>
                                            <img
                                                src={generateInlineQrSvg(`patient:${p.id}`, 72)}
                                                alt={`患者QR ${p.id}`}
                                                style={{ width: '72px', height: '72px', display: 'block' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* 2カラム情報：左=演技指導ルール、右=所見・処置・バイタル */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.9rem' }}>
                                    {/* 左：模擬患者役への演技指示 */}
                                    <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', padding: '0.75rem' }}>
                                        <div style={{ fontWeight: 'bold', color: '#9a3412', fontSize: '0.88rem', marginBottom: '0.45rem' }}>
                                            🎭 模擬患者役への指導ポイント（GCS E{guidance.gcs.e}V{guidance.gcs.v}M{guidance.gcs.m}）
                                        </div>
                                        <div style={{ fontSize: '0.82rem', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#1c1917' }}>
                                            <div><strong>👁️ 目:</strong> {guidance.eye.headline}（{guidance.eye.detail}）</div>
                                            <div><strong>🗣️ 声:</strong> {guidance.verbal.headline}（{guidance.verbal.detail}）</div>
                                            <div><strong>💪 動:</strong> {guidance.motor.headline}（{guidance.motor.detail}）</div>
                                            {guidance.specialInstruction && (
                                                <div style={{ backgroundColor: '#fef3c7', padding: '0.35rem 0.5rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                                                    <strong>⭐ 特別演技指示:</strong> {guidance.specialInstruction}
                                                </div>
                                            )}
                                            {guidance.painGuides.length > 0 && (
                                                <div style={{ marginTop: '0.2rem' }}>
                                                    <strong>🩺 部位反応:</strong> {guidance.painGuides.join(' / ')}
                                                </div>
                                            )}
                                            {guidance.canAnswerQuestions ? (
                                                <div style={{ backgroundColor: '#f0fdf4', padding: '0.35rem 0.5rem', borderRadius: '4px', marginTop: '0.2rem', color: '#166534' }}>
                                                    <strong>💬 問診回答可 (V5):</strong> 背景={f.background || '特記なし'} / AMPLE={f.ample || '特記なし'}
                                                </div>
                                            ) : (
                                                <div style={{ backgroundColor: '#fef2f2', padding: '0.35rem 0.5rem', borderRadius: '4px', marginTop: '0.2rem', color: '#b91c1c', fontWeight: 'bold' }}>
                                                    🚫 背景・生活歴の受け答え不可（{guidance.v4FallbackReply || '会話不能設定'}）
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 右：身体所見・必要処置・バイタル */}
                                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', lineHeight: '1.5', color: '#1e293b' }}>
                                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                                            🩺 身体所見・必要処置・バイタル設定
                                        </div>
                                        <div><strong>【必要処置】</strong> {p.required_treatments?.map(rt => rt.treatment_name).join('、') || 'なし'}</div>
                                        <div style={{ marginTop: '0.3rem' }}><strong>【トリアージV/S】</strong> {formatStructOneLine(p.vitals_triage_struct, p.vitals_triage)}</div>
                                        <div><strong>【初療到着V/S】</strong> {formatStructOneLine(p.vitals_initial_struct, p.vitals_initial)}</div>
                                        <div><strong>【処置後目標V/S】</strong> {formatStructOneLine(p.vitals_post_struct, p.vitals_post)}</div>
                                        {p.deterioration_enabled && (
                                            <div style={{ color: '#b91c1c', fontWeight: 'bold' }}>
                                                【悪化設定】 {p.deterioration_time_minutes}分後に悪化 → {formatStructOneLine(p.vitals_deterioration_struct)}
                                            </div>
                                        )}
                                        <div style={{ marginTop: '0.35rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem' }}>
                                            <div><strong>頭頸部:</strong> {f.head_and_neck || '特記なし'}</div>
                                            <div><strong>胸部:</strong> {f.chest || '特記なし'}</div>
                                            <div><strong>腹・骨盤:</strong> {f.abdomen_and_pelvis || '特記なし'}</div>
                                            <div><strong>四肢:</strong> {f.limbs || '特記なし'}</div>
                                            <div><strong>FAST:</strong> {f.fast || '特記なし'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
