import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <h1>Penny.io</h1>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/write" className="nav-link">Write</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <button className="connect-wallet-btn">Connect Wallet</button>
        </nav>
      </div>
    </header>
  );
}

export default Header;