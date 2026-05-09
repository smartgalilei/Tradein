"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminOverview, Lead, MerchantReply, UserFeedback } from "../../lib/types";

export default function AdminConsole() {
  const [password, setPassword] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replySummary, setReplySummary] = useState("");
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPassword(window.sessionStorage.getItem("tradein_admin_password") || "");
  }, []);

  useEffect(() => {
    if (password) void loadOverview(password);
  }, [password]);

  async function loadOverview(nextPassword = password) {
    const data = await api<AdminOverview>("/api/admin/overview", {
      method: "GET",
      password: nextPassword
    });
    setOverview(data);
    if (!selectedLeadId && data.leads[0]) setSelectedLeadId(data.leads[0].id);
  }

  async function savePassword() {
    window.sessionStorage.setItem("tradein_admin_password", password);
    await loadOverview(password);
  }

  async function sendOutreach(outreachId: string) {
    const result = await api<{ mode: string; messageId: string | null }>(
      `/api/admin/outreach/${outreachId}/send`,
      { method: "POST", password }
    );
    setMessage(`送信処理完了: ${result.mode} / ${result.messageId || "-"}`);
    await loadOverview();
  }

  async function createManualReply() {
    if (!selectedLeadId || !replySummary || !replyBody) {
      setMessage("返信本文と要約を入力してください。");
      return;
    }
    await api("/api/admin/replies", {
      method: "POST",
      password,
      body: {
        lead_id: selectedLeadId,
        raw_body: replyBody,
        response_summary: replySummary,
        quote_man_yen: quote ? Number(quote) : null
      }
    });
    setReplyBody("");
    setReplySummary("");
    setQuote("");
    setMessage("商戶返信を登録しました。");
    await loadOverview();
  }

  async function approveFeedback(leadId: string) {
    await api(`/api/admin/feedback/${leadId}/approve`, { method: "POST", password });
    setMessage("ユーザー向けフィードバックを承認しました。");
    await loadOverview();
  }

  async function syncGmail() {
    const result = await api<{ imported: number }>("/api/admin/gmail/sync", {
      method: "POST",
      password
    });
    setMessage(`Gmail同期完了: ${result.imported}件`);
    await loadOverview();
  }

  const selectedLead = useMemo(
    () => overview?.leads.find((lead) => lead.id === selectedLeadId),
    [overview, selectedLeadId]
  );
  const selectedOutreach = overview?.outreachAttempts.find(
    (item) => item.lead_id === selectedLeadId
  );
  const selectedFeedback = overview?.feedbacks.find((item) => item.lead_id === selectedLeadId);

  return (
    <main className="admin-body">
      <div className="admin-shell">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-title">Tradein Admin Console</h1>
            <p className="admin-muted">lead 確認、メール送信承認、返信登録、ユーザー反馈承認</p>
          </div>
          <div className="admin-actions">
            <input
              aria-label="Admin password"
              placeholder="ADMIN_PASSWORD"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{ width: 180 }}
            />
            <button className="admin-button primary" onClick={savePassword}>接続</button>
            <button className="admin-button" onClick={() => loadOverview()}>更新</button>
          </div>
        </header>

        {message && <section className="admin-panel"><span className="admin-badge">{message}</span></section>}

        <section className="admin-panel">
          <h2>System</h2>
          <p className="admin-muted">
            DB: {overview?.mode || "-"} / Gmail: {overview?.gmailConfigured ? "configured" : "dry-run"}
            {" "} / Merchant: {overview?.merchant.name || "天野自動車東京店"}
          </p>
        </section>

        <div className="admin-grid">
          <section className="admin-panel">
            <h2>Leads</h2>
            <LeadTable leads={overview?.leads || []} selectedLeadId={selectedLeadId} onSelect={setSelectedLeadId} />
          </section>
          <section className="admin-panel">
            <h2>Selected Lead</h2>
            {selectedLead ? <pre className="admin-pre">{JSON.stringify(selectedLead, null, 2)}</pre> : <p className="admin-muted">No lead selected.</p>}
          </section>
        </div>

        <div className="admin-grid">
          <section className="admin-panel">
            <h2>Approval 1: Merchant Email</h2>
            {selectedOutreach ? (
              <>
                <p><span className="admin-badge">{selectedOutreach.status}</span> {selectedOutreach.destination}</p>
                <p><b>{selectedOutreach.generated_subject}</b></p>
                <pre className="admin-pre">{selectedOutreach.generated_message}</pre>
                <button className="admin-button primary" disabled={selectedOutreach.status !== "pending_approval"} onClick={() => sendOutreach(selectedOutreach.id)}>
                  Approve & Send Email
                </button>
              </>
            ) : <p className="admin-muted">No outreach attempt.</p>}
          </section>

          <section className="admin-panel">
            <h2>Merchant Reply</h2>
            <div className="admin-actions">
              <button className="admin-button" onClick={syncGmail}>Sync Gmail Replies</button>
            </div>
            <textarea placeholder="返信本文" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} />
            <input placeholder="返信要約" value={replySummary} onChange={(event) => setReplySummary(event.target.value)} />
            <input placeholder="見積(万円)" value={quote} onChange={(event) => setQuote(event.target.value)} />
            <button className="admin-button primary" onClick={createManualReply}>返信を登録</button>
          </section>
        </div>

        <div className="admin-grid">
          <section className="admin-panel">
            <h2>Replies</h2>
            <ReplyTable replies={overview?.replies || []} />
          </section>
          <section className="admin-panel">
            <h2>Approval 2: User Feedback</h2>
            {selectedFeedback ? (
              <>
                <p><span className="admin-badge">{selectedFeedback.status}</span></p>
                <pre className="admin-pre">{selectedFeedback.feedback_text}</pre>
                <button className="admin-button primary" disabled={selectedFeedback.status === "approved"} onClick={() => approveFeedback(selectedFeedback.lead_id)}>
                  Approve User Feedback
                </button>
              </>
            ) : <p className="admin-muted">商戶返信を登録すると draft が生成されます。</p>}
            <FeedbackTable feedbacks={overview?.feedbacks || []} />
          </section>
        </div>
      </div>
    </main>
  );
}

function LeadTable(props: { leads: Lead[]; selectedLeadId: string; onSelect: (id: string) => void }) {
  if (!props.leads.length) return <p className="admin-muted">No leads yet.</p>;
  return (
    <table>
      <thead><tr><th>Lead</th><th>Vehicle</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {props.leads.map((lead) => (
          <tr key={lead.id}>
            <td>{lead.id.slice(0, 8)}</td>
            <td>{lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}</td>
            <td><span className="admin-badge">{lead.status}</span></td>
            <td><button className="admin-button" onClick={() => props.onSelect(lead.id)}>{props.selectedLeadId === lead.id ? "選択中" : "選択"}</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReplyTable({ replies }: { replies: MerchantReply[] }) {
  if (!replies.length) return <p className="admin-muted">No replies.</p>;
  return (
    <table>
      <thead><tr><th>Lead</th><th>Quote</th><th>Summary</th></tr></thead>
      <tbody>
        {replies.map((reply) => (
          <tr key={reply.id}>
            <td>{reply.lead_id.slice(0, 8)}</td>
            <td>{reply.quote_man_yen ? `${reply.quote_man_yen}万円` : "-"}</td>
            <td>{reply.response_summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FeedbackTable({ feedbacks }: { feedbacks: UserFeedback[] }) {
  if (!feedbacks.length) return null;
  return (
    <table>
      <thead><tr><th>Lead</th><th>Status</th></tr></thead>
      <tbody>
        {feedbacks.map((feedback) => (
          <tr key={feedback.id}>
            <td>{feedback.lead_id.slice(0, 8)}</td>
            <td><span className="admin-badge">{feedback.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function api<T>(
  path: string,
  options: { method: string; password: string; body?: unknown }
): Promise<T> {
  const response = await fetch(path, {
    method: options.method,
    headers: {
      "content-type": "application/json",
      "x-admin-password": options.password
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}
