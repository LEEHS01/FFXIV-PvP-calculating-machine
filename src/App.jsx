import React from "react";
import "./App.css";

/* ===== 공통 데이터 ===== */
const BASE_LB = 40000; // 기공사 LB 고정

const ROLES = {
  TANK: "탱커",
  HEALER: "힐러",
  MELEE: "근딜",
  RPHYS: "원딜(물리)",
  RMAG: "원딜(마법)",
};

const JOBS = [
  { name: "나이트", reduction: 0.50, hp: 64500, role: ROLES.TANK },
  { name: "전사", reduction: 0.55, hp: 66000, role: ROLES.TANK },
  { name: "암흑기사", reduction: 0.40, hp: 64500, role: ROLES.TANK },
  { name: "건브레이커", reduction: 0.55, hp: 63000, role: ROLES.TANK },

  { name: "몽크", reduction: 0.50, hp: 63000, role: ROLES.MELEE },
  { name: "용기사", reduction: 0.50, hp: 61500, role: ROLES.MELEE },
  { name: "닌자", reduction: 0.45, hp: 60000, role: ROLES.MELEE },
  { name: "사무라이", reduction: 0.50, hp: 61500, role: ROLES.MELEE },
  { name: "리퍼", reduction: 0.50, hp: 61500, role: ROLES.MELEE },
  { name: "바이퍼", reduction: 0.60, hp: 61500, role: ROLES.MELEE },

  { name: "음유시인", reduction: 0.30, hp: 55500, role: ROLES.RPHYS },
  { name: "기공사", reduction: 0.30, hp: 57000, role: ROLES.RPHYS },
  { name: "무도가", reduction: 0.35, hp: 58500, role: ROLES.RPHYS },

  { name: "흑마도사", reduction: 0.30, hp: 54000, role: ROLES.RMAG },
  { name: "소환사", reduction: 0.30, hp: 57000, role: ROLES.RMAG },
  { name: "적마도사", reduction: 0.38, hp: 58500, role: ROLES.RMAG },
  { name: "픽토맨서", reduction: 0.30, hp: 55500, role: ROLES.RMAG },

  { name: "백마도사", reduction: 0.25, hp: 55500, role: ROLES.HEALER },
  { name: "학자",   reduction: 0.30, hp: 55500, role: ROLES.HEALER },
  { name: "점성술사", reduction: 0.25, hp: 54000, role: ROLES.HEALER },
  { name: "현자",   reduction: 0.35, hp: 54000, role: ROLES.HEALER },
];

// 투쟁단계(0~5) → 내부 %값 0,10,...,50
const STAGES = [0,1,2,3,4,5];

const fmtNum = (n) => Math.round(n).toLocaleString();
const fmtPct = (v, d=2) => `${v.toFixed(d)}%`;

function Seg({active, onClick, children}) {
  return <button className={`seg ${active?"active":""}`} onClick={onClick}>{children}</button>;
}

export default function App(){
  const [tab, setTab] = React.useState("LB"); // "LB" | "COMBO"

  /* 공통 입력 */
  const [partySize, setPartySize]   = React.useState(2);
  const [roleFilter, setRoleFilter] = React.useState("전체");
  const [sortKey, setSortKey]       = React.useState("hpLostPct");
  const [sortDir, setSortDir]       = React.useState("desc");

  // 투쟁단계 내부 저장값: % (0,10,...,50)
  const [globalF, setGlobalF]   = React.useState(0);
  const [memberFs, setMemberFs] = React.useState([0,0]);

  React.useEffect(()=>{
    setMemberFs(prev=>{
      const next = prev.slice(0, partySize);
      while(next.length<partySize) next.push(globalF);
      return next;
    });
  }, [partySize]); // eslint-disable-line

  const applyGlobalF = ()=> setMemberFs(Array.from({length: partySize}, ()=>globalF));

  /* ========== LB 탭 ========== */
  const [buff25_LB, setBuff25_LB] = React.useState(false); // LB 전용 +25%

  const lbTotalDamage = (job)=>{
    const taken = 1 - job.reduction;
    const atk   = buff25_LB ? 1.25 : 1.0;
    const base  = BASE_LB * taken * atk;
    return memberFs.reduce((sum,f)=> sum + base*(1+f/100), 0);
  };

  /* ========== 콤보 탭(드릴+독수리 or 드릴+25%) ========== */
  // 공용 스킬 선택: 독수리의 눈 또는 +25% 버프(서로 배타)
  const [comboChoice, setComboChoice] = React.useState("EAGLE"); // "EAGLE" | "BUFF25"

  // 콤보 1타 위력(투쟁 단계 적용 전, Guard 무시 가정)
  // 드릴은 항상 분석으로 2배
  const comboPerHitForJob = (job)=>{
    const taken = 1 - job.reduction;
    const drill2 = 9000 * 2 * taken; // 분석 2배 + 받는피해↓
    if (comboChoice === "EAGLE") {
      const eagle = 12000 * taken;   // 독수리의 눈(버프 없음)
      return drill2 + eagle;         // 드릴 + 독수리
    } else {
      return drill2 * 1.25;          // 드릴 + (+25% 버프)
    }
  };

  const comboTotalDamage = (job)=>{
    const perHit = comboPerHitForJob(job);
    return memberFs.reduce((sum,f)=> sum + perHit*(1+f/100), 0);
  };

  /* 결과 공통 */
  const buildRows = (mode)=>{
    const list = (roleFilter==="전체") ? JOBS : JOBS.filter(j=>j.role===roleFilter);
    const calc = (job)=>{
      const total = (mode==="LB") ? lbTotalDamage(job) : comboTotalDamage(job);
      const lost  = Math.min(100, (total / job.hp) * 100);
      const remain= Math.max(0, 100 - lost);
      return { ...job, total, hpLostPct: lost, remainPct: remain, dead: total >= job.hp };
    };
    const dir = (sortDir==="asc") ? 1 : -1;
    return list.map(calc).sort((a,b)=>{
      if (sortKey==="name") return a.name.localeCompare(b.name)*dir;
      if (sortKey==="total") return (a.total-b.total)*dir;
      if (sortKey==="hpLostPct") return (a.hpLostPct-b.hpLostPct)*dir;
      if (sortKey==="remainPct") return (a.remainPct-b.remainPct)*dir;
      return 0;
    });
  };

  const rows = buildRows(tab==="LB" ? "LB" : "COMBO");

  return (
    <div className="wrap">
      <header className="header">
        <h1>FFXIV PvP 전장 기공사 계산기</h1>
        <div className="tabs">
          <Seg active={tab==="LB"} onClick={()=>setTab("LB")}>리미트 브레이크</Seg>
          <Seg active={tab==="COMBO"} onClick={()=>setTab("COMBO")}>드릴 + 독수리의 눈</Seg>
        </div>
      </header>

      {/* 공통: 역할 필터 & 정렬 */}
      <section className="segWrap">
        {["전체","탱커","힐러","근딜","원딜(물리)","원딜(마법)"].map(v=>(
          <button key={v} className={`seg ${roleFilter===v?"active":""}`} onClick={()=>setRoleFilter(v)}>{v}</button>
        ))}
        <div className="spacer" />
        <label className="sortLbl">정렬</label>
        <select className="sortSel" value={sortKey} onChange={e=>setSortKey(e.target.value)}>
          <option value="hpLostPct">HP 소모%</option>
          <option value="total">총딜</option>
          <option value="remainPct">남는 HP%</option>
          <option value="name">직업명</option>
        </select>
        <select className="sortSel" value={sortDir} onChange={e=>setSortDir(e.target.value)}>
          <option value="desc">내림차순</option>
          <option value="asc">오름차순</option>
        </select>
      </section>

      {/* 탭별 입력 */}
      {tab==="LB" && (
        <section className="grid2">
          <div className="card">
            <h2>기공사 리미트 브레이크 40000딜</h2>
            <div className="fields">
              <div className="field">
                <label>파티 인원수</label>
                <div className="inline">
                  <button className="btn" onClick={()=>setPartySize(s=>Math.max(1,s-1))}>−</button>
                  <select value={partySize} onChange={e=>setPartySize(Number(e.target.value))}>
                    {[1,2,3,4].map(n=><option key={n} value={n}>{n}인</option>)}
                  </select>
                  <button className="btn" onClick={()=>setPartySize(s=>Math.min(4,s+1))}>＋</button>
                </div>
              </div>

              <div className="field">
                <label>+25% 버프</label>
                <select value={buff25_LB?"예":"아니오"} onChange={e=>setBuff25_LB(e.target.value==="예")}>
                  <option>아니오</option><option>예</option>
                </select>
              </div>

              <div className="field">
                <label>투쟁단계 (0~5)</label>
                <select value={globalF/10} onChange={e=>setGlobalF(Number(e.target.value)*10)}>
                  {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="field">
                <label>&nbsp;</label>
                <button className="btnPrimary" onClick={applyGlobalF}>파티원 투쟁단계 일괄 적용</button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>파티원별 투쟁단계</h2>
            <div className="partyGrid">
              {Array.from({length: partySize}).map((_,i)=>(
                <div key={i} className="partyItem">
                  <span className="partyLabel">파티원 {i+1}</span>
                  <select
                    value={(memberFs[i] ?? 0)/10}
                    onChange={e=>{
                      const stage = Number(e.target.value); // 0~5
                      setMemberFs(prev=>prev.map((x,idx)=> idx===i? stage*10 : x));
                    }}
                  >
                    {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p className="hint">* 인원수 변경 시 입력칸이 자동으로 늘/줄어듭니다.</p>
          </div>
        </section>
      )}

      {tab==="COMBO" && (
        <section className="grid2">
          <div className="card">
            <h2>드릴 + 공용 스킬 선택</h2>
            <div className="fields">
              <div className="field">
                <label>공용 스킬</label>
                <select value={comboChoice} onChange={e=>setComboChoice(e.target.value)}>
                  <option value="EAGLE">독수리의 눈(12,000)</option>
                  <option value="BUFF25">+25% 버프</option>
                </select>
                <p className="tiny">드릴은 항상 <b>분석 2배</b> 적용. 두 옵션은 서로 배타.</p>
              </div>

              <div className="field">
                <label>파티 인원수</label>
                <div className="inline">
                  <button className="btn" onClick={()=>setPartySize(s=>Math.max(1,s-1))}>−</button>
                  <select value={partySize} onChange={e=>setPartySize(Number(e.target.value))}>
                    {[1,2,3,4].map(n=><option key={n} value={n}>{n}인</option>)}
                  </select>
                  <button className="btn" onClick={()=>setPartySize(s=>Math.min(4,s+1))}>＋</button>
                </div>
              </div>

              <div className="field">
                <label>투쟁단계 (0~5)</label>
                <select value={globalF/10} onChange={e=>setGlobalF(Number(e.target.value)*10)}>
                  {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="field">
                <label>&nbsp;</label>
                <button className="btnPrimary" onClick={applyGlobalF}>파티원 투쟁단계 일괄 적용</button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>파티원별 투쟁단계</h2>
            <div className="partyGrid">
              {Array.from({length: partySize}).map((_,i)=>(
                <div key={i} className="partyItem">
                  <span className="partyLabel">파티원 {i+1}</span>
                  <select
                    value={(memberFs[i] ?? 0)/10}
                    onChange={e=>{
                      const stage = Number(e.target.value); // 0~5
                      setMemberFs(prev=>prev.map((x,idx)=> idx===i? stage*10 : x));
                    }}
                  >
                    {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p className="hint">* 동일 콤보를 파티원이 동시에 적중한다고 가정.</p>
          </div>
        </section>
      )}

      {/* 결과 */}
      <section className="card tableCard">
        <table className="tbl">
          <thead>
            <tr>
              <th>직업</th><th>역할</th><th>받는피해↓</th><th>HP</th>
              <th>총 딜(합산)</th><th>HP 소모%</th><th>남는 HP%</th><th>사망</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.role}</td>
                <td>{Math.round(r.reduction*100)}%</td>
                <td>{fmtNum(r.hp)}</td>
                <td>{fmtNum(r.total)}</td>
                <td className="pct red">{fmtPct(r.hpLostPct)}</td>
                <td className="pct">{fmtPct(r.remainPct)}</td>
                <td className={r.dead?"dead":"alive"}>{r.dead?"예":"아니오"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">
        LB: 40,000 고정 · 콤보: 드릴(9,000×2, Guard무시) + [독수리(12,000) <b>또는</b> +25% 버프] 중 택1.
      </footer>
    </div>
  );
}
