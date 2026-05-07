import { useParams, useNavigate } from 'react-router-dom'
import { usePatient } from '../hooks/usePatient'
import { useTimer } from '../hooks/useTimer'
import { useDeterioration } from '../hooks/useDeterioration'
import VitalsCard from '../components/VitalsCard'
import FindingsCard from '../components/FindingsCard'
import LockTimerOverlay from '../components/LockTimerOverlay'
import PatientPictogram from '../components/PatientPictogram'

// 診察手技一覧
const EXAM_IDS = ['head_and_neck', 'chest', 'abdomen_and_pelvis', 'limbs', 'fast', 'ample', 'background']

// 手技のラベルマッピング
const PROCEDURE_LABELS: Record<string, string> = {
    vitals:             'バイタル測定',
    head_and_neck:      '頭頸部診察',
    chest:              '胸部診察',
    abdomen_and_pelvis: '腹部・骨盤診察',
    limbs:              '四肢診察',
    fast:               'FAST',
    ample:              'AMPLE',
    background:         '背景聴取',
    diagnosis:          '診断',
}

const PatientDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const patientId = id ? parseInt(id) : null
    const { patient, loading, error } = usePatient(patientId)
    const { isLocked, remainingDisplay } = useTimer(patient)
    const { currentVitalsText, currentVitalsStruct } = useDeterioration(patient)

    if (loading) return <div className="loading">読み込み中...</div>
    if (error || !patient) return <div className="error">{error || '患者が見つかりません'}</div>

    const completed = patient.completed_treatments || []
    const uniqueCompleted = Array.from(new Set(completed))

    // --- バイタル判定 ---
    const triageVitalsDone = completed.filter(id => id === 'triage').length > 0
    const vitalsCount = completed.filter(id => id === 'vitals').length
    const vitalsAny = vitalsCount > 0 || triageVitalsDone  // トリアージV/Sでもブラー解除

    // バイタル表示に使う struct（診療エリアV/S > トリアージV/S の順で優先）
    const displayVitalsStruct = patient.vitals_initial_struct || patient.vitals_triage_struct

    // --- 診察手技判定 ---
    const completedExams = EXAM_IDS.filter(id => uniqueCompleted.includes(id))
    const examCount = completedExams.length
    const examTotal = EXAM_IDS.length

    // --- 治療処置判定 ---
    const requiredIds = patient.required_treatments?.map(rt => rt.treatment_id) || []
    const completedRequired = requiredIds.filter(id => uniqueCompleted.includes(id))
    const treatmentCount = completedRequired.length
    const treatmentTotal = requiredIds.length

    // 全ての必須処置が完了しているか
    const allRequiredCompleted = treatmentTotal > 0 && treatmentCount === treatmentTotal

    // --- 全体進捗ステータス ---
    const totalDone = (vitalsAny ? 1 : 0) + examCount + treatmentCount + (patient.tests_completed ? 1 : 0) + (patient.stabilization_completed ? 1 : 0)
    const totalAll = 1 + examTotal + treatmentTotal + (patient.image_urls && patient.image_urls.length > 0 ? 1 : 0) + (patient.blood_test_data ? 1 : 0)
    const progressPct = Math.round((totalDone / Math.max(totalAll, 1)) * 100)

    const overallStatus =
        allRequiredCompleted && vitalsAny && examCount === examTotal
            ? 'complete'
            : totalDone > 0
                ? 'in_progress'
                : 'not_started'

    // --- 実施済みフラグ（カテゴリ別チップ） ---
    const vitalsFlags = uniqueCompleted.filter(id => id === 'vitals')
    const examFlags = uniqueCompleted.filter(id => EXAM_IDS.includes(id))
    const treatmentFlags = uniqueCompleted.filter(id => requiredIds.includes(id))
    const hasFitFlags = uniqueCompleted.length > 0

    const getAgeGroup = (age: number) => `${Math.floor(age / 10) * 10}代`
    const getGenderText = (gender: string) => gender === 'M' ? '男性' : '女性'

    return (
        <div className="page patient-detail-page">
            {isLocked && (
                <LockTimerOverlay
                    remainingDisplay={remainingDisplay}
                    treatmentName={patient.applied_treatment_id || '処置'}
                    patientId={patientId}
                />
            )}

            {/* シンプルヘッダー（トリアージカラーなし） */}
            <header className="patient-header" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-0.8rem', left: '0' }}>
                    <button onClick={() => navigate('/training')} className="button button--secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', border: 'none', background: 'transparent', color: 'var(--primary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        訓練トップへ戻る
                    </button>
                </div>
                <div className="patient-header__identity" style={{ marginTop: '1rem' }}>
                    <PatientPictogram age={patient.age} gender={patient.gender} size={52} className="patient-header__pictogram" />
                    <h1 className="patient-header__name">
                        {getAgeGroup(patient.age)} {getGenderText(patient.gender)}
                    </h1>
                </div>
            </header>

            <main className="page__content">

                {/* ===== 自動ステータスパネル ===== */}
                <div className={`status-panel status-panel--${overallStatus}`}>
                    <div className="status-panel__header">
                        <div className="status-panel__label">
                            {overallStatus === 'complete' && (
                                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            )}
                            {overallStatus === 'complete' ? '全手技完了' :
                             overallStatus === 'in_progress' ? '手技実施中' : '未着手'}
                        </div>
                        <div className="status-panel__progress-text">{totalDone} / {totalAll}</div>
                    </div>
                    <div className="status-panel__bar-track">
                        <div
                            className="status-panel__bar-fill"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    {/* 3カテゴリそれぞれの進捗 */}
                    <div className="status-panel__metrics">
                        <div className={`status-metric ${vitalsAny ? 'status-metric--done' : ''}`}>
                            <span className="status-metric__icon">
                                {vitalsAny ? '✓' : '—'}
                            </span>
                            <div>
                                <div className="status-metric__name">バイタル</div>
                                <div className="status-metric__count">{vitalsCount}回測定</div>
                            </div>
                        </div>
                        <div className={`status-metric ${examCount === examTotal && examTotal > 0 ? 'status-metric--done' : examCount > 0 ? 'status-metric--partial' : ''}`}>
                            <span className="status-metric__icon">
                                {examCount === examTotal && examTotal > 0 ? '✓' : examCount > 0 ? `${examCount}` : '—'}
                            </span>
                            <div>
                                <div className="status-metric__name">診察</div>
                                <div className="status-metric__count">{examCount} / {examTotal} 部位</div>
                            </div>
                        </div>
                        <div className={`status-metric ${allRequiredCompleted ? 'status-metric--done' : treatmentCount > 0 ? 'status-metric--partial' : ''}`}>
                            <span className="status-metric__icon">
                                {allRequiredCompleted ? '✓' : treatmentCount > 0 ? `${treatmentCount}` : '—'}
                            </span>
                            <div>
                                <div className="status-metric__name">治療処置</div>
                                <div className="status-metric__count">{treatmentCount} / {treatmentTotal} 完了</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== 実施済み手技フラグ ===== */}
                <div className="flags-section">
                    <div className="flags-section__title">実施済み手技</div>
                    {!hasFitFlags ? (
                        <p className="flags-section__empty">まだ手技は実施されていません</p>
                    ) : (
                        <div className="flags-container">
                            {vitalsFlags.length > 0 && (
                                <div className="flags-group">
                                    <span className="flags-group__label">バイタル</span>
                                    <div className="flags-group__chips">
                                        {vitalsFlags.map((_, i) => (
                                            <span key={i} className="flag-chip flag-chip--vitals">
                                                <svg className="flag-chip__icon" viewBox="0 0 12 12" fill="none">
                                                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                バイタル測定
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {examFlags.length > 0 && (
                                <div className="flags-group">
                                    <span className="flags-group__label">診察</span>
                                    <div className="flags-group__chips">
                                        {examFlags.map(id => (
                                            <span key={id} className="flag-chip flag-chip--exam">
                                                <svg className="flag-chip__icon" viewBox="0 0 12 12" fill="none">
                                                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                {PROCEDURE_LABELS[id] ?? id}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {treatmentFlags.length > 0 && (
                                <div className="flags-group">
                                    <span className="flags-group__label">治療処置</span>
                                    <div className="flags-group__chips">
                                        {treatmentFlags.map(id => {
                                            const req = patient.required_treatments?.find(rt => rt.treatment_id === id)
                                            return (
                                                <span key={id} className="flag-chip flag-chip--treatment">
                                                    <svg className="flag-chip__icon" viewBox="0 0 12 12" fill="none">
                                                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    {req?.treatment_name ?? id}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ===== バイタルサイン ===== */}
                <div className="vitals-section">
                    <VitalsCard
                        title="バイタルサイン"
                        vitals={currentVitalsText || patient.vitals_initial}
                        vitalsStruct={currentVitalsStruct || displayVitalsStruct}
                        isBlurred={!vitalsAny}
                    />
                </div>


                {/* ===== 所見詳細 ===== */}
                <FindingsCard findings={patient.findings} completedTreatments={uniqueCompleted} />

                {/* ===== 特別検査結果 ===== */}
                {((patient.tests_completed && patient.image_urls && patient.image_urls.length > 0) || 
                  (patient.stabilization_completed && patient.blood_test_data)) && (
                    <div className="test-results-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.8rem', color: 'var(--gray-900)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.5rem' }}>
                            専門検査結果
                        </h3>
                        
                        {patient.tests_completed && patient.image_urls && patient.image_urls.length > 0 && (
                            <div className="card" style={{ marginBottom: '0.8rem', borderLeft: '4px solid #3b82f6' }}>
                                <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', color: '#1d4ed8' }}>画像検査結果</h4>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {patient.image_urls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="button button--secondary" style={{ width: 'auto', fontSize: '0.8rem', padding: '0.4rem 0.8rem', margin: 0 }}>
                                            画像 {i + 1} を確認する
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {patient.stabilization_completed && patient.blood_test_data && (
                            <div className="card" style={{ marginBottom: '0.8rem', borderLeft: '4px solid #8b5cf6' }}>
                                <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', color: '#6d28d9' }}>血液検査結果</h4>
                                <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', margin: 0, color: 'var(--gray-800)', backgroundColor: '#f8fafc', padding: '0.8rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                                    {patient.blood_test_data}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="actions">
                    <button
                        className="button button--primary button--large"
                        onClick={() => navigate(`/training/treatment-scan/${patientId}`)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 4V20M20 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        処置を実施する
                    </button>
                    <button
                        className="button button--secondary"
                        onClick={() => navigate('/training')}
                    >
                        トップに戻る
                    </button>
                </div>
            </main>
        </div>
    )
}

export default PatientDetailPage
