import { useState, FormEvent } from 'react';

function Write() {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [price, setPrice] = useState<string>('0.05');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Article submitted:', { title, content, price });
  };

  return (
    <div className="write">
      <div className="container">
        <h1>Write New Article</h1>
        <form onSubmit={handleSubmit} className="write-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="price">Price (USD)</label>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0.01"
              max="1.00"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Content (Markdown supported)</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article here..."
              rows="20"
              required
            />
          </div>

          <button type="submit" className="publish-btn">
            Publish Article
          </button>
        </form>
      </div>
    </div>
  );
}

export default Write;