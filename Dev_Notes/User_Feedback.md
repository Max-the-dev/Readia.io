⏺ User Feedback Messages Across Application

  # Write Page (/write)

  ## Validation Errors (Top of form)
  - Trigger: Click "Publish Article" with invalid form
  - Shows: Error summary on top of page
  - Messages:
    - "Title is required"
    - "Content must be at least 50 characters"
    - "Content must be 25,000 characters or less"
    - "Price must be between $0.01 and $1.00"

  ## Submit Errors (Top of form)
  - Trigger: API/backend rejects article submission
  - Shows: Summary in yellow box - context dependent 
  - Messages:
    - Rate limiting: "Maximum 5 articles per hour allowed"
    - Spam: "Excessive repetition detected", "Duplicate content detected"
    - Validation: Field-specific errors from Zod
    - Network: "An unexpected error occurred"

  ## Success Message (Top of form)
  - Trigger: Article published successfully
  - Shows: Green box with icon + close button, "Article Published Successfully! 🎉"
  - Actions: "View in Dashboard", "Write Another Article" buttons
  - Disappears if "Write Another Article" is clicked OR on input


  ## Draft Save Feedback (Button state)
  - Trigger: Save draft button clicked
  - Shows: Button text changes to "Saved!" briefly
  - Inline: No modal/banner

  ## Auto-save Indicator (Subtle)
  - Trigger: Content changes (5-second debounce)
  - Shows: Silent background save, console logs only
  - No user feedback: Could be improved


  ---
  
  
  # Edit Page (/edit)
  
  ## Validation Errors (Top of form)
  - Trigger: Click "Update Article" with invalid form
  - Shows: Error summary on top of page
  - Messages:
    - "Title is required"
    - "Content must be at least 50 characters"
    - "Content must be 25,000 characters or less"
    - "Price must be between $0.01 and $1.00" 

  ## Submit Errors (Top of form)
  Trigger: API/backend rejects article update
  - Shows: Summary in yellow box - context dependent 
  - Messages:
    - Rate limiting: "Maximum 5 articles per hour allowed"
    - Validation: Field-specific errors from Zod
    - Network: "An unexpected error occurred"
  
  ## Success Message 
  - Trigger: Article updated successfully
  - Shows: Green box with icon + close button, "Article Published Successfully! 🎉"
  - Actions: "Back to Dashboard"
  - Disappears on input 


  # Dashboard Page (/dashboard)

  ## Connect Wallet Prompt (Center screen)
  - Trigger: User not connected
  - Shows: "Connect Your Wallet" heading + ConnectButton
  - Style: Centered prompt box

  ## Error Message (Top of articles section)
  - Trigger: API fetch fails
  - Shows: Red box with "❌ {error}", "Try Again" button
  - Messages: "Failed to fetch articles", "Failed ot fetch author", network errors

  ## Loading State (Articles table)
  - Trigger: Fetching articles
  - Shows: "Loading your articles..." text

  ## No Articles State (Articles table)
  - Trigger: No articles + filters/search active
  - Shows: Search icon, "No articles found", "Try adjusting..."
  - Action: "Clear search and filters" button if filters active

  ## Delete Confirmation Modal (Overlay)
  - Trigger: Click delete icon on article
  - Lock UI while modal is open
  - Shows: Modal with article title, "This action cannot be undone."
  - Buttons: "Cancel", "Delete Article" (turns to "Deleting...")

  ---
  
  # Explore Page (/explore)

  ## Loading State (Articles grid)
  - Trigger: Initial page load
  - Shows: "Loading articles..." text

  ## No Articles State (Articles grid)
  - Trigger: No articles match filters
  - Shows: Search icon, "No articles found", "Try adjusting..."
  - Action: "Clear search and filters" button if filters active

  ## Load More Indicator (Bottom)
  - Trigger: Scrolling triggers infinite scroll
  - Shows: "Loading more articles..." text

  ## End of Results (Bottom)
  - Trigger: All articles loaded
  - Shows: "You've reached the end!" text

  ---
  
  # Article Page (/article/:id)

  ## Connect Wallet Prompt (Paywall)
  - Trigger: Not connected, hit paywall
  - Shows: Lock icon, "Connect your wallet to continue", ConnectButton
  - Style: Overlay on content

  ## Payment Gate (Overlay)
  - Trigger: Article not purchased, not author
  - Shows: Lock icon, "Continue Reading", price, benefits list
  - Action: "Pay $X.XX" button (changes to "Processing..." during payment)

  ## Payment Success Toast (Top right)
  - Trigger: Payment successful
  - Shows: "✓ Payment successful!" toast
  - Duration: 3 seconds auto-dismiss

  ## Payment Error (Inline, paywall)
  - Trigger: Payment fails
  - Shows: Red text below pay button with error message
  - Messages: "Payment verification failed", wallet errors

  ## Tip Success (Modal)
  - Trigger: Tip sent successfully
  - Shows: "✨ Tip sent successfully! Thank you..."
  - Location: Inside tip modal

  ## Donate (Modal)

  ## ADDT. Payment VALIDATION DETAILS 
  - Payment success toast location: Toast exists, but CSS anchors it top-left (frontend/src/App.css:1691); the doc’s “top
    right” note is inaccurate. Adjust position or documentation as needed.
  - Payment errors & author banner: Inline error copy renders under the pay button (frontend/src/pages/Article.tsx:247), and
    the author notice banner matches (frontend/src/pages/Article.tsx:259). To test errors, have the payment service reject and
    ensure the message surfaces.
  - Tip modal feedback: The success message sits inside the modal (frontend/src/pages/Article.tsx:356). Trigger by stubbing
    handleTip to resolve and confirm the copy.




  ## Author Notice (Banner)
  - Trigger: Author viewing own article
  - Shows: "✍️ You're viewing your own article!"
  - Style: Subtle banner below header

  ## Loading State (Full page)
  - Trigger: Fetching article
  - Shows: "Loading article..." text

  ## Article Not Found (Full page)
  - Trigger: Invalid article ID or deleted
  - Shows: "Article not found" heading + error description

 

  ---
  
  # Backend API Responses (Status Codes)

 400 – Validation errors
  All Zod failures look like:

  {
    "success": false,
    "error": "Validation failed",
    "details": [
      { "field": "title", "message": "Title is required" },
      { "field": "categories.1", "message": "Invalid option" }
    ]
  }

  Route-level guards (e.g., price range, missing author) still return status 400 but swap in their own error, e.g.
  "Price must be between $0.01 and $1.00".

  429 – Rate limiting / spam prevention

  - Wallet rate limits:

    {
      "success": false,
      "error": "Rate limit exceeded",
      "message": "Maximum 5 articles per hour allowed"
    }
    (Daily throttle uses "Daily limit exceeded" with "Maximum 20 articles per day allowed".)

  - Spam quality checks:

    {
      "success": false,
      "error": "Spam Detected",
      "message": "Content contains too many similar phrases"
    }

    Other reasons come through the same shape: "Content must contain at least 30 unique words", "Content appears to
    contain gibberish...", "Please wait a minute between article submissions" (rapid), "Duplicate content detected".

  403 – Unauthorized
  When a caller edits/deletes someone else’s article:

  {
    "success": false,
    "error": "Unauthorized: You can only delete your own articles"
  }

  (Same string for update: “Unauthorized: You can only edit your own articles”.)

  404 – Not found

  {
    "success": false,
    "error": "Article not found"
  }

  500 – Server errors
  We return route-specific copy:

  - Create: "error": "Failed to create article"
  - Update: "error": "Failed to update article"
  - Delete: "error": "Failed to delete article"
  - Fetch author/article: "Failed to fetch author" / "Failed to fetch article"

  ---



