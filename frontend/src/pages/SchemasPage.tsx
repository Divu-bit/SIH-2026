/* ═══════════════════════════════════════════════════════════════════════════
   SchemasPage — Browse registered schemas
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { Blocks, CheckCircle, XCircle } from 'lucide-react';
import { listSchemas } from '../services/api';
import type { SchemaRecord } from '../types';

export default function SchemasPage() {
  const [schemas, setSchemas] = useState<SchemaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSchemas()
      .then(setSchemas)
      .catch(() => setSchemas([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="section"><div className="loading-overlay"><div className="spinner" /></div></div>;

  return (
    <div className="section">
      <div className="container">
        <h2 className="section-title">Schema Registry</h2>
        <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginBottom: 'var(--space-8)' }}>
          Browse all W3C credential schemas registered on the SchemaRegistry smart contract.
        </p>

        {schemas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--gray-500)' }}>
            <Blocks size={48} color="var(--gray-300)" />
            <p style={{ marginTop: 'var(--space-4)' }}>No schemas registered yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-6)' }}>
            {schemas.map((schema) => (
              <div key={schema.schema_id} className="card" style={{ padding: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Blocks size={20} color="var(--primary-600)" />
                    <h4 style={{ margin: 0, fontSize: 'var(--text-base)' }}>{schema.name || schema.schema_id}</h4>
                  </div>
                  {schema.is_active ? (
                    <span className="badge badge-active"><CheckCircle size={10} /> Active</span>
                  ) : (
                    <span className="badge badge-revoked"><XCircle size={10} /> Inactive</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                  <div><strong style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Schema ID</strong><br /><code>{schema.schema_id}</code></div>
                  <div><strong style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Version</strong><br />{schema.version || '—'}</div>
                  <div><strong style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Author</strong><br /><span className="mono" style={{ fontSize: 'var(--text-xs)' }}>{schema.author || '—'}</span></div>
                  <div><strong style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Schema Hash</strong><br /><span className="mono" style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>{schema.schema_hash || '—'}</span></div>
                  {schema.schema_uri && (
                    <div><strong style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Schema URI</strong><br /><a href={schema.schema_uri} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--text-xs)' }}>{schema.schema_uri}</a></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
