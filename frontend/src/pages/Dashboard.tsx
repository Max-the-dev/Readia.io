function Dashboard() {
  return (
    <div className="dashboard">
      <div className="container">
        <h1>Writer Dashboard</h1>
        
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Earnings</h3>
            <p className="stat-value">$0.00</p>
          </div>
          <div className="stat-card">
            <h3>Articles Published</h3>
            <p className="stat-value">0</p>
          </div>
          <div className="stat-card">
            <h3>Total Reads</h3>
            <p className="stat-value">0</p>
          </div>
        </div>

        <div className="articles-section">
          <h2>Your Articles</h2>
          <div className="articles-list">
            <p>No articles published yet. <a href="/write">Write your first article!</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;