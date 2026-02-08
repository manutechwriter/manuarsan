// Function to generate slug from title (lowercase, hyphenated)
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .trim();
}

// Function to generate blog URL from date and title
function generateBlogUrl(date, title) {
  if (!date) return '#';
  
  const dateParts = date.split('-');
  if (dateParts.length !== 3) return '#';
  
  const [year, month, day] = dateParts;
  const slug = generateSlug(title);
  
  return `blog/${year}/${month}/${day}/${slug}/`;
}

// Blog posts data - extracted from markdown files
// Update this when you add new posts
const BLOG_POSTS_DATA = [
  {
    filename: '1-hello-world',
    title: 'Hello World!',
    date: '2026-02-01',
    excerpt: "Hi, I'm Manuarsan and this is the first entry of this post.",
    draft: false
  },
  {
    filename: '2-career-compounding-interest-reflection',
    title: 'Career Compounding Interest Reflection',
    date: '2026-02-08',
    excerpt: 'This week I've been reflecting on what my future should look like based on my past experiences. A journey from fast food restaurants to technical writing and learning experience design.',
    draft: false
  }
];

// Generate URLs for all posts
BLOG_POSTS_DATA.forEach(post => {
  post.url = generateBlogUrl(post.date, post.title);
});

// Function to find actual blog URLs from navigation
function findBlogUrlsFromNavigation() {
  const urlMap = {};
  
  // Try to find links in navigation that match blog post pattern
  const navLinks = document.querySelectorAll('nav a[href*="/blog/"]');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    const text = link.textContent.trim();
    
    // Match pattern like /blog/2026/02/01/hello-world/
    const match = href.match(/\/blog\/(\d{4})\/(\d{2})\/(\d{2})\/([^\/]+)\//);
    if (match) {
      // Try to match by title
      BLOG_POSTS_DATA.forEach(post => {
        if (text.toLowerCase().includes(post.title.toLowerCase().substring(0, 10)) ||
            post.title.toLowerCase().includes(text.toLowerCase().substring(0, 10))) {
          urlMap[post.filename] = href.replace(/^\//, ''); // Remove leading slash for relative URL
        }
      });
    }
  });
  
  return urlMap;
}

// Function to display the latest blog posts
function displayLatestBlogPosts() {
  // Find the container where posts should be displayed
  const container = document.getElementById('latest-blog-posts');
  
  if (!container) {
    return;
  }
  
  try {
    // Try to get actual URLs from navigation
    const navUrls = findBlogUrlsFromNavigation();
    
    // Update post URLs if found in navigation
    BLOG_POSTS_DATA.forEach(post => {
      if (navUrls[post.filename]) {
        post.url = navUrls[post.filename];
      }
    });
    
    // Filter out draft posts
    const publishedPosts = BLOG_POSTS_DATA.filter(post => !post.draft);
    
    // Sort posts by date (newest first), then by filename if dates are equal
    const sortedPosts = [...publishedPosts].sort((a, b) => {
      if (a.date && b.date) {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
      }
      // If dates are equal or missing, sort by filename (reverse for newest first)
      return b.filename.localeCompare(a.filename);
    });
    
    // Get the 3 latest posts
    const latestPosts = sortedPosts.slice(0, 3);
    
    // Clear container
    container.innerHTML = '';
    
    // Display posts
    if (latestPosts.length === 0) {
      container.innerHTML = '<p>No blog posts found.</p>';
      return;
    }
    
    const postsList = document.createElement('div');
    postsList.className = 'blog-posts-list';
    
    latestPosts.forEach(post => {
      const postElement = document.createElement('div');
      postElement.className = 'blog-post-item';
      postElement.style.marginBottom = '2rem';
      postElement.style.paddingBottom = '1.5rem';
      postElement.style.borderBottom = '1px solid #e0e0e0';
      
      // Remove border from last item
      if (post === latestPosts[latestPosts.length - 1]) {
        postElement.style.borderBottom = 'none';
        postElement.style.marginBottom = '0';
      }
      
      const date = post.date ? new Date(post.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : '';
      
      postElement.innerHTML = `
        <h3 style="margin-top: 0; margin-bottom: 0.5rem;">
          <a href="${post.url}" style="text-decoration: none; color: inherit; font-weight: 600;">
            ${post.title}
          </a>
        </h3>
        ${date ? `<p class="blog-post-date" style="color: #666; font-size: 0.9em; margin: 0.5rem 0;">${date}</p>` : ''}
        ${post.excerpt ? `<p class="blog-post-excerpt" style="margin: 0.5rem 0 0 0; color: #555; line-height: 1.6;">${post.excerpt}</p>` : ''}
      `;
      
      postsList.appendChild(postElement);
    });
    
    container.appendChild(postsList);
  } catch (error) {
    console.error('Error displaying blog posts:', error);
    container.innerHTML = `<p>Error loading blog posts: ${error.message}</p>`;
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', displayLatestBlogPosts);
} else {
  displayLatestBlogPosts();
}
