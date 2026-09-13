/* ==========================================================================
   المنصة الشخصية والمجتمعية - البرمجة التفاعلية (Vanilla JS & REST API Client)
   ========================================================================== */

let globalGalleryData = [];

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadSiteSettings();
    loadStats();
    loadNews();
    loadInitiatives();
    loadArticles();
    loadAchievements();
    loadGallery();
});

/* 1. SPA Router & Navigation */
function initNavigation() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Listen to hash change for back/forward support
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('nav-dropdown-more');
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
}

function toggleMoreDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('nav-dropdown-more');
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
}

function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        switchPage(hash);
    }
}

function switchPage(pageId) {
    const sections = document.querySelectorAll('.page-section');
    const navLinks = document.querySelectorAll('.nav-link');
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const moreBtn = document.getElementById('dropdown-more-btn');
    const brandHomeBtn = document.getElementById('brand-home-btn');

    sections.forEach(sec => sec.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));
    dropdownItems.forEach(item => item.classList.remove('active'));
    if (moreBtn) moreBtn.classList.remove('active');
    if (brandHomeBtn) {
        if (pageId === 'home') brandHomeBtn.classList.add('active');
        else brandHomeBtn.classList.remove('active');
    }

    const targetSection = document.getElementById(`section-${pageId}`);
    if (targetSection) {
        targetSection.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        document.getElementById('section-home').classList.add('active');
    }

    // Update active nav item & highlight dropdown button if active item is hidden from main bar
    let isItemHiddenInMainBar = false;

    navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${pageId}`) {
            link.classList.add('active');
            const parentLi = link.parentElement;
            if (parentLi && getComputedStyle(parentLi).display === 'none') {
                isItemHiddenInMainBar = true;
            }
        }
    });

    dropdownItems.forEach(item => {
        if (item.getAttribute('href') === `#${pageId}`) {
            item.classList.add('active');
        }
    });

    if (isItemHiddenInMainBar && moreBtn) {
        moreBtn.classList.add('active');
    }

    // Close mobile menu & dropdown if open
    const navMenu = document.getElementById('nav-menu');
    const dropdown = document.getElementById('nav-dropdown-more');
    if (navMenu) navMenu.classList.remove('active');
    if (dropdown) dropdown.classList.remove('open');
}

/* 2. API Fetchers */

// Fetch Settings
async function loadSiteSettings() {
    try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data) {
            const data = json.data;
            if (data.person_name) {
                const headerName = document.getElementById('header-person-name');
                if (headerName) headerName.textContent = data.person_name;
                const heroName = document.getElementById('hero-name');
                if (heroName) heroName.textContent = data.person_name;
                const aboutName = document.getElementById('about-page-name');
                if (aboutName) aboutName.textContent = data.person_name;
                const footerName = document.getElementById('footer-person-name');
                if (footerName) footerName.textContent = data.person_name;
                document.title = `${data.person_name} | ${data.person_title || 'منصة شخصية ومجتمعية'}`;
            }
            if (data.person_title) {
                const headerTitle = document.getElementById('header-person-title');
                if (headerTitle) headerTitle.textContent = data.person_title;
                const heroTitleSub = document.getElementById('hero-title-sub');
                if (heroTitleSub) heroTitleSub.textContent = data.person_title;
                const footerTitle = document.getElementById('footer-person-title');
                if (footerTitle) footerTitle.textContent = data.person_title;
            }
            if (data.person_bio) {
                document.getElementById('hero-bio').textContent = data.person_bio;
            }
            if (data.work_principle) {
                const aboutWorkPrinciple = document.getElementById('about-work-principle');
                if (aboutWorkPrinciple) aboutWorkPrinciple.textContent = `"${data.work_principle}"`;
            }
            if (data.contact_phone) {
                document.getElementById('contact-info-phone').textContent = data.contact_phone;
                document.getElementById('footer-phone').textContent = data.contact_phone;
            }
            if (data.contact_email) {
                document.getElementById('contact-info-email').textContent = data.contact_email;
                document.getElementById('footer-email').textContent = data.contact_email;
            }
            if (data.contact_hours) {
                document.getElementById('contact-info-hours').textContent = data.contact_hours;
            }
            if (data.person_image) {
                const heroImg = document.getElementById('hero-avatar-img');
                if (heroImg) heroImg.src = data.person_image;
                const aboutImg = document.getElementById('about-avatar-img');
                if (aboutImg) aboutImg.src = data.person_image;
            }
        }
    } catch (err) {
        console.error('فشل في جلب الإعدادات:', err);
    }
}

// Fetch Stats (بالأرقام)
async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const json = await res.json();
        if (json.success && json.data) {
            const container = document.getElementById('stats-bar-container');
            container.innerHTML = json.data.map(st => `
                <div class="stat-item">
                    <div class="stat-number"><i class="fa-solid ${st.icon || 'fa-chart-pie'}"></i> ${st.value_number}</div>
                    <div class="stat-label">${st.label}</div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('فشل في جلب الإحصائيات:', err);
    }
}

// Fetch News
async function loadNews() {
    try {
        const res = await fetch('/api/news');
        const json = await res.json();
        if (json.success && json.data) {
            const items = json.data;
            const homeContainer = document.getElementById('home-news-container');
            const pageContainer = document.getElementById('news-page-container');

            const html = items.map(n => `
                <div class="news-card">
                    <img src="${n.image_url}" alt="${n.title}" class="news-image">
                    <div class="news-body">
                        <div class="news-meta">
                            <span class="news-badge">${n.category}</span>
                            <span><i class="fa-solid fa-calendar"></i> ${n.date}</span>
                        </div>
                        <h3 class="news-title">${n.title}</h3>
                        <p class="news-snippet">${n.snippet}</p>
                        <a href="javascript:void(0)" class="read-more-link" onclick="openNewsModal(${n.id})">
                            اقرأ المزيد ←
                        </a>
                    </div>
                </div>
            `).join('');

            if (homeContainer) homeContainer.innerHTML = html;
            if (pageContainer) pageContainer.innerHTML = html;

            // Save in window object for modal lookup
            window.newsCache = items;
        }
    } catch (err) {
        console.error('فشل في جلب الأخبار:', err);
    }
}

// Fetch Initiatives
async function loadInitiatives() {
    try {
        const res = await fetch('/api/initiatives');
        const json = await res.json();
        if (json.success && json.data) {
            const container = document.getElementById('initiatives-list-container');
            container.innerHTML = json.data.map(init => `
                <div class="news-card">
                    <img src="${init.image_url}" alt="${init.title}" class="news-image">
                    <div class="news-body">
                        <div class="news-meta">
                            <span class="news-badge">${init.category}</span>
                            <span class="initiative-status"><i class="fa-solid fa-circle-check"></i> ${init.status}</span>
                        </div>
                        <h3 class="news-title">${init.title}</h3>
                        <p class="news-snippet">${init.description}</p>
                        <div class="initiative-date">تاريخ الإطلاق: ${init.date}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('فشل في جلب المبادرات:', err);
    }
}

// Fetch Articles
async function loadArticles() {
    try {
        const res = await fetch('/api/articles');
        const json = await res.json();
        if (json.success && json.data) {
            const container = document.getElementById('articles-list-container');
            container.innerHTML = json.data.map(art => `
                <div class="domain-card">
                    <div class="news-meta article-meta">
                        <span class="news-badge">${art.category}</span>
                        <span><i class="fa-solid fa-clock"></i> ${art.read_time}</span>
                    </div>
                    <h3 class="domain-title">${art.title}</h3>
                    <p class="article-author">بقلم: ${art.author}</p>
                    <p class="domain-desc article-snippet">${art.snippet}</p>
                    <a href="javascript:void(0)" class="btn btn-outline article-read-btn" onclick="openArticleModal(${art.id})">
                        اقرأ المقال كاملًا ←
                    </a>
                </div>
            `).join('');

            window.articlesCache = json.data;
        }
    } catch (err) {
        console.error('فشل في جلب المقالات:', err);
    }
}

// Fetch Achievements
async function loadAchievements() {
    try {
        const res = await fetch('/api/achievements');
        const json = await res.json();
        if (json.success && json.data) {
            const container = document.getElementById('achievements-list-container');
            container.innerHTML = json.data.map(ach => `
                <div class="domain-card">
                    <div class="achievement-header">
                        <span class="news-badge">${ach.category}</span>
                        <span class="achievement-year">${ach.year}</span>
                    </div>
                    <h3 class="domain-title">${ach.title}</h3>
                    <p class="domain-desc">${ach.description}</p>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('فشل في جلب الإنجازات:', err);
    }
}

// Fetch Photo Gallery
async function loadGallery() {
    try {
        const res = await fetch('/api/gallery');
        const json = await res.json();
        if (json.success && json.data) {
            globalGalleryData = json.data;
            renderGallery(globalGalleryData);
        }
    } catch (err) {
        console.error('فشل في جلب الصور:', err);
    }
}

function renderGallery(items) {
    const container = document.getElementById('gallery-items-container');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `<p class="gallery-empty">لا توجد صور في هذا التصنيف حالياً.</p>`;
        return;
    }

    container.innerHTML = items.map(g => `
        <div class="gallery-item">
            <img src="${g.image_url}" alt="${g.title}">
            <div class="gallery-overlay">
                <span class="gallery-item-category">${g.category} — ${g.date || ''}</span>
                <h4 class="gallery-item-title">${g.title}</h4>
            </div>
        </div>
    `).join('');
}

function filterGallery(category) {
    const filterBtns = document.querySelectorAll('#gallery-category-filters .filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (category === 'الكل') {
        renderGallery(globalGalleryData);
    } else {
        const filtered = globalGalleryData.filter(g => g.category === category);
        renderGallery(filtered);
    }
}

/* 3. Modal Handler */
function openNewsModal(newsId) {
    if (!window.newsCache) return;
    const news = window.newsCache.find(n => n.id === newsId);
    if (!news) return;

    const modalBody = document.getElementById('modal-body-container');
    modalBody.innerHTML = `
        <span class="news-badge">${news.category}</span>
        <h2 class="modal-title">${news.title}</h2>
        <p class="modal-date"><i class="fa-solid fa-calendar"></i> ${news.date}</p>
        <img src="${news.image_url}" alt="${news.title}" class="modal-image">
        <div class="modal-body-text">
            ${news.content}
        </div>
    `;
    document.getElementById('content-modal').classList.add('active');
}

function openArticleModal(articleId) {
    if (!window.articlesCache) return;
    const art = window.articlesCache.find(a => a.id === articleId);
    if (!art) return;

    const modalBody = document.getElementById('modal-body-container');
    modalBody.innerHTML = `
        <span class="news-badge">${art.category}</span>
        <h2 class="modal-title">${art.title}</h2>
        <p class="modal-article-author">
            بقلم: ${art.author} — <i class="fa-solid fa-clock"></i> زمن القراءة: ${art.read_time}
        </p>
        <div class="modal-article-content">
            ${art.content}
        </div>
    `;
    document.getElementById('content-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('content-modal').classList.remove('active');
}

/* 4. Contact Form Handler */
async function handleContactSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const phone = document.getElementById('contact-phone').value;
    const subject = document.getElementById('contact-subject').value;
    const details = document.getElementById('contact-details').value;
    const alertBox = document.getElementById('contact-form-alert');

    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, subject, details })
        });
        const json = await res.json();
        if (json.success) {
            alertBox.innerHTML = `
                <div class="alert-success">
                    <i class="fa-solid fa-circle-check"></i> ${json.message}
                </div>
            `;
            document.getElementById('contact-form').reset();
        } else {
            alertBox.innerHTML = `
                <div class="alert-error">
                    <i class="fa-solid fa-circle-xmark"></i> خطأ: ${json.error}
                </div>
            `;
        }
    } catch (err) {
        alertBox.innerHTML = `
            <div class="alert-error">
                <i class="fa-solid fa-circle-xmark"></i> يتعذر الاتصال بالخادم، يرجى المحاولة لاحقاً.
            </div>
        `;
    }
}
