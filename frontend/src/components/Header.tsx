import { Link } from 'react-router-dom';
import { LayoutDashboard, PenTool, BookOpen } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

function Header() {
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <h1>Penny.io</h1>
        </Link>
        <nav className="nav">
          <Link to="/explore" className="nav-link"><BookOpen size={16}/>Explore</Link>
          <Link to="/write" className="nav-link"><PenTool size={16}/>Write</Link>
          <Link to="/dashboard" className="nav-link"><LayoutDashboard size={16}/>Dashboard</Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}

export default Header;