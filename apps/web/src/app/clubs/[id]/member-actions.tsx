'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { approveMember, removeMember, setMemberRole, type ActionResult } from './actions';

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }
  return { run, pending, error };
}

export function PendingActions({ clubId, profileId }: { clubId: string; profileId: string }) {
  const { run, pending, error } = useAction();
  return (
    <div className="row" style={{ gap: 8 }}>
      <button
        className="button"
        style={{ background: 'var(--success)', boxShadow: 'none', padding: '8px 14px' }}
        disabled={pending}
        onClick={() => run(() => approveMember({ clubId, profileId }))}
      >
        Onayla
      </button>
      <button
        className="button button-ghost"
        style={{ padding: '8px 14px', color: 'var(--danger)' }}
        disabled={pending}
        onClick={() => run(() => removeMember({ clubId, profileId }))}
      >
        Reddet
      </button>
      {error && (
        <span className="error" style={{ padding: '4px 8px' }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function MemberActions({
  clubId,
  profileId,
  role,
}: {
  clubId: string;
  profileId: string;
  role: 'admin' | 'member';
}) {
  const { run, pending, error } = useAction();
  return (
    <div className="row" style={{ gap: 8 }}>
      {role === 'member' ? (
        <button
          className="button button-ghost"
          style={{ padding: '8px 14px' }}
          disabled={pending}
          onClick={() => run(() => setMemberRole({ clubId, profileId, role: 'admin' }))}
        >
          Yönetici yap
        </button>
      ) : (
        <button
          className="button button-ghost"
          style={{ padding: '8px 14px' }}
          disabled={pending}
          onClick={() => run(() => setMemberRole({ clubId, profileId, role: 'member' }))}
        >
          Üyeliğe al
        </button>
      )}
      <button
        className="button button-ghost"
        style={{ padding: '8px 14px', color: 'var(--danger)' }}
        disabled={pending}
        onClick={() => run(() => removeMember({ clubId, profileId }))}
      >
        Çıkar
      </button>
      {error && (
        <span className="error" style={{ padding: '4px 8px' }}>
          {error}
        </span>
      )}
    </div>
  );
}
