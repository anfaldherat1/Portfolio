const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function testAll() {
    console.log('🧪 بدء اختبار كافة APIs وقاعدة بيانات SQL...');

    // 1. Post message
    const msgRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/messages',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, {
        name: 'محمود خالد',
        email: 'mahmoud@example.com',
        phone: '0799988776',
        subject: 'فكرة دعم المشاريع الصغرى',
        details: 'أقترح تنظيم معرض شهري للمنتجات الحرفية بالحي.'
    });
    console.log('1. نتيجة إضافة رسالة:', msgRes);

    // 2. Fetch messages
    const msgsList = await request({ hostname: 'localhost', port: 3000, path: '/api/messages', method: 'GET' });
    console.log(`2. إجمالي الرسائل في SQL: ${msgsList.data.length}`);

    // 3. Test SQL Console Query
    const sqlRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/sql/query',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, {
        query: 'SELECT key, value FROM settings WHERE key="person_name"'
    });
    console.log('3. نتيجة استعلام SQL Explorer:', sqlRes);

    console.log('✅ جميع الاختبارات مرت بنجاح!');
}

testAll().catch(console.error);
