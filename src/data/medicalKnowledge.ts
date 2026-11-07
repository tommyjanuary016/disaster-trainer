export interface MedicalKnowledgeItem {
    id: string
    category: 'basic' | 'tips' | 'advanced'
    categoryLabel: string
    code: string
    title: string
    content: string
    keyTakeaway: string
}

export const medicalKnowledgeList: MedicalKnowledgeItem[] = [
    {
        id: 'mk-001',
        category: 'basic',
        categoryLabel: '基礎知識',
        code: 'NOTE #001',
        title: '緊張性気胸の即時脱気部位',
        content: 'ショック、片側呼吸音減弱、頚静脈怒張を認めた場合、胸部X線やCTを待たずに即時減圧を行う。穿刺部位は第2肋間鎖骨中線、または第4/5肋間前・中腋窩線である。肋骨下縁には肋間動静脈・神経が走行するため、必ず下位肋骨の上縁を沿わせて14〜16Gの太針カテーテルを刺入する。',
        keyTakeaway: '「肋骨上縁を通す」が血管損傷回避の鉄則'
    },
    {
        id: 'mk-002',
        category: 'basic',
        categoryLabel: '基礎知識',
        code: 'NOTE #002',
        title: 'FASTの4点観察と解剖学的意義',
        content: '心嚢腔、モリソン窩（肝腎境界）、脾腎境界、ダグラス窩（骨盤腔）の4部位を評価する。腹腔内出血は重力に従い低位に貯留するため、仰臥位では解剖学的最低点であるモリソン窩およびダグラス窩が最頻の検出部位となる。陰性であっても後腹膜出血や腸管損傷は除外できない。',
        keyTakeaway: 'FAST陰性でも後腹膜腔出血・腸管損傷は除外不能'
    },
    {
        id: 'mk-003',
        category: 'basic',
        categoryLabel: '基礎知識',
        code: 'NOTE #003',
        title: '骨盤バインダーの装着高位と注意点',
        content: '開放型骨盤骨折に対する骨盤バインダーの適正高位は、腸骨稜（ASIS）ではなく「大転子部（Greater Trochanter）」である。高位に巻くと支点作用により骨盤輪後方の離開を助長する危険がある。過度の締め付けによる皮膚壊死を防ぐため、装着後の下肢内旋位保持と圧迫状況の確認が必須である。',
        keyTakeaway: '装着位置は大転子の高さ。高位装着は離開を増悪させる'
    },
    {
        id: 'mk-004',
        category: 'basic',
        categoryLabel: '基礎知識',
        code: 'NOTE #004',
        title: '外傷性ショックにおける死の三徴',
        content: '低体温（<35℃）、凝固障害、アシドーシス（pH<7.2）の3要素は相互に悪循環を形成し、致死率を跳ね上げる。室温晶質液の大量投与は希釈性凝固障害と体温低下を加速させるため禁忌。早期からの加温、許容低血圧（Damage Control Resuscitation）、血液製剤主体の蘇生を行う。',
        keyTakeaway: '室温輸液の過剰投与は三徴を人工的に増悪させる'
    },
    {
        id: 'mk-005',
        category: 'basic',
        categoryLabel: '基礎知識',
        code: 'NOTE #005',
        title: '一次トリアージ（START法）の判断手順',
        content: '歩行可否を確認（不可は次へ）。気道確保しても自発呼吸がなければ黒、呼吸再開または30回/分以上は赤。循環評価では橈骨動脈触知不可またはCRT 2秒以上で赤。簡単な指示に従えなければ赤、従えれば黄と判定する。過小トリアージを避けるため、迷った場合は上位区分を選択する。',
        keyTakeaway: '迷った際は過小評価を防ぐため上位区分に割り振る'
    },
    {
        id: 'mk-006',
        category: 'tips',
        categoryLabel: '現場TIPS',
        code: 'NOTE #006',
        title: 'トリアージタッグ装着部位の優先順位',
        content: 'タッグのゴム紐は「右手関節」への装着が原則である。右上肢損傷時は左手関節、それも困難な場合は右足関節、左足関節の順に選択する。頭部外傷患者や搬送時の気道閉塞リスク、窒息事故を防止するため、頸部への紐掛けは絶対禁忌である。',
        keyTakeaway: '右手首→左手首→右足首→左足首。頸部装着は絶対禁忌'
    },
    {
        id: 'mk-007',
        category: 'tips',
        categoryLabel: '現場TIPS',
        code: 'NOTE #007',
        title: 'CSCATTTと安全確保の階層性',
        content: '医療行為（TTT: トリアージ・処置・搬送）に先行し、現場指揮通信と安全（CSCA）の確立が不可欠である。特にSafety（安全確保）には明確な階層があり、「救護者自身の安全 ＞ 同僚の安全 ＞ 現場の安全 ＞ 患者の安全」の順で遵守される。自己防護を怠った隊員は二次受傷者となり戦力を損なう。',
        keyTakeaway: '安全の最優先は「救護者自身」。自己防護のない突入は厳禁'
    },
    {
        id: 'mk-008',
        category: 'tips',
        categoryLabel: '現場TIPS',
        code: 'NOTE #008',
        title: 'クラッシュ症候群と挫滅解除前輸液',
        content: '2時間以上挟圧された四肢を解除する直前には、末梢血管確保と大量の細胞外液投与（救出前輸液）を開始しておく必要がある。解除と同時に阻血部位からミオグロビンや高カリウムが体循環へ一気に流入し、致死的不整脈や急性腎障害（Rescue Death）を引き起こすためである。',
        keyTakeaway: '挟圧解除前の輸液路確保と大量投与がRescue Deathを防ぐ'
    },
    {
        id: 'mk-009',
        category: 'advanced',
        categoryLabel: 'アドバンスド',
        code: 'NOTE #009',
        title: 'Damage Control Surgeryの3段階戦略',
        content: '止血と汚染制御のみを行い90分以内に終了する初回手術（Phase I）、ICUで加温・凝固補正・循環蘇生に専念する集中治療（Phase II）、状態安定後（24〜48時間後）に予定根治手術を行う再開腹（Phase III）から構成される。根治を急がず、生理学的限界を超える前に撤退する外科的決断である。',
        keyTakeaway: '手術室で完結させず、ICUでの蘇生を前提に「早期撤退」する'
    },
    {
        id: 'mk-010',
        category: 'advanced',
        categoryLabel: 'アドバンスド',
        code: 'NOTE #010',
        title: 'REBOAのゾーン分類と遮断限界時間',
        content: '左鎖骨下動脈起始部〜腹腔動脈をZone 1（横隔膜下大出血）、最下腎動脈〜大動脈分岐部をZone 3（骨盤骨折大出血）と定義する。内臓動脈起始部を含むZone 2の遮断は禁忌である。Zone 1の完全遮断限界は30〜45分程度であり、長時間の虚血は再灌流時の致死的アシドーシスや臓器不全を招くため段階的減圧が求められる。',
        keyTakeaway: 'Zone 2遮断は禁忌。Zone 1の完全遮断は30〜45分が限界'
    }
]
