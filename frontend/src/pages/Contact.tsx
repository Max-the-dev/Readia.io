import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle, ChevronDown } from 'lucide-react';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const subjectOptions = [
    { value: '', label: 'Select a topic' },
    { value: 'feedback', label: 'General Feedback' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'support', label: 'Technical Support' },
    { value: 'partnership', label: 'Partnership Inquiry' },
    { value: 'other', label: 'Other' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just show success message
    // In production, this would send to a backend service
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  return (
    <div className="contact-page">
      <div className="container">
        {/* Hero Section */}
        <div className="contact-hero">
          <h1>Contact Us</h1>
          <p className="hero-subtitle">
            We'd love to hear from you. Send us feedback, questions, or suggestions.
          </p>
        </div>

        {/* Contact Form */}
        <div className="contact-form-section">
            <div className="form-header">
              <div className="form-icon">
                <MessageSquare size={32} />
              </div>
              <h2>Send us a message</h2>
            </div>

            {isSubmitted ? (
              <div className="success-message">
                <CheckCircle size={48} />
                <h3>Message Sent!</h3>
                <p>Thank you for your feedback. We'll get back to you soon.</p>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <div className="custom-select-wrapper" ref={dropdownRef}>
                    <button
                      type="button"
                      className={`custom-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <span className={formData.subject ? 'has-value' : 'placeholder'}>
                        {subjectOptions.find(opt => opt.value === formData.subject)?.label || 'Select a topic'}
                      </span>
                      <ChevronDown size={18} className={`select-chevron ${isDropdownOpen ? 'rotated' : ''}`} />
                    </button>
                    {isDropdownOpen && (
                      <div className="custom-select-dropdown">
                        {subjectOptions.filter(opt => opt.value !== '').map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`custom-select-option ${formData.subject === option.value ? 'selected' : ''}`}
                            onClick={() => {
                              setFormData({ ...formData, subject: option.value });
                              setIsDropdownOpen(false);
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <input type="hidden" name="subject" value={formData.subject} required />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    placeholder="Tell us what's on your mind..."
                    rows={6}
                  />
                </div>

                <button type="submit" className="submit-button">
                  <Send size={20} />
                  Send Message
                </button>
              </form>
            )}
        </div>
      </div>
    </div>
  );
}

export default Contact;