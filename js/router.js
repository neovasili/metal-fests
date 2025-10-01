// Client-side router for S3+CloudFront deployment
class ClientRouter {
    constructor() {
        this.routes = {
            '/': 'index.html',
            '/timeline': 'index.html', 
            '/map': 'map.html',
            '/error': 'error.html'
        };
        this.init();
    }

    init() {
        // Handle initial page load - check if we need to redirect
        this.handleInitialRoute();
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.cleanUrl) {
                // Update navigation for the clean URL
                this.updateActiveNav(e.state.cleanUrl);
                // Load the page if needed
                if (e.state.page) {
                    this.loadPage(e.state.page);
                }
            } else {
                // Fallback - update nav based on current path
                this.handleInitialRoute();
            }
        });
        
        // Intercept navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && this.isInternalLink(link)) {
                e.preventDefault();
                const href = link.getAttribute('href');
                this.navigate(href);
            }
        });
    }

    isInternalLink(link) {
        const href = link.getAttribute('href');
        return href && 
               href.startsWith('/') && 
               !href.startsWith('//') && 
               !link.hasAttribute('target') &&
               link.classList.contains('view-link');
    }

    handleInitialRoute() {
        const currentPath = window.location.pathname;
        const targetPage = this.routes[currentPath];
        
        // Determine the current page for navigation highlighting
        let pageForNav = currentPath;
        let shouldReplaceUrl = false;
        
        // If we're on an HTML file, map it back to clean URL for navigation
        if (currentPath.endsWith('.html')) {
            shouldReplaceUrl = true;
            if (currentPath.includes('index.html')) {
                pageForNav = '/';
            } else if (currentPath.includes('map.html')) {
                pageForNav = '/map';
            } else if (currentPath.includes('error.html')) {
                pageForNav = '/error';
            }
            
            // Replace the URL with clean version without reloading the page
            window.history.replaceState({ 
                page: currentPath.split('/').pop(), 
                cleanUrl: pageForNav 
            }, '', pageForNav);
            
            console.log(`🔄 Clean URL: ${currentPath} → ${pageForNav}`);
        }
        
        // Update active navigation
        this.updateActiveNav(pageForNav);
        
        // If we're on a clean URL but not the right HTML file, redirect
        if (targetPage && !currentPath.endsWith('.html') && !shouldReplaceUrl) {
            const currentFile = window.location.pathname.split('/').pop() || 'index.html';
            if (currentFile !== targetPage) {
                // For S3 deployment, we need to navigate to the actual HTML file
                // but maintain the clean URL in the browser
                window.history.replaceState({ page: targetPage, cleanUrl: currentPath }, '', currentPath);
                this.loadPage(targetPage);
            }
        }
    }

    navigate(cleanUrl) {
        const targetPage = this.routes[cleanUrl];
        if (targetPage) {
            // Update browser URL to clean URL
            window.history.pushState({ page: targetPage, cleanUrl: cleanUrl }, '', cleanUrl);
            
            // Load the actual HTML page
            this.loadPage(targetPage);
            
            // Update navigation state
            this.updateActiveNav(cleanUrl);
        }
    }

    loadPage(htmlFile) {
        // Navigate to the HTML file
        // The router will automatically clean up the URL when the new page loads
        window.location.href = htmlFile;
    }

    updateActiveNav(currentPath) {
        const navLinks = document.querySelectorAll('.view-link');
        console.log('🔍 Updating navigation for path:', currentPath);
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.remove('active');
            
            // Set active state based on current path
            if ((currentPath === '/' || currentPath === '/timeline') && href === '/') {
                link.classList.add('active');
                console.log('✅ Timeline link activated');
            } else if (currentPath === '/map' && href === '/map') {
                link.classList.add('active');
                console.log('✅ Map link activated');
            }
        });
    }
}

// Initialize router when DOM is loaded
function initializeRouter() {
    // Small delay to ensure navigation elements are rendered
    setTimeout(() => {
        new ClientRouter();
    }, 100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRouter);
} else {
    initializeRouter();
}