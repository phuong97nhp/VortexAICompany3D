import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useCompanyStore } from '../../store/useCompanyStore';

/**
 * Giant 3D KPI Screen mounted in Data & Analytics room (Floor 2)
 * Renders real metrics from the database onto a crisp CanvasTexture.
 */
export function KpiScreen3D({ position }: { position: [number, number, number] }) {
  const leads = useCompanyStore((s) => s.leads);
  const outreachLogs = useCompanyStore((s) => s.outreachLogs);
  const tokenUsage = useCompanyStore((s) => s.tokenUsage);
  const expenses = useCompanyStore((s) => s.expenses);
  const expenseBudgets = useCompanyStore((s) => s.expenseBudgets);
  const envMode = useCompanyStore((s) => s.settings.envMode);
  const brand = useCompanyStore((s) => s.settings.brand);

  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    return c;
  }, []);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [canvas]);

  useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const totalLeads = leads.length;
    const sent = outreachLogs.filter((o) => o.result === 'sent_dry_run' || o.result === 'sent_live').length;
    const replied = leads.filter((l) => ['replied', 'demo', 'proposal', 'won'].includes(l.stage)).length;
    const replyRate = totalLeads > 0 ? `${Math.round((replied / totalLeads) * 100)}%` : '—';
    const demos = leads.filter((l) => l.stage === 'demo').length;
    const won = leads.filter((l) => l.stage === 'won');
    const revenueM = won.length > 0 ? `${(won.reduce((s, l) => s + l.estimatedValueVnd, 0) / 1_000_000).toFixed(1)}M` : '—';
    const todayKey = new Date().toISOString().slice(0, 10);
    const monthKey = todayKey.slice(0, 7);
    const todayTok = tokenUsage
      .filter((t) => t.dateKey === todayKey)
      .reduce((s, t) => s + t.totalTokens, 0);

    const monthSpentVnd = expenses
      .filter(
        (e) =>
          (e.status === 'approved' || e.status === 'paid' || e.status === 'reconciled') &&
          new Date(e.createdAt).toISOString().slice(0, 7) === monthKey
      )
      .reduce((s, e) => s + e.amountVnd, 0);
    const monthBudgetVnd = expenseBudgets
      .filter((b) => b.monthKey === monthKey)
      .reduce((s, b) => s + b.limitVnd, 0);
    const pendingExp = expenses.filter(
      (e) => e.status === 'pending_accountant' || e.status === 'pending_ceo'
    ).length;

    // Draw background
    ctx.fillStyle = '#0B1324';
    ctx.fillRect(0, 0, 512, 256);

    // Header bar using brand primary color
    ctx.fillStyle = brand?.primaryColor || '#1B55E3';
    ctx.fillRect(0, 0, 512, 44);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('DATA & ANALYTICS · KPI HỆ THỐNG', 16, 28);

    // Environment badge pill
    const envBadge =
      envMode === 'live'
        ? { label: 'LIVE · HUBCW', bg: '#DC2626' }
        : envMode === 'read_only'
          ? { label: 'READ-ONLY', bg: '#0284C7' }
          : { label: 'SANDBOX (MÔ PHỎNG)', bg: '#D97706' };
    ctx.fillStyle = envBadge.bg;
    ctx.fillRect(354, 10, 144, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(envBadge.label, 362, 26);

    // 6 Metric tiles (use '—' on empty gaps, never invent numbers)
    const tiles = [
      { label: 'TỔNG LEAD CRM', val: totalLeads > 0 ? String(totalLeads) : '—', color: '#38BDF8' },
      { label: 'TIN ĐÃ GỬI', val: sent > 0 ? String(sent) : '—', color: '#34D399' },
      { label: 'PHẢN HỒI / DEMO', val: `${replyRate} · ${demos}`, color: '#FBBF24' },
      { label: 'DEAL THÀNH CÔNG', val: won.length > 0 ? String(won.length) : '—', color: '#10B981' },
      { label: 'DOANH THU (TR.Đ)', val: revenueM, color: '#F472B6' },
      { label: 'CHI PHÍ THÁNG', val: monthSpentVnd > 0 ? `${(monthSpentVnd / 1_000_000).toFixed(1)}M` : '—', color: '#FB923C' },
    ];

    tiles.forEach((t, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 16 + col * 164;
      const y = 56 + row * 80;
      ctx.fillStyle = '#142038';
      ctx.fillRect(x, y, 152, 68);
      ctx.strokeStyle = 'rgba(148,163,184,0.28)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 152, 68);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(t.label, x + 10, y + 19);

      ctx.fillStyle = t.color;
      ctx.font = 'bold 23px monospace';
      ctx.fillText(t.val, x + 10, y + 52);
    });

    const stamp = new Date().toLocaleTimeString('vi-VN');
    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px monospace';
    ctx.fillText(
      `NGUỒN: ${envMode === 'sandbox' ? 'DEXIE SANDBOX' : 'HUB.CHUYENWEB'} · ${stamp} · TOK: ${todayTok.toLocaleString('vi-VN')} · CHỜ DUYỆT: ${pendingExp} (${(monthBudgetVnd / 1_000_000).toFixed(0)}M)`,
      16,
      240
    );

    texture.needsUpdate = true;
  }, [canvas, texture, leads, outreachLogs, tokenUsage, expenses, expenseBudgets, envMode, brand]);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return (
    <group position={position}>
      {/* Frame */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[4.4, 2.3, 0.14]} />
        <meshStandardMaterial color="#0F172A" roughness={0.35} metalness={0.5} />
      </mesh>
      {/* Screen face */}
      <mesh position={[0, 1.55, 0.08]}>
        <planeGeometry args={[4.15, 2.05]} />
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      </mesh>
      {/* Stand */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.2, 0.4, 0.25]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}
