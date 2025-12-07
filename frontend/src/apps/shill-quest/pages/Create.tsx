function Create() {
  return (
    <div className="write-page">
      <div className="container">
        <div className="write-header">
          <h1>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create a Quest
          </h1>
          <p>Launch a promotional campaign and pay only for approved content</p>
        </div>

        <div className="write-form">
          <div className="form-group">
            <label>Quest Title</label>
            <input type="text" placeholder="e.g., Promote $READ Token Launch" className="form-input" />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea rows={4} placeholder="Describe what creators should post about..." className="form-textarea"></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Content Type</label>
              <select className="form-select">
                <option>Twitter/X Thread</option>
                <option>Single Tweet</option>
                <option>Video</option>
                <option>Article</option>
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="form-select">
                <option>Token Launch</option>
                <option>DeFi</option>
                <option>NFT</option>
                <option>Gaming</option>
                <option>Infrastructure</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Required Keywords</label>
            <input type="text" placeholder="$READ, Readia, micropayments" className="form-input" />
            <span className="form-hint">Comma-separated keywords that must appear in content</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Payout per Post</label>
              <div className="price-input-container">
                <span className="price-prefix">$</span>
                <input type="number" placeholder="5.00" step="0.01" min="0.01" max="100" className="form-input price-input" />
              </div>
            </div>
            <div className="form-group">
              <label>Total Budget</label>
              <div className="price-input-container">
                <span className="price-prefix">$</span>
                <input type="number" placeholder="500.00" step="1" min="10" className="form-input price-input" />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Engagement Bonus (Optional)</label>
            <div className="bonus-row">
              <div className="price-input-container">
                <span className="price-prefix">+$</span>
                <input type="number" placeholder="25" className="form-input price-input" />
              </div>
              <span>if post reaches</span>
              <input type="number" placeholder="1000" className="form-input small" />
              <select className="form-select small">
                <option>likes</option>
                <option>retweets</option>
                <option>views</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" className="form-input" />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label>Review Mode</label>
            <div className="radio-group">
              <label className="radio-option">
                <input type="radio" name="review" defaultChecked />
                <div>
                  <span>Auto-approve</span>
                  <small>Automatically approve submissions that pass all checks</small>
                </div>
              </label>
              <label className="radio-option">
                <input type="radio" name="review" />
                <div>
                  <span>Manual review</span>
                  <small>Review and approve each submission individually</small>
                </div>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button className="secondary-btn">Save Draft</button>
            <button className="publish-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              </svg>
              Fund & Launch Quest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Create;
