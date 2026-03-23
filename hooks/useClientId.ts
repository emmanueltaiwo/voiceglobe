'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'voiceglobe_client_id';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useClientId(): string | null {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    setClientId(id);
  }, []);

  return clientId;
}
