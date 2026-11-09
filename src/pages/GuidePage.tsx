import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_VERSION } from '../version'

type TabType = 'player' | 'controller'

export const GuidePage: React.FC = () => {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<TabType>('player')

    return (
        <div className="page guide-page" style={{ paddingBottom: '5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* ヘッダー */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 40,
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '0.3rem 0.5rem'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    トップへ戻る
                </button>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold' }}>
                        対応バージョン:
                    </span>
                    <span style={{
                        marginLeft: '0.3rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontWeight: '800'
                    }}>
                        {APP_VERSION}
                    </span>
                </div>
            </header>

            <main style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem' }}>
                {/* タイトルバナー */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                    borderRadius: '16px',
                    padding: '1.25rem 1.25rem 1rem',
                    color: '#ffffff',
                    marginBottom: '1rem',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                }}>
                    <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        DISASTER LOGIC 公式操作マニュアル
                    </div>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '0 0 0.4rem', lineHeight: '1.3' }}>
                        初めて使う人のための操作ガイド
                    </h1>
                    <p style={{ fontSize: '0.82rem', margin: 0, opacity: 0.95, lineHeight: '1.5' }}>
                        実地訓練のリアリティを大切にしながら、スマホで直感的に操作するためのハンドブックです。
                    </p>
                </div>

                {/* 切り替えタブ */}
                <div style={{
                    display: 'flex',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '10px',
                    padding: '3px',
                    marginBottom: '1.25rem'
                }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('player')}
                        style={{
                            flex: 1,
                            padding: '0.65rem 0.5rem',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'player' ? '#ffffff' : 'transparent',
                            color: activeTab === 'player' ? '#1e3a8a' : '#64748b',
                            boxShadow: activeTab === 'player' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        👥 プレイヤー（現場スタッフ）
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('controller')}
                        style={{
                            flex: 1,
                            padding: '0.65rem 0.5rem',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'controller' ? '#0f172a' : 'transparent',
                            color: activeTab === 'controller' ? '#ffffff' : '#64748b',
                            boxShadow: activeTab === 'controller' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        🛰️ コントローラー（運営・統括）
                    </button>
                </div>

                {/* ========================================================
                    タブ 1: プレイヤー向け（現場スタッフ用）
                   ======================================================== */}
                {activeTab === 'player' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* 重要ルールカード */}
                        <div style={{
                            backgroundColor: '#fffbeb',
                            border: '2px solid #f59e0b',
                            borderRadius: '12px',
                            padding: '1rem',
                            boxShadow: '0 2px 6px rgba(245,158,11,0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                                <span>⚠️</span>
                                <span>本訓練の【最重要ルール】3点</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#78350f', lineHeight: '1.6' }}>
                                <li>
                                    <strong>物品は病院内から実物を探して持参する！</strong><br />
                                    物品へのQRシール貼付はありません。必要な資材・機材は現場から実際にベッドサイドへ持ってきてください。
                                </li>
                                <li>
                                    <strong>模擬患者役は「現物を視認」してからQRを画面に出す！</strong><br />
                                    医療スタッフが実物を持参したことを確認して初めて、模擬患者役がスマホ画面に処置QRを表示します。
                                </li>
                                <li>
                                    <strong>動かない・おかしいと思ったら、まず「画面再読み込み（リロード）」！</strong><br />
                                    入力データやタイマーは保持されたまま、正常な最新状態に復帰します。
                                </li>
                            </ul>
                        </div>

                        {/* STEP 1: 参加手順 */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '24px', height: '24px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
                                訓練への参加方法（30秒で完了）
                            </h2>
                            <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.86rem', color: '#334155', lineHeight: '1.6' }}>
                                <li style={{ marginBottom: '0.4rem' }}>
                                    会場プロジェクター等の<strong>「参加用QRコード」をスマホの通常カメラでスキャン</strong>してアプリを開きます。
                                </li>
                                <li style={{ marginBottom: '0.4rem' }}>
                                    <strong>「訓練開始」</strong>を押し、本日の訓練セッションを選択します。
                                </li>
                                <li>
                                    <strong>あなたの役割</strong>（トリアージ担当、診療エリア医師・看護師、模擬患者役、検査技師）を選びます。
                                </li>
                            </ol>
                            <div style={{ marginTop: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#1d4ed8' }}>
                                💡 <strong>ひとりで試したい時は？</strong><br />
                                画面下部の「📱 体験モード」を押すと、誰とも連動しない個人練習モードになり、自由にボタンやスキャンを試せます。
                            </div>
                        </div>

                        {/* STEP 2: 役割別の現場フロー */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '24px', height: '24px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</span>
                                役割別の現場アクション
                            </h2>

                            {/* 診療エリア */}
                            <div style={{ marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ fontWeight: '800', color: '#0369a1', fontSize: '0.95rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    🩺 診療エリア担当（医師・看護師）
                                </div>
                                <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.6' }}>
                                    1. ベッドサイドで模擬患者が提示する「患者QR」をスキャンし、バイタルや診察所見を確認。<br />
                                    2. 必要な医療機器・資材（輸液や固定具等）を<strong>病院内から探して持ってくる</strong>。<br />
                                    3. 模擬患者に実物を見せ、<strong>模擬患者のスマホに出してもらった処置QRをスキャン</strong>して処置開始！<br />
                                    4. 処置タイマー終了後、改善バイタルを確認します。
                                </div>
                            </div>

                            {/* 模擬患者役 */}
                            <div style={{ marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ fontWeight: '800', color: '#b45309', fontSize: '0.95rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    🎭 模擬患者役（傷病者役）★訓練の重要役
                                </div>
                                <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.6' }}>
                                    1. 待機中は画面中央の<strong>「患者QRコード」</strong>を医療スタッフに見せてください。<br />
                                    2. 「脈をみます」「呼吸をみます」と言われたら、画面下の専用ボタンを押して拍動・呼吸を見せます。<br />
                                    3. <strong>医療者が実物物品を持ってきたら（視認確認後）</strong>、青い<strong>「📱 処置・手技・物品のQRを提示する」</strong>ボタンをタップ ➜ 該当する処置・物品を選び、大画面QRを相手のスマホでスキャンさせてください。
                                </div>
                            </div>

                            {/* トリアージ */}
                            <div style={{ marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ fontWeight: '800', color: '#b91c1c', fontSize: '0.95rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    🚨 トリアージ担当（入口）
                                </div>
                                <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.6' }}>
                                    1. 病院入口で傷病者を迎えます。<br />
                                    2. 模擬患者の「患者QR」をスキャン ➜ 2分間評価（歩行・呼吸・脈拍等） ➜ 「赤」「黄」「緑」「黒」を押して該当エリアへ誘導します。
                                </div>
                            </div>

                            {/* 検査科・放射線科 */}
                            <div>
                                <div style={{ fontWeight: '800', color: '#475569', fontSize: '0.95rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    🔬 放射線科・臨床検査科
                                </div>
                                <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: '1.6' }}>
                                    ・オーダー受付用QRをスキャンして所定の所要時間タイマーを開始します。<br />
                                    ・<strong>写真や数値の伝達は、アプリではなく従来通りの紙伝票や口頭で行います</strong>（アプリは拘束時間の管理のみを担当します）。
                                </div>
                            </div>
                        </div>

                        {/* STEP 3: 困ったときのトラブル対応 */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '24px', height: '24px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</span>
                                困ったときは？（現場トラブルシューティング）
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem' }}>
                                    <div style={{ fontWeight: '800', color: '#991b1b', fontSize: '0.88rem', marginBottom: '0.2rem' }}>
                                        🔄 画面が動かない・固まった・タイマーが進まない
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#7f1d1d', lineHeight: '1.5' }}>
                                        ブラウザの<strong>「再読み込み（リロード）」</strong>を押してください。スリープ復帰時などの不調はリロードで即座に直ります。入力中データは消えません。
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
                                    <div style={{ fontWeight: '800', color: '#334155', fontSize: '0.88rem', marginBottom: '0.2rem' }}>
                                        📷 カメラが起動しない・QRコードが読めない
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.5' }}>
                                        スキャナー画面にある<strong>「QRコードが読み取れない場合はこちら（患者リストから選択）」</strong>をタップし、一覧から該当する患者を選んで詳細に入ってください。
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* ========================================================
                    タブ 2: コントローラー向け（運営・統括本部用）
                   ======================================================== */}
                {activeTab === 'controller' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* 本部方針カード */}
                        <div style={{
                            backgroundColor: '#0f172a',
                            borderRadius: '12px',
                            padding: '1rem',
                            color: '#f8fafc',
                            boxShadow: '0 4px 12px rgba(15,23,42,0.2)'
                        }}>
                            <div style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span>🛰️</span>
                                <span>統括本部（Command Center）の役割</span>
                            </div>
                            <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                                今年度の訓練は、事前に物品シールを印刷・貼付・回収する手間がありません。<br />
                                コントローラーは<strong>「訓練セッションの作成・共有」「ダッシュボードによる現場の滞留監視」「終了後のデータ出力」</strong>に集中できます。
                            </div>
                        </div>

                        {/* 管理 1: 訓練の開始準備 */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '24px', height: '24px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
                                訓練の開始準備（セッション作成）
                            </h2>
                            <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.86rem', color: '#334155', lineHeight: '1.6' }}>
                                <li style={{ marginBottom: '0.4rem' }}>
                                    トップ画面から<strong>「管理画面」</strong>を選択し、パスワード（<code>komonji</code>）を入力してログイン。
                                </li>
                                <li style={{ marginBottom: '0.4rem' }}>
                                    <strong>「新規訓練セッション作成」</strong>で本日の訓練名、投入患者数、トリアージ比率、処置拘束時間（分）を設定して開始。
                                </li>
                                <li>
                                    トップ画面の<strong>「📱 アプリ参加用QRコードを表示」</strong>をプロジェクターに投影または印刷し、参加者に読み取らせます。
                                </li>
                            </ol>
                        </div>

                        {/* 管理 2: リアルタイム指揮 */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '24px', height: '24px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</span>
                                災害対策本部ダッシュボードの見方
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', lineHeight: '1.6' }}>
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <strong>📊 投入数・トリアージ進捗</strong>：現在の投入患者数とトリアージ完了率を一目で把握。
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <strong>🎯 4エリア戦術カンバン</strong>：赤・黄・緑・黒エリアの滞留状況を監視。特定エリアに患者が溜まっている場合は人員応援を指示。
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <strong>🚨 急変・悪化アラート</strong>：処置が遅れて悪化シナリオに入った患者は赤く点滅警告されます。
                                </div>
                                <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <strong>⏱️ アクティビティストリーム</strong>：現場が処置を完了した時刻が秒単位の時系列ログで流れます。
                                </div>
                            </div>
                        </div>

                        {/* 管理 3: 患者シナリオの作成・編集 */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '24px', height: '24px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</span>
                                患者マスター・シナリオの管理
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0 0 0.5rem', lineHeight: '1.6' }}>
                                既定の患者に加え、自院の訓練目的に合わせたオリジナル症例を新規追加・編集できます。
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.84rem', color: '#475569', lineHeight: '1.6' }}>
                                <li><strong>基本情報</strong>：年齢、性別、想定トリアージ区分。</li>
                                <li><strong>バイタル設定</strong>：初期バイタル ➜ 安定化バイタル ➜ 処置遅延時の悪化バイタル。</li>
                                <li><strong>系統的所見</strong>：頭部、胸部、腹部・骨盤、四肢、FAST超音波、AMPLE問診。</li>
                                <li><strong>必須処置と拘束時間</strong>：安定化に必要な処置（輸液、胸腔穿刺等）とタイマー分数を設定。</li>
                            </ul>
                        </div>

                        {/* 管理 4: 振り返りとデータ出力 */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '24px', height: '24px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>4</span>
                                デブリーフィング（振り返り）と全ログ出力
                            </h2>
                            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.6' }}>
                                1. 訓練終了時にCommand Center右上の<strong>「訓練終了」</strong>を押して記録を確定。<br />
                                2. <strong>Googleスプレッドシートワンクリック出力</strong>（設定タブ）：全患者のトリアージ時刻、処置実施時刻、確定診断ログが自動転記されます。<br />
                                3. <strong>振り返りCSVダウンロード</strong>：Excel等で即座に時系列評価・タイム分析が可能です。
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    )
}

export default GuidePage
