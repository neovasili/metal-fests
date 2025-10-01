// Main application code
class FestivalTimeline {
    constructor() {
        this.festivals = [];
        this.timelineContent = document.getElementById('timeline-content');
        this.loading = document.getElementById('loading');
        this.favoritesManager = new FavoritesManager();
        this.init();
    }

    async init() {
        this.showLoading(true);
        try {
            await this.loadFestivals();
            this.sortFestivalsByDate();
            this.renderTimeline();
        } catch (error) {
            console.error('Error initializing timeline:', error);
            this.showError('Failed to load festival data. Please try again later.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadFestivals() {
        try {
            const response = await fetch('db.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.festivals = data.festivals;
        } catch (error) {
            console.error('Error loading festivals:', error);
            throw error;
        }
    }

    sortFestivalsByDate() {
        this.festivals.sort((a, b) => {
            const dateA = new Date(a.dates.start);
            const dateB = new Date(b.dates.start);
            return dateA - dateB;
        });
    }

    renderTimeline() {
        this.timelineContent.innerHTML = '';
        let currentMonth = '';
        
        this.festivals.forEach((festival, index) => {
            const festivalDate = new Date(festival.dates.start);
            const monthYear = festivalDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            });

            // Add month marker if this is a new month
            if (monthYear !== currentMonth) {
                currentMonth = monthYear;
                this.addMonthMarker(monthYear);
            }

            // Create festival card
            this.createFestivalCard(festival, index);
        });
    }

    addMonthMarker(monthYear) {
        const monthMarker = document.createElement('div');
        monthMarker.className = 'month-marker';
        monthMarker.innerHTML = `<h3>${monthYear}</h3>`;
        this.timelineContent.appendChild(monthMarker);
    }

    createFestivalCard(festival, index) {
        const card = document.createElement('div');
        card.className = `festival-card ${index % 2 === 0 ? 'left' : 'right'}`;
        
        const startDate = new Date(festival.dates.start);
        const endDate = new Date(festival.dates.end);
        const formattedDates = this.formatDateRange(startDate, endDate);
        
        // Check if festival is favorited
        const isFavorite = this.favoritesManager.isFavorite(festival.name);
        
        card.innerHTML = `
            <div class="festival-header">
                <img src="${festival.poster}" alt="${festival.name} Poster" class="festival-poster" 
                     onerror="this.src='img/placeholder.jpg'">
                <div class="favorite-container"></div>
            </div>
            <h2 class="festival-name">${festival.name}</h2>
            <div class="festival-dates">${formattedDates}</div>
            <div class="festival-location">${festival.location}</div>
            <div class="festival-bands">
                <h4>Featured Bands:</h4>
                <div class="bands-list">
                    ${festival.bands.map(band => `<span class="band-tag">${band}</span>`).join('')}
                </div>
            </div>
            <div class="festival-info">
                <div class="ticket-price">From €${festival.ticketPrice}</div>
                <a href="${festival.website}" target="_blank" rel="noopener noreferrer" class="festival-website">
                    Visit Website
                </a>
            </div>
        `;
        
        // Add star icon and functionality
        this.addFavoriteFeature(card, festival);
        
        this.timelineContent.appendChild(card);
    }

    addFavoriteFeature(card, festival) {
        const favoriteContainer = card.querySelector('.favorite-container');
        const isFavorite = this.favoritesManager.isFavorite(festival.name);
        
        // Create star icon
        const starIcon = UIUtils.createStarIcon(isFavorite);
        
        // Add event listeners
        UIUtils.addStarEventListeners(starIcon, () => {
            const newStatus = this.favoritesManager.toggleFavorite(festival.name);
            UIUtils.updateStarIcon(starIcon, newStatus);
            
            // Show notification
            const message = newStatus 
                ? `${festival.name} added to favorites` 
                : `${festival.name} removed from favorites`;
            UIUtils.showNotification(message, 'success');
        });
        
        favoriteContainer.appendChild(starIcon);
    }

    formatDateRange(startDate, endDate) {
        const options = { month: 'short', day: 'numeric' };
        
        if (startDate.getTime() === endDate.getTime()) {
            return startDate.toLocaleDateString('en-US', options);
        } else if (startDate.getMonth() === endDate.getMonth()) {
            return `${startDate.toLocaleDateString('en-US', { day: 'numeric' })}-${endDate.toLocaleDateString('en-US', options)}`;
        } else {
            return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
        }
    }

    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        this.timelineContent.innerHTML = `
            <div style="text-align: center; padding: 4rem; color: #ff4444;">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FestivalTimeline();
});

// Add smooth scrolling for better user experience
document.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelector('.timeline-line');
    if (parallax) {
        const speed = scrolled * 0.1;
        parallax.style.boxShadow = `0 0 ${10 + speed}px rgba(255, 107, 0, ${0.5 + speed * 0.001})`;
    }
});

// Add click event listeners for festival cards to enhance interactivity
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('festival-card') || e.target.closest('.festival-card')) {
        const card = e.target.closest('.festival-card') || e.target;
        card.style.transform = card.style.transform === 'translateY(-10px) scale(1.02)' 
            ? 'translateY(-5px)' 
            : 'translateY(-10px) scale(1.02)';
        
        setTimeout(() => {
            if (card.style.transform.includes('scale')) {
                card.style.transform = 'translateY(-5px)';
            }
        }, 200);
    }
});