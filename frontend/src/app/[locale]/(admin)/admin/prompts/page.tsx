'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminGet, adminPut, adminPost } from '@/lib/admin-api';

interface PromptSummary {
  name: string;
  label: string;
  tier: string | null;
  isActive: boolean;
  version: number;
  updatedAt: string;
}

interface PromptHistoryEntry {
  version: number;
  content: string;
  savedAt: string;
  savedBy: string;
}

interface PromptDetail {
  name: string;
  label: string;
  content: string;
  version: number;
  history: PromptHistoryEntry[];
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [detail, setDetail] = useState<PromptDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await adminGet<PromptSummary[]>('/prompts');
      setPrompts(data);
    } catch {
      setPrompts([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchDetail = useCallback(async (name: string) => {
    setLoadingDetail(true);
    setSaveMessage(null);
    try {
      const data = await adminGet<PromptDetail>(`/prompts/${name}`);
      setDetail(data);
      setContent(data.content);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSelect = (name: string) => {
    setSelectedName(name);
    fetchDetail(name);
  };

  const handleSave = async () => {
    if (!selectedName || !detail) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await adminPut(`/prompts/${selectedName}`, { content, savedBy: 'admin@example.com' });
      setSaveMessage({ type: 'success', text: 'New version saved successfully.' });
      await fetchDetail(selectedName);
      await fetchList();
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (!selectedName) return;
    setRestoring(version);
    setSaveMessage(null);
    try {
      await adminPost(`/prompts/${selectedName}/restore/${version}`, {});
      setSaveMessage({ type: 'success', text: `Restored to version ${version}.` });
      await fetchDetail(selectedName);
      await fetchList();
    } catch {
      setSaveMessage({ type: 'error', text: `Failed to restore version ${version}.` });
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      style={{ minHeight: '100vh', background: '#0D0010', color: '#fff', fontFamily: 'Space Grotesk, sans-serif' }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px' }}>
        {/* Page Title */}
        <h1
          className="gradient-text"
          style={{ fontSize: 32, fontWeight: 700, marginBottom: 32 }}
        >
          Prompt Editor
        </h1>

        {/* Split layout */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Left Panel — 30% */}
          <div
            className="glass-panel"
            style={{ width: '30%', minWidth: 220, padding: 20 }}
          >
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
              Prompts
            </h2>

            {loadingList ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: '12px 0' }}>Loading prompts…</div>
            ) : prompts.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: '12px 0' }}>No prompts found.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {prompts.map((p) => (
                  <li key={p.name}>
                    <button
                      onClick={() => handleSelect(p.name)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: selectedName === p.name ? 'rgba(228,26,255,0.08)' : 'transparent',
                        border: selectedName === p.name ? '1px solid #e41aff' : '1px solid transparent',
                        borderRadius: 10,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: selectedName === p.name ? '#e41aff' : '#fff' }}>
                          {p.label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            background: 'rgba(228,26,255,0.15)',
                            color: '#e41aff',
                            borderRadius: 6,
                            padding: '2px 7px',
                            letterSpacing: '0.05em',
                          }}
                        >
                          v{p.version}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                        {formatDate(p.updatedAt)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right Panel — 70% */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!selectedName ? (
              <div
                className="glass-panel"
                style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 15 }}
              >
                Select a prompt from the list to edit it.
              </div>
            ) : loadingDetail ? (
              <div
                className="glass-panel"
                style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 15 }}
              >
                Loading…
              </div>
            ) : detail ? (
              <>
                {/* Editor Panel */}
                <div className="glass-panel" style={{ padding: 28, marginBottom: 24 }}>
                  {/* Subheader */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>{detail.label}</h2>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        background: 'rgba(0,240,255,0.12)',
                        color: '#00f0ff',
                        borderRadius: 6,
                        padding: '3px 10px',
                        letterSpacing: '0.05em',
                        border: '1px solid rgba(0,240,255,0.25)',
                      }}
                    >
                      v{detail.version}
                    </span>
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="font-mono"
                    style={{
                      width: '100%',
                      minHeight: 300,
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(228,26,255,0.2)',
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: 13,
                      padding: '14px 16px',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      lineHeight: 1.6,
                    }}
                    spellCheck={false}
                  />

                  {/* Save Button + Message */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        background: saving ? 'rgba(228,26,255,0.3)' : 'linear-gradient(90deg, #e41aff, #00f0ff)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14,
                        border: 'none',
                        borderRadius: 10,
                        padding: '11px 28px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                        transition: 'opacity 0.2s',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {saving ? 'Saving…' : 'Save New Version'}
                    </button>

                    {saveMessage && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: saveMessage.type === 'success' ? '#00f0ff' : '#ff0080',
                        }}
                      >
                        {saveMessage.text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Version History Panel */}
                {detail.history && detail.history.length > 0 && (
                  <div className="glass-panel" style={{ padding: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16, marginTop: 0 }}>
                      Version History
                    </h3>

                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {detail.history.slice(0, 10).map((entry) => (
                        <li
                          key={entry.version}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(0,0,0,0.25)',
                            borderRadius: 10,
                            padding: '12px 16px',
                            gap: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                background: 'rgba(228,26,255,0.12)',
                                color: '#e41aff',
                                borderRadius: 6,
                                padding: '2px 8px',
                                whiteSpace: 'nowrap',
                                border: '1px solid rgba(228,26,255,0.2)',
                              }}
                            >
                              v{entry.version}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {formatDate(entry.savedAt)}
                              </div>
                              {entry.savedBy && (
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                                  {entry.savedBy}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleRestore(entry.version)}
                            disabled={restoring === entry.version}
                            style={{
                              background: 'rgba(255,0,128,0.1)',
                              border: '1px solid rgba(255,0,128,0.3)',
                              color: '#ff0080',
                              fontWeight: 600,
                              fontSize: 12,
                              borderRadius: 8,
                              padding: '6px 14px',
                              cursor: restoring === entry.version ? 'not-allowed' : 'pointer',
                              opacity: restoring === entry.version ? 0.5 : 1,
                              whiteSpace: 'nowrap',
                              transition: 'opacity 0.2s',
                            }}
                          >
                            {restoring === entry.version ? 'Restoring…' : 'Restore'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div
                className="glass-panel"
                style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 15 }}
              >
                Failed to load prompt details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
