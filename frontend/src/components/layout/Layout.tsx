/* ═══════════════════════════════════════════════════════════════════════════
   Layout — Page shell wrapping TopBar + Header + Navbar + Content + Footer
   ═══════════════════════════════════════════════════════════════════════════ */

import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Header from './Header';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="app-layout">
      <TopBar />
      <Header />
      <Navbar />
      <main id="main-content" className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
