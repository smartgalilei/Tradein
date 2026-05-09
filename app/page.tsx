export default function ProductPage() {
  return (
    <>
      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="badge">AI時代の買取入口</div>
            <h1 className="title">
              売りたい人の
              <br />
              「これ、いくら？」を
              <br />
              買取店につなぐ。
            </h1>
            <p className="lead">
              ChatGPT・Gemini・LINE AI で生まれる売却相談を、商談可能な買取リードへ。
            </p>
            <div className="pill">中古車買取店向け AI Agent</div>
          </div>
          <div className="manga-card">
            <div className="burst">
              査定予約
              <br />
              まで
              <br />
              自動案内
            </div>
            <div className="phone">
              <div className="bubble user">この古い車、売るならいくらくらい？</div>
              <div className="bubble ai">車種・年式・走行距離を教えてください。</div>
              <div className="bubble user">2019年 Alphard、7万kmです。</div>
              <div className="bubble ai">対応可能な買取店に概算確認できます。</div>
            </div>
          </div>
        </div>
      </header>

      <section>
        <div className="wrap">
          <div className="center">
            <h2>いま起きている変化</h2>
            <p>ユーザーは検索より先に、AIへ相談し始めます。</p>
          </div>
          <div className="problem">
            <div className="small"><div className="emoji">💬</div><h3>相談はAIへ</h3><p>「車を売りたい」「相場を知りたい」がAIとの会話で始まる。</p></div>
            <div className="small"><div className="emoji">📉</div><h3>情報はバラバラ</h3><p>車種・距離・写真・地域が揃わず、商談化しにくい。</p></div>
            <div className="small"><div className="emoji">🏁</div><h3>早い店が勝つ</h3><p>良い車源ほど、早く自然に査定予約へ進めた店が強い。</p></div>
          </div>
        </div>
      </section>

      <section className="soft-blue">
        <div className="wrap">
          <div className="center">
            <h2>ビジネスフロー</h2>
            <p>ユーザーのAI相談から、現車査定まで。</p>
          </div>
          <div className="comic-flow">
            <Flow num="01" icon="👤💬" title="ユーザーがChatGPTに相談" text="「古い車を売りたい。いくらくらい？」" />
            <Flow num="02" icon="🤖📝" title="ChatGPTが情報整理" text="車種・年式・距離・修復歴・写真・所在地を確認。" />
            <Flow num="03" icon="📨🚗" title="Agentが商戶へ共有" text="整理済みリードを、相性の良い買取店へ送信。" last />
            <Flow num="04" icon="🏪💴" title="商戶が概算报价" text="買取店が価格帯・条件をAgentへ返答。" />
            <Flow num="05" icon="🤖✅" title="ChatGPTがユーザーへ提示" text="価格・条件・次の流れをわかりやすく返信。" />
            <Flow num="06" icon="📅🤝" title="同意後、現車査定へ" text="ユーザーがOKなら、商戶が直接連絡。日程調整へ。" last />
          </div>
        </div>
      </section>

      <section>
        <div className="wrap demo">
          <div className="big">
            <p className="quote">AIが聞いて、<br />Agentがつなぎ、<br />買取店が動く。</p>
            <p className="body-copy">新しいC向けアプリを無理に広めるのではなく、AI相談の中にある「売りたい気持ち」を商談へ変えます。</p>
          </div>
          <div className="lead-card">
            <h3>商戶に届くリード例</h3>
            <Row label="車両" value="2019 Toyota Alphard" />
            <Row label="状態" value="70,000km / 修復歴なし / 車検8ヶ月" />
            <Row label="所在地" value="東京都内" />
            <Row label="希望" value="出張査定・2週間以内に売却検討" />
            <div className="row"><b>優先度</b><span><span className="tag">高</span> 輸出需要あり</span></div>
          </div>
        </div>
      </section>

      <section className="soft-yellow">
        <div className="wrap">
          <div className="center"><h2>買取店へのメリット</h2></div>
          <div className="problem">
            <div className="small"><div className="emoji">🎯</div><h3>質の高いリード</h3><p>査定前に必要情報が揃っている。</p></div>
            <div className="small"><div className="emoji">⏱️</div><h3>対応時間を短縮</h3><p>スタッフの聞き取り作業を減らす。</p></div>
            <div className="small"><div className="emoji">🚀</div><h3>AI入口に先行対応</h3><p>将来の買取導線を早めに押さえる。</p></div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <h2>AI買取マッチング・エージェント</h2>
          <p>売却相談を、査定予約へ。</p>
          <div className="pill">中古車買取店向け 提案資料</div>
        </div>
      </footer>
    </>
  );
}

function Flow(props: { num: string; icon: string; title: string; text: string; last?: boolean }) {
  return (
    <div className="panel">
      <div className="num">{props.num}</div>
      <div className="emoji">{props.icon}</div>
      <h3>{props.title}</h3>
      <p>{props.text}</p>
      {!props.last && <div className="arrow">→</div>}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="row">
      <b>{props.label}</b>
      <span>{props.value}</span>
    </div>
  );
}
