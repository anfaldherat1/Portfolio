/* ==========================================================================
   لوحة التحكم الشاملة - برمجة العميل والربط مع قاعدة البيانات SQL (Admin JS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    loadAdminSettings();
    loadAdminStats();
    loadAdminNews();
    loadAdminInitiatives();
    loadAdminArticles();
    loadAdminGallery();
    loadAdminAchievements();
    loadAdminMessages();
});

/* 1. Tab Switcher */
function switchAdminTab(tabId) {
    const navItems = document.querySelectorAll('.admin-nav-item');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    navItems.forEach(item => item.classList.remove('active'));
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    event.currentTarget.classList.add('active');
    const target = document.getElementById(`admin-tab-${tabId}`);
    if (target) {
        target.classList.add('active');
    }

    const titles = {
        'settings': 'الإعدادات العامة للمنصة',
        'stats': 'إدارة الأرقام والإحصائيات ("بالأرقام")',
        'news': 'إدارة الأخبار والفعاليات واللقاءات',
        'initiatives': 'إدارة المبادرات والمشاريع والتطوير',
        'articles': 'إدارة المقالات والرؤى التنموية',
        'gallery': 'إدارة معرض الصور والتغطيات البصرية',
        'achievements': 'إدارة سجل الإنجازات والشفافية',
        'messages': 'إدارة رسائل وملاحظات ومقترحات المواطنين',
        'sql': 'مستكشف وأداة تنفيذ استعلامات SQL المباشرة'
    };
    document.getElementById('admin-tab-title').textContent = titles[tabId] || 'لوحة التحكم';
}

function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('admin-alert');
    const alertClass = type === 'success' ? 'admin-alert-success' : 'admin-alert-danger';
    alertBox.innerHTML = `
        <div class="${alertClass}">
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}
        </div>
    `;
    setTimeout(() => { alertBox.innerHTML = ''; }, 4000);
}

/* 2. Settings Management */
async function loadAdminSettings() {
    try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data) {
            const data = json.data;
            for (const key in data) {
                const el = document.getElementById(`setting-${key}`);
                if (el) el.value = data[key];
            }
            if (data.person_image) {
                updatePersonImagePreview(data.person_image);
            }
        }
    } catch (err) {
        console.error('خطأ في تحميل إعدادات الأدمن:', err);
    }
}

function updatePersonImagePreview(url) {
    const preview = document.getElementById('person-image-preview');
    if (preview && url && url.trim() !== '') {
        preview.src = url.trim();
    }
}

async function handlePersonImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showAlert('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Image = e.target.result;
        try {
            showAlert('جاري رفع الصورة...', 'success');
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image })
            });
            const json = await res.json();
            if (json.success && json.url) {
                const imgInput = document.getElementById('setting-person_image');
                if (imgInput) imgInput.value = json.url;
                updatePersonImagePreview(json.url);
                showAlert('تم رفع الصورة بنجاح! لا تنسَ الضغط على "حفظ كافة الإعدادات" لتثبيتها.');
            } else {
                showAlert(json.error || 'فشل في رفع الصورة', 'error');
            }
        } catch (err) {
            showAlert('حدث خطأ غير متوقع أثناء رفع الصورة', 'error');
        }
    };
    reader.readAsDataURL(file);
}

async function saveSettingsForm(event) {
    event.preventDefault();
    const keys = ['person_name', 'person_title', 'person_bio', 'work_principle', 'contact_phone', 'contact_email', 'contact_hours', 'person_image'];
    try {
        for (const key of keys) {
            const el = document.getElementById(`setting-${key}`);
            const val = el ? el.value : '';
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value: val })
            });
        }
        showAlert('تم حفظ جميع الإعدادات بما فيها صورة الشخصية في قاعدة بيانات SQL بنجاح!');
    } catch (err) {
        showAlert('حدث خطأ أثناء حفظ الإعدادات', 'error');
    }
}

/* 3. Stats Management */
async function loadAdminStats() {
    try {
        const res = await fetch('/api/stats');
        const json = await res.json();
        if (json.success && json.data) {
            const container = document.getElementById('admin-stats-list');
            container.innerHTML = json.data.map(st => `
                <div class="stat-grid-row">
                    <input type="text" value="${st.label}" id="stat-label-${st.id}" class="form-control" title="وصف الرقم الإحصائي" placeholder="الوصف">
                    <input type="number" value="${st.value_number}" id="stat-val-${st.id}" class="form-control" title="القيمة الرقمية" placeholder="القيمة">
                    <input type="text" value="${st.icon || 'fa-chart-bar'}" id="stat-icon-${st.id}" class="form-control" title="رمز أيقونة FontAwesome" placeholder="الأيقونة">
                    <button onclick="updateStatItem(${st.id})" class="btn btn-accent" title="حفظ التعديلات"><i class="fa-solid fa-save"></i> حفظ</button>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('خطأ في تحميل الإحصائيات:', err);
    }
}

async function updateStatItem(id) {
    const label = document.getElementById(`stat-label-${id}`).value;
    const value_number = parseInt(document.getElementById(`stat-val-${id}`).value);
    const icon = document.getElementById(`stat-icon-${id}`).value;

    try {
        const res = await fetch(`/api/stats/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, value_number, icon })
        });
        const json = await res.json();
        if (json.success) showAlert('تم تحديث الرقم الإحصائي في SQL بنجاح!');
    } catch (err) {
        showAlert('خطأ في التحديث', 'error');
    }
}

/* 4. News CRUD */
async function loadAdminNews() {
    try {
        const res = await fetch('/api/news');
        const json = await res.json();
        if (json.success) {
            const tbody = document.getElementById('admin-news-tbody');
            tbody.innerHTML = json.data.map(n => `
                <tr>
                    <td>${n.id}</td>
                    <td><strong>${n.title}</strong></td>
                    <td><span class="badge-status badge-new">${n.category}</span></td>
                    <td>${n.date}</td>
                    <td>
                        <button onclick="deleteNewsItem(${n.id})" class="btn btn-outline btn-action-delete" title="حذف الخبر">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

async function addNewsForm(event) {
    event.preventDefault();
    const title = document.getElementById('news-title-in').value;
    const category = document.getElementById('news-cat-in').value;
    const snippet = document.getElementById('news-snip-in').value;
    const content = document.getElementById('news-content-in').value;
    const date = document.getElementById('news-date-in').value;
    const image_url = document.getElementById('news-img-in').value;

    try {
        const res = await fetch('/api/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category, snippet, content, date, image_url })
        });
        const json = await res.json();
        if (json.success) {
            showAlert('تم إضافة الخبر بنجاح إلى جدول SQL: news!');
            loadAdminNews();
            event.target.reset();
        }
    } catch (err) {
        showAlert('خطأ في إضافة الخبر', 'error');
    }
}

async function deleteNewsItem(id) {
    if (!confirm('هل أنت تأكد من حذف هذا الخبر من SQL؟')) return;
    try {
        const res = await fetch(`/api/news/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showAlert('تم مسح الخبر بنجاح.');
            loadAdminNews();
        }
    } catch (err) {
        showAlert('خطأ في الحذف', 'error');
    }
}

/* 5. Initiatives CRUD */
async function loadAdminInitiatives() {
    try {
        const res = await fetch('/api/initiatives');
        const json = await res.json();
        if (json.success) {
            const tbody = document.getElementById('admin-initiatives-tbody');
            tbody.innerHTML = json.data.map(i => `
                <tr>
                    <td>${i.id}</td>
                    <td><strong>${i.title}</strong></td>
                    <td><span class="badge-status badge-new">${i.category}</span></td>
                    <td><span class="badge-status badge-done">${i.status}</span></td>
                    <td>
                        <button onclick="deleteInitiativeItem(${i.id})" class="btn btn-outline btn-action-delete" title="حذف المبادرة">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

async function addInitiativeForm(event) {
    event.preventDefault();
    const title = document.getElementById('init-title-in').value;
    const category = document.getElementById('init-cat-in').value;
    const status = document.getElementById('init-status-in').value;
    const description = document.getElementById('init-desc-in').value;
    const image_url = document.getElementById('init-img-in').value;

    try {
        const res = await fetch('/api/initiatives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category, status, description, image_url })
        });
        const json = await res.json();
        if (json.success) {
            showAlert('تم إضافة المبادرة بنجاح إلى جدول SQL: initiatives!');
            loadAdminInitiatives();
            event.target.reset();
        }
    } catch (err) {
        showAlert('خطأ في الإضافة', 'error');
    }
}

async function deleteInitiativeItem(id) {
    if (!confirm('هل تأكد حذف المبادرة؟')) return;
    try {
        const res = await fetch(`/api/initiatives/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showAlert('تم الحذف بنجاح.');
            loadAdminInitiatives();
        }
    } catch (err) {
        showAlert('خطأ في الحذف', 'error');
    }
}

/* 6. Articles CRUD */
async function loadAdminArticles() {
    try {
        const res = await fetch('/api/articles');
        const json = await res.json();
        if (json.success) {
            const tbody = document.getElementById('admin-articles-tbody');
            tbody.innerHTML = json.data.map(a => `
                <tr>
                    <td>${a.id}</td>
                    <td><strong>${a.title}</strong></td>
                    <td><span class="badge-status badge-new">${a.category}</span></td>
                    <td>${a.author}</td>
                    <td>
                        <button onclick="deleteArticleItem(${a.id})" class="btn btn-outline btn-action-delete" title="حذف المقال">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

async function addArticleForm(event) {
    event.preventDefault();
    const title = document.getElementById('art-title-in').value;
    const category = document.getElementById('art-cat-in').value;
    const read_time = document.getElementById('art-time-in').value;
    const author = document.getElementById('art-author-in').value;
    const snippet = document.getElementById('art-snip-in').value;
    const content = document.getElementById('art-content-in').value;

    try {
        const res = await fetch('/api/articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category, read_time, author, snippet, content })
        });
        const json = await res.json();
        if (json.success) {
            showAlert('تم نشر المقال بنجاح في SQL!');
            loadAdminArticles();
            event.target.reset();
        }
    } catch (err) {
        showAlert('خطأ أثناء النشر', 'error');
    }
}

async function deleteArticleItem(id) {
    if (!confirm('حذف المقال؟')) return;
    try {
        const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showAlert('تم الحذف.');
            loadAdminArticles();
        }
    } catch (err) {
        showAlert('خطأ', 'error');
    }
}

/* 7. Gallery CRUD */
async function loadAdminGallery() {
    try {
        const res = await fetch('/api/gallery');
        const json = await res.json();
        if (json.success) {
            const tbody = document.getElementById('admin-gallery-tbody');
            tbody.innerHTML = json.data.map(g => `
                <tr>
                    <td>${g.id}</td>
                    <td><img src="${g.image_url}" alt="${g.title}" class="table-img-thumb"></td>
                    <td>${g.title}</td>
                    <td><span class="badge-status badge-new">${g.category}</span></td>
                    <td>
                        <button onclick="deleteGalleryItem(${g.id})" class="btn btn-outline btn-action-delete" title="حذف الصورة">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

async function addGalleryForm(event) {
    event.preventDefault();
    const title = document.getElementById('gal-title-in').value;
    const category = document.getElementById('gal-cat-in').value;
    const image_url = document.getElementById('gal-img-in').value;

    try {
        const res = await fetch('/api/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category, image_url })
        });
        const json = await res.json();
        if (json.success) {
            showAlert('تم إضافة الصورة إلى معرض SQL!');
            loadAdminGallery();
            event.target.reset();
        }
    } catch (err) {
        showAlert('خطأ في الإضافة', 'error');
    }
}

async function deleteGalleryItem(id) {
    if (!confirm('حذف الصورة؟')) return;
    try {
        const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showAlert('تم حذف الصورة.');
            loadAdminGallery();
        }
    } catch (err) {
        showAlert('خطأ', 'error');
    }
}

/* 8. Achievements CRUD */
async function loadAdminAchievements() {
    try {
        const res = await fetch('/api/achievements');
        const json = await res.json();
        if (json.success) {
            const tbody = document.getElementById('admin-achievements-tbody');
            tbody.innerHTML = json.data.map(ac => `
                <tr>
                    <td>${ac.id}</td>
                    <td><strong>${ac.title}</strong></td>
                    <td><span class="badge-status badge-new">${ac.category}</span></td>
                    <td>${ac.year}</td>
                    <td>
                        <button onclick="deleteAchievementItem(${ac.id})" class="btn btn-outline btn-action-delete" title="حذف الإنجاز">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

async function addAchievementForm(event) {
    event.preventDefault();
    const title = document.getElementById('ach-title-in').value;
    const category = document.getElementById('ach-cat-in').value;
    const year = document.getElementById('ach-year-in').value;
    const description = document.getElementById('ach-desc-in').value;

    try {
        const res = await fetch('/api/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category, year, description })
        });
        const json = await res.json();
        if (json.success) {
            showAlert('تم إضافة الإنجاز إلى سجل SQL!');
            loadAdminAchievements();
            event.target.reset();
        }
    } catch (err) {
        showAlert('خطأ في الإضافة', 'error');
    }
}

async function deleteAchievementItem(id) {
    if (!confirm('حذف الإنجاز؟')) return;
    try {
        const res = await fetch(`/api/achievements/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showAlert('تم حذف الإنجاز.');
            loadAdminAchievements();
        }
    } catch (err) {
        showAlert('خطأ', 'error');
    }
}

/* 9. Messages Inbox */
async function loadAdminMessages() {
    try {
        const res = await fetch('/api/messages');
        const json = await res.json();
        if (json.success) {
            const tbody = document.getElementById('admin-messages-tbody');
            tbody.innerHTML = json.data.map(m => `
                <tr>
                    <td>${m.id}</td>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.email}<br><small class="msg-phone">${m.phone || 'بدون هاتف'}</small></td>
                    <td>
                        <strong class="msg-subject">${m.subject}</strong>
                        <p class="msg-details">${m.details}</p>
                        <small class="msg-date">${m.created_at}</small>
                    </td>
                    <td>
                        <span class="badge-status ${m.status === 'جديد' ? 'badge-new' : 'badge-done'}">${m.status}</span>
                    </td>
                    <td>
                        <button onclick="toggleMessageStatus(${m.id}, '${m.status === 'جديد' ? 'تم الاطلاع' : 'جديد'}')" class="btn btn-outline btn-action-sm" title="تغيير حالة الرسالة">
                            تغيير الحالة
                        </button>
                        <button onclick="deleteMessageItem(${m.id})" class="btn btn-outline btn-action-sm btn-action-delete" title="حذف الرسالة">
                            حذف
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

async function toggleMessageStatus(id, newStatus) {
    try {
        const res = await fetch(`/api/messages/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const json = await res.json();
        if (json.success) loadAdminMessages();
    } catch (err) {
        showAlert('خطأ في تعديل حالة الرسالة', 'error');
    }
}

async function deleteMessageItem(id) {
    if (!confirm('حذف الرسالة؟')) return;
    try {
        const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) loadAdminMessages();
    } catch (err) {
        showAlert('خطأ', 'error');
    }
}

/* 10. SQL Console Explorer */
function presetSqlQuery(sql) {
    document.getElementById('sql-query-input').value = sql;
    runAdminSqlQuery();
}

async function runAdminSqlQuery() {
    const query = document.getElementById('sql-query-input').value;
    const container = document.getElementById('sql-results-container');
    if (!query) return;

    try {
        const res = await fetch('/api/sql/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const json = await res.json();

        if (!json.success) {
            container.innerHTML = `
                <div class="sql-error-box">
                    <strong><i class="fa-solid fa-triangle-exclamation"></i> SQL Error:</strong> ${json.error}
                </div>
            `;
            return;
        }

        if (json.type === 'select') {
            if (json.data.length === 0) {
                container.innerHTML = `<p class="sql-empty-notice">الاستعلام تم بنجاح، لكن الجدول فارغ (0 rows returned).</p>`;
                return;
            }

            const keys = Object.keys(json.data[0]);
            container.innerHTML = `
                <div class="sql-table-wrapper">
                    <p class="sql-table-notice"><i class="fa-solid fa-check-double"></i> تم إرجاع ${json.data.length} صفوف من قاعدة البيانات:</p>
                    <table class="admin-table">
                        <thead>
                            <tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${json.data.map(row => `
                                <tr>${keys.map(k => `<td>${row[k] !== null ? row[k] : 'NULL'}</td>`).join('')}</tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="sql-success-box">
                    <strong><i class="fa-solid fa-circle-check"></i> تم تنفيذ استعلام SQL بنجاح!</strong>
                    <div>Rows Changed: ${json.changes || 0} | Last Insert ID: ${json.lastID || 'N/A'}</div>
                </div>
            `;
        }
    } catch (err) {
        container.innerHTML = `
            <div class="sql-error-box">
                <strong><i class="fa-solid fa-triangle-exclamation"></i> Error:</strong> ${err.message}
            </div>
        `;
    }
}
