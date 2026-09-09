/* ═══════════════════════════════════════════════════════════════════════════
   NotFoundPage — 404
   ═══════════════════════════════════════════════════════════════════════════ */

import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="section" style={{ textAlign: 'center', padding: 'var(--space-20) 0' }}>
      <div className="container" style={{ maxWidth: 500 }}>
        <AlertTriangle size={64} color="var(--warning)" />
        <h1 style={{ fontSize: 'var(--text-5xl)', color: 'var(--primary-700)', margin: 'var(--space-4) 0' }}>404</h1>
        <h2 style={{ color: 'var(--gray-700)', marginBottom: 'var(--space-4)' }}>Page Not Found</h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-8)' }}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary btn-lg">
          <Home size={18} /> Back to Home
        </Link>
      </div>
    </div>
  );
}
