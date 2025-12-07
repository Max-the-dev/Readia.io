function Contact() {
  return (
    <div className="contact-page">
      <h1>Contact Us</h1>
      <p className="hero-subtitle">Have questions? We're here to help.</p>

      <div className="contact-grid">
        <div className="contact-card">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z"/>
          </svg>
          <h3>Twitter/X</h3>
          <p>Follow us for updates and support</p>
          <a href="https://x.com/Readia_io" target="_blank" rel="noreferrer">@Readia_io</a>
        </div>

        <div className="contact-card">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h3>Discord</h3>
          <p>Join our community</p>
          <a href="#">discord.gg/readia</a>
        </div>

        <div className="contact-card">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          <h3>Email</h3>
          <p>For business inquiries</p>
          <a href="mailto:hello@readia.io">hello@readia.io</a>
        </div>
      </div>
    </div>
  );
}

export default Contact;
