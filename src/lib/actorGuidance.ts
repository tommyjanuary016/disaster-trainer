import { Patient, VitalSignStruct } from '../types/patient'

export interface ActorGuidanceItem {
    headline: string
    detail: string
}

export interface ActorVitalDisplay {
    label: string
    value: string
    unit: string
    statusText: string
    isAbnormal: boolean
}

export interface ActorGuidanceResult {
    gcs: { e: number; v: number; m: number }
    isCpa: boolean
    isSpeechBlocked: boolean
    eye: ActorGuidanceItem
    verbal: ActorGuidanceItem
    motor: ActorGuidanceItem
    painGuides: string[]
    specialInstruction: string | null
    /** V5のときのみ質問回答（患者背景・AMPLE）を表示する */
    canAnswerQuestions: boolean
    v4FallbackReply: string | null
    qaItems: { question: string; answer: string }[]
    vitalsCards: ActorVitalDisplay[]
    /** 訓練上の注意（スタッフ提示用第1階層でも使える外見上の初見） */
    visibleFindings: string[]
}

/** 文字列や構造体から現在の GCS (E, V, M) を自動判定する */
function extractGcs(
    patient: Patient,
    currentVitalsStruct?: VitalSignStruct | null,
    currentVitalsText?: string
): { e: number; v: number; m: number } {
    const struct = currentVitalsStruct || patient.vitals_initial_struct || patient.vitals_triage_struct
    let e = struct?.gcs_e
    let v = struct?.gcs_v
    let m = struct?.gcs_m

    const textSources = [
        currentVitalsText,
        patient.consciousness_level,
        patient.vitals_initial,
        patient.vitals_triage,
    ].filter(Boolean).join(' ')

    if (e === undefined || v === undefined || m === undefined) {
        const gcsMatch = textSources.match(/E\s*([1-4])\s*V\s*([1-5])\s*M\s*([1-6])/i)
        if (gcsMatch) {
            if (e === undefined) e = parseInt(gcsMatch[1], 10)
            if (v === undefined) v = parseInt(gcsMatch[2], 10)
            if (m === undefined) m = parseInt(gcsMatch[3], 10)
        }
    }

    // テキストにJCS表記がある場合のみフォールバック推定
    if (e === undefined || v === undefined || m === undefined) {
        const cl = (patient.consciousness_level || '').toLowerCase()
        let est = { e: 4, v: 5, m: 6 }
        if (cl.includes('300') || cl.includes('深昏睡')) est = { e: 1, v: 1, m: 1 }
        else if (cl.includes('200') || cl.includes('3桁')) est = { e: 1, v: 2, m: 4 }
        else if (cl.includes('100')) est = { e: 1, v: 3, m: 5 }
        else if (cl.includes('30') || cl.includes('20') || cl.includes('2桁')) est = { e: 2, v: 3, m: 5 }
        else if (cl.includes('10')) est = { e: 3, v: 4, m: 6 }
        else if (cl.includes('1桁')) est = { e: 4, v: 4, m: 6 }

        if (e === undefined) e = est.e
        if (v === undefined) v = est.v
        if (m === undefined) m = est.m
    }

    return {
        e: Math.max(1, Math.min(4, e ?? 4)),
        v: Math.max(1, Math.min(5, v ?? 5)),
        m: Math.max(1, Math.min(6, m ?? 6)),
    }
}

/** フリーテキストのバイタルを簡易パース（構造化データが無い場合のフォールバック） */
function fallbackParseVitals(text: string): Partial<VitalSignStruct> {
    if (!text) return {}
    const bpMatch = text.match(/BP[\s:：]*(\d+)\s*\/\s*(\d+)/i)
    const hrMatch = text.match(/HR[\s:：]*(\d+)/i)
    const rrMatch = text.match(/(?:^|\n|・| )(?:R|RR)[\s:：]*(\d+)/i)
    const spo2Match = text.match(/SPO2[\s:：]*(\d+)/i)
    const ktMatch = text.match(/KT[\s:：]*([\d.]+)/i)
    return {
        sbp: bpMatch ? parseInt(bpMatch[1], 10) : undefined,
        dbp: bpMatch ? parseInt(bpMatch[2], 10) : undefined,
        hr: hrMatch ? parseInt(hrMatch[1], 10) : undefined,
        rr: rrMatch ? parseInt(rrMatch[1], 10) : undefined,
        spo2: spo2Match ? parseInt(spo2Match[1], 10) : undefined,
        temp: ktMatch ? parseFloat(ktMatch[1]) : undefined,
    }
}

/** AMPLE テキストから特定項目の値を抜き出す */
function extractAmpleLine(patient: Patient, splitValue: string | undefined, pattern: RegExp, fallback: string): string {
    if (splitValue && splitValue.trim()) return splitValue.trim()
    const raw = patient.findings?.ample || ''
    const match = raw.match(pattern)
    if (match && match[1]) return match[1].trim()
    return fallback
}

/** 外見上の明らかな異常所見（スタッフ提示第1階層用・ネタバレ除外） */
export function extractVisibleFindings(patient: Patient, rr: number, effectiveV: number, effectiveM: number): string[] {
    const findings: string[] = []
    const hText = patient?.findings?.head_and_neck || ''
    if (hText && !hText.includes('明らかな外傷性変化なし') && !hText.includes('特記所見なし') && !hText.includes('特記事項なし')) {
        const faceKeywords = ['顔面', '額', '鼻', '眼', '口', '頬', '頭部', '耳', '側頭部', '後頭部']
        const lines = hText.split(/[、。\n・]/).map(s => s.trim()).filter(Boolean)
        const matched = lines.filter(line =>
            faceKeywords.some(kw => line.includes(kw)) &&
            !line.includes('なし') &&
            !line.includes('気管') &&
            !line.includes('怒張')
        )
        if (matched.length > 0) {
            matched.forEach(m => findings.push(m))
        } else if (faceKeywords.some(kw => hText.includes(kw))) {
            const firstPart = hText.split(/[、。\n]/)[0].trim()
            if (firstPart) findings.push(firstPart)
        }
    }

    if (effectiveV === 1 && effectiveM === 1) {
        findings.push('反応なし')
    } else if (effectiveV <= 2) {
        findings.push('うめき声のみ')
    } else if (patient?.triage_color === '赤' || patient?.triage_color === '黄' || rr >= 24) {
        findings.push('苦悶表情')
    }

    if (rr === 0) {
        findings.push('呼吸停止')
    } else if (rr >= 30) {
        findings.push('荒い呼吸')
    } else if (rr >= 24) {
        findings.push('浅く速い呼吸')
    } else if (rr > 0 && rr <= 10) {
        findings.push('微弱な呼吸')
    }

    const allText = `${hText} ${patient?.findings?.limbs || ''} ${patient?.findings?.chest || ''}`
    if (allText.includes('大量出血') || allText.includes('噴出性出血')) {
        findings.push('活動性外出血あり')
    }

    return Array.from(new Set(findings))
}

/**
 * 患者データと現在バイタルから、模擬患者役にそのまま表示できる
 * ダイレクトな演技指示（考えさせない形式）および現在バイタル状態を生成する
 */
export function resolveActorGuidance(
    patient: Patient,
    currentVitalsStruct?: VitalSignStruct | null,
    currentVitalsText?: string
): ActorGuidanceResult {
    const completed = patient.completed_treatments || []
    const hasIntubation = completed.includes('intubation') || completed.includes('surgical_airway')
    const hasSedation = completed.includes('sedation')

    const struct = currentVitalsStruct || patient.vitals_initial_struct || patient.vitals_triage_struct
    const parsedFallback = fallbackParseVitals(currentVitalsText || patient.vitals_initial || patient.vitals_triage || '')

    const sbp = struct?.sbp ?? parsedFallback.sbp
    const dbp = struct?.dbp ?? parsedFallback.dbp
    const hr = struct?.hr ?? parsedFallback.hr ?? 80
    const rr = struct?.rr ?? parsedFallback.rr ?? 16
    const spo2 = struct?.spo2 ?? parsedFallback.spo2
    const temp = struct?.temp ?? parsedFallback.temp

    const isCpa = Boolean(
        patient.disposition?.is_cpa_at_disposition ||
        (sbp !== undefined && sbp === 0) ||
        hr === 0 ||
        (sbp !== undefined && sbp < 40 && hr < 30)
    )

    const rawGcs = extractGcs(patient, currentVitalsStruct, currentVitalsText)
    // 処置状態やCPAに応じて実効E・V・Mをアプリ側で自動確定する
    const e = (isCpa || hasSedation) ? 1 : rawGcs.e
    const v = (isCpa || hasSedation || hasIntubation) ? 1 : rawGcs.v
    const m = (isCpa || hasSedation) ? 1 : rawGcs.m

    // 👁️ 目
    let eye: ActorGuidanceItem
    if (e === 1) {
        eye = {
            headline: 'ずっと目を閉じておく',
            detail: '声をかけられても、肩を叩かれても、絶対に目を開けないでください。',
        }
    } else if (e === 2) {
        eye = {
            headline: '強い刺激をされたときだけ目を開ける',
            detail: '普段は目を閉じていてください。声をかけられただけでは目を開けず、肩を強く叩かれるなど強い刺激をされたときだけ、うっすら目を開けてください。',
        }
    } else if (e === 3) {
        eye = {
            headline: '声をかけられたときだけ目を開ける',
            detail: '普段は目を閉じていてください。スタッフから声をかけられたときだけ目を開けて、話が終わったらまた閉じてください。',
        }
    } else {
        eye = {
            headline: '最初から目を開けておく',
            detail: '目は開けたままにしておいてください。',
        }
    }

    // 🗣️ 声・話し方
    let verbal: ActorGuidanceItem
    if (v === 1) {
        verbal = {
            headline: '一言も声を出さない（完全無言）',
            detail: '何を聞かれても、どこを触られても、うめき声すら出さず完全に無言を通してください。',
        }
    } else if (v === 2) {
        verbal = {
            headline: '言葉は話さず「うめき声」だけを出す',
            detail: '日本語で会話してはいけません。質問されたり触られたりしたときは「うぅ…」「あぁ…」といううめき声だけを出してください。',
        }
    } else if (v === 3) {
        verbal = {
            headline: '「痛い…」「苦しい…」など単語だけをポツリと言う',
            detail: '文で会話しないでください。質問に正しく答えず、「痛い…」「苦しい…」などの短い単語だけをポツリと言ってください。',
        }
    } else if (v === 4) {
        verbal = {
            headline: '混乱してうまく思い出せないように答える',
            detail: '会話はできますが、質問されても「ここどこですか？」「何があったか思い出せません…」のように曖昧に答えてください。名前や状況などをスラスラ答えないでください。',
        }
    } else {
        verbal = {
            headline: '普通に会話して質問に答える',
            detail: 'スタッフから質問されたら、下の「質問されたときの答え方」を見ながら普通に答えてください。',
        }
    }

    // 💪 体の動き
    let motor: ActorGuidanceItem
    if (m === 1) {
        motor = {
            headline: 'ピクリとも動かない',
            detail: '全身の力を抜いて、どこを触られても、何をされても、完全に動かないでください。',
        }
    } else if (m === 2) {
        motor = {
            headline: '強く刺激されたときだけ手足をピンと突っ張る',
            detail: '「手を握って」などの指示には従わないでください。体を強く押されたときだけ、腕や足をピンと伸ばして突っ張ってください。',
        }
    } else if (m === 3) {
        motor = {
            headline: '強く刺激されたときだけ腕を胸の前で曲げる',
            detail: '「手を握って」などの指示には従わないでください。体を強く押されたときだけ、両腕を胸の前にギュッと引き寄せて曲げてください。',
        }
    } else if (m === 4) {
        motor = {
            headline: '痛い場所を触られたら体をビクッと引っ込める',
            detail: '「手を握って」などの指示には従わないでください。痛い場所を触られたときだけ、体をビクッと縮めて逃げる動きをしてください。',
        }
    } else if (m === 5) {
        motor = {
            headline: '痛い場所を押されたら手で払いのける',
            detail: '「手を握って」などの指示には従わないでください。痛い場所を押されたときだけ、その場所を手で払いのけたり押さえたりしてください。',
        }
    } else {
        motor = {
            headline: 'スタッフの指示通りに体を動かす',
            detail: '「手を握ってください」「足を動かしてください」と言われたら、その通りに動かしてください。',
        }
    }

    // 部位別の痛み反応（現在のVとMに合わせて矛盾なく生成）
    const f = patient.findings
    const hasHeadInjury = Boolean(f?.head_and_neck && !f.head_and_neck.includes('明らかな外傷性変化なし') && !f.head_and_neck.includes('特記'))
    const hasChestInjury = Boolean(f?.chest && !f.chest.includes('明らかな外傷性変化なし') && !f.chest.includes('特記'))
    const hasAbdomenInjury = Boolean(f?.abdomen_and_pelvis && !f.abdomen_and_pelvis.includes('明らかな外傷性変化なし') && !f.abdomen_and_pelvis.includes('特記'))
    const hasLimbsInjury = Boolean(f?.limbs && !f.limbs.includes('明らかな外傷性変化なし') && !f.limbs.includes('特記'))

    const painGuides: string[] = []
    if (m >= 2) {
        const reactPhrase =
            v === 1 ? '声は出さずに顔をしかめる・体を動かすだけにしてください' :
            v === 2 ? '「うぅ…」とうめき声を出し、顔をゆがめてください' :
            v === 3 ? '「痛い！」と一言だけ声を出し、顔をしかめてください' :
            '「痛い！」「そこが痛いです！」と伝えてください'

        if (hasHeadInjury) painGuides.push(`🤕 頭・顔・首を触られたら：${reactPhrase}。`)
        if (hasChestInjury) painGuides.push(`😮‍💨 胸を押されたり触られたら：${reactPhrase}。息苦しそうに胸を押さえてください。`)
        if (hasAbdomenInjury) painGuides.push(`😣 お腹・腰・骨盤を押されたら：${reactPhrase}。`)
        if (hasLimbsInjury) painGuides.push(`🦵 腕や足を触られたり動かされたら：${reactPhrase}。`)
    }
    if (rr >= 24 && !isCpa) {
        painGuides.push('🌬️ 呼吸のしかた：肩を上下させて、普段より速く苦しそうに息をしてください。')
    } else if (rr === 0 || isCpa) {
        painGuides.push('🛑 呼吸・動きのしかた：胸が動かないように浅く静かにして、一切反応しないでください。')
    }

    // 質問への答え方（V5のときのみ患者背景・AMPLEを表示。V4以下は絶対に出さない）
    const canAnswerQuestions = v === 5
    const v4FallbackReply = v === 4
        ? '聞かれても「ここどこですか？」「頭がボーッとしてよく思い出せません…」と答えてください。'
        : null

    const qaItems: { question: string; answer: string }[] = canAnswerQuestions ? [
        {
            question: '「お名前と年齢を教えてください」',
            answer: `${patient.name}、${patient.age}歳です。`,
        },
        {
            question: '「何があったんですか？（いつ・どうして怪我をしましたか？）」',
            answer: extractAmpleLine(patient, f?.ample_e, /E[：:\s]*受傷機転[：:\s]*(.+)/i, f?.background || '事故に遭って怪我をしました。'),
        },
        {
            question: '「アレルギーはありますか？」',
            answer: extractAmpleLine(patient, f?.ample_a, /A[：:\s]*アレルギー[：:\s]*(.+)/i, 'ありません'),
        },
        {
            question: '「普段飲んでいるお薬や持病はありますか？」',
            answer: [
                extractAmpleLine(patient, f?.ample_m, /M[：:\s]*内服薬[：:\s]*(.+)/i, ''),
                extractAmpleLine(patient, f?.ample_p, /P[：:\s]*既往歴[：:\s]*(.+)/i, ''),
            ].filter(Boolean).join(' ／ ') || '特にありません',
        },
        {
            question: '「最後に食事をとったのはいつですか？」',
            answer: extractAmpleLine(patient, f?.ample_l, /L[：:\s]*最終飲食[：:\s]*(.+)/i, '数時間前です'),
        },
        ...(f?.background ? [{
            question: '「ご家族や普段の生活について聞かれたら」',
            answer: f.background,
        }] : []),
    ] : []

    // 現在のバイタルサイン（模擬患者向け平易表現付き）
    const vitalsCards: ActorVitalDisplay[] = []
    if (sbp !== undefined && dbp !== undefined) {
        const bpStatus =
            sbp === 0 ? '血圧が測れない危険な状態（心停止）' :
            sbp < 90 ? '血圧がかなり低く、ショック状態です' :
            sbp > 160 ? '血圧が高めです' : '血圧は落ち着いています'
        vitalsCards.push({
            label: '血圧 (BP)',
            value: `${sbp}/${dbp}`,
            unit: 'mmHg',
            statusText: bpStatus,
            isAbnormal: sbp < 90 || sbp > 170,
        })
    }
    const hrStatus =
        hr === 0 ? '脈が触れない状態（心停止）' :
        hr >= 120 ? '心臓がドキドキとかなり速く打っています' :
        hr >= 100 ? '脈拍がやや速めです' :
        hr < 50 ? '脈拍がかなりゆっくりです' : '脈拍は落ち着いています'
    vitalsCards.push({
        label: '脈拍 (HR)',
        value: `${hr}`,
        unit: '回/分',
        statusText: hrStatus,
        isAbnormal: hr < 50 || hr > 120 || hr === 0,
    })

    const rrStatus =
        rr === 0 ? '呼吸が止まっている状態です' :
        rr >= 30 ? 'ハァハァと息がかなり速く苦しい状態です' :
        rr >= 24 ? '呼吸が浅く速くなっています' :
        rr < 10 ? '呼吸が弱くゆっくりです' : '呼吸は落ち着いています'
    vitalsCards.push({
        label: '呼吸の速さ (RR)',
        value: `${rr}`,
        unit: '回/分',
        statusText: rrStatus,
        isAbnormal: rr < 10 || rr > 25,
    })

    if (spo2 !== undefined) {
        const spo2Status =
            spo2 === 0 ? '酸素が取り込めていません' :
            spo2 < 90 ? '体内の酸素がかなり足りず、息苦しい状態です' :
            spo2 < 94 ? '体内の酸素が少し不足しています' : '酸素は十分足りています'
        vitalsCards.push({
            label: '酸素の数値 (SpO2)',
            value: `${spo2}`,
            unit: '%',
            statusText: spo2Status,
            isAbnormal: spo2 < 94,
        })
    }

    if (temp !== undefined) {
        vitalsCards.push({
            label: '体温 (KT)',
            value: temp.toFixed(1),
            unit: '℃',
            statusText: temp < 35.5 ? '体が冷えて低体温ぎみです' : temp >= 38 ? '熱があります' : '平熱です',
            isAbnormal: temp < 35.5 || temp >= 38,
        })
    }

    return {
        gcs: { e, v, m },
        isCpa,
        isSpeechBlocked: v <= 2,
        eye,
        verbal,
        motor,
        painGuides,
        specialInstruction: patient.acting_instructions?.trim() || null,
        canAnswerQuestions,
        v4FallbackReply,
        qaItems,
        vitalsCards,
        visibleFindings: extractVisibleFindings(patient, rr, v, m),
    }
}
