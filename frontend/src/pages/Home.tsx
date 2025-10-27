function Home() {
  return (
    <div className="home">
      <div className="hero">
        <h1>Micropayments for Quality Content</h1>
        <p>Pay only for what you read. No subscriptions, no ads.</p>
      </div>
      <div className="featured-articles">
        <h2>Featured Articles</h2>
        <div className="article-grid">
          <div className="article-card">
            <h3>Sample Article Title</h3>
            <p>This is a preview of an amazing article...</p>
            <div className="article-meta">
              <span className="price">$0.05</span>
              <span className="author">by @author</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;