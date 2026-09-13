const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");
const fs = require("fs");


const app = express();
const PORT = process.env.PORT || 3000;
const startTime = Date.now();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Global error handler for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res
      .status(400)
      .json({ success: false, error: "تنسيق JSON غير صالح في الطلب" });
  }
  next();
});

app.use(express.static(path.join(__dirname, "public")));

// Database Connection
const dbPath = path.join(__dirname, "db", "civic_platform.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ خطأ في فتح قاعدة البيانات:", err.message);
  } else {
    console.log("⚡ متصل بقاعدة بيانات SQL بنجاح:", dbPath);
    // Enable WAL mode & foreign keys for performance and reliability
    db.run("PRAGMA journal_mode = WAL;");
    db.run("PRAGMA foreign_keys = ON;");
  }
});

// Helper DB Promise wrappers
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

/* ==========================================
   API Endpoints
========================================== */

// 0. System Dashboard & Health API
app.get("/api/system/stats", async (req, res) => {
  try {
    const settingsCount = (
      await dbGet("SELECT COUNT(*) as count FROM settings")
    ).count;
    const newsCount = (await dbGet("SELECT COUNT(*) as count FROM news")).count;
    const initiativesCount = (
      await dbGet("SELECT COUNT(*) as count FROM initiatives")
    ).count;
    const articlesCount = (
      await dbGet("SELECT COUNT(*) as count FROM articles")
    ).count;
    const galleryCount = (await dbGet("SELECT COUNT(*) as count FROM gallery"))
      .count;
    const achievementsCount = (
      await dbGet("SELECT COUNT(*) as count FROM achievements")
    ).count;
    const messagesCount = (
      await dbGet("SELECT COUNT(*) as count FROM messages")
    ).count;
    const newMessagesCount = (
      await dbGet(
        "SELECT COUNT(*) as count FROM messages WHERE status = 'جديد'",
      )
    ).count;

    let dbSizeBytes = 0;
    if (fs.existsSync(dbPath)) {
      dbSizeBytes = fs.statSync(dbPath).size;
    }

    const sqliteVersionRow = await dbGet("SELECT sqlite_version() as version");

    res.json({
      success: true,
      data: {
        counts: {
          settings: settingsCount,
          news: newsCount,
          initiatives: initiativesCount,
          articles: articlesCount,
          gallery: galleryCount,
          achievements: achievementsCount,
          messages: messagesCount,
          newMessages: newMessagesCount,
        },
        dbSizeBytes,
        dbSizeFormatted: `${(dbSizeBytes / 1024).toFixed(1)} KB`,
        sqliteVersion: sqliteVersionRow ? sqliteVersionRow.version : "3.x",
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Settings
app.get("/api/settings", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM settings");
    const settingsMap = {};
    rows.forEach((r) => (settingsMap[r.key] = r.value));
    res.json({ success: true, data: settingsMap });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key)
      return res
        .status(400)
        .json({ success: false, error: "مفتاح الإعداد مطلوب" });
    await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
      key,
      value || "",
    ]);
    res.json({ success: true, message: "تم تحديث الإعداد بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Image Upload API (Base64 -> File on Disk)
app.post("/api/upload", (req, res) => {
  try {
    const { image } = req.body;
    if (!image)
      return res
        .status(400)
        .json({ success: false, error: "لم يتم إرسال ملف الصورة" });

    const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches) {
      return res
        .status(400)
        .json({ success: false, error: "تنسيق صورة Base64 غير صحيح" });
    }

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const uploadsDir = path.join(__dirname, "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeName = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    fs.writeFileSync(filePath, buffer);
    res.json({ success: true, url: `/uploads/${safeName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Stats
app.get("/api/stats", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM stats ORDER BY sort_order ASC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/stats", async (req, res) => {
  try {
    const { key_name, label, value_number, icon, sort_order } = req.body;
    if (!key_name || !label) {
      return res
        .status(400)
        .json({ success: false, error: "اسم المفتاح والعنوان مطلوبان" });
    }
    const result = await dbRun(
      "INSERT INTO stats (key_name, label, value_number, icon, sort_order) VALUES (?, ?, ?, ?, ?)",
      [
        key_name,
        label,
        parseInt(value_number) || 0,
        icon || "fa-chart-bar",
        parseInt(sort_order) || 0,
      ],
    );
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/stats/:id", async (req, res) => {
  try {
    const { label, value_number, icon } = req.body;
    await dbRun(
      "UPDATE stats SET label = ?, value_number = ?, icon = ? WHERE id = ?",
      [label, parseInt(value_number) || 0, icon, req.params.id],
    );
    res.json({ success: true, message: "تم التحديث بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. News
app.get("/api/news", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM news ORDER BY date DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/news/:id", async (req, res) => {
  try {
    const row = await dbGet("SELECT * FROM news WHERE id = ?", [req.params.id]);
    if (!row)
      return res.status(404).json({ success: false, error: "الخبر غير موجود" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/news", async (req, res) => {
  try {
    const { title, category, snippet, content, date, image_url } = req.body;
    if (!title || !category || !snippet || !content) {
      return res
        .status(400)
        .json({ success: false, error: "جميع حقول الخبر الأساسية مطلوبة" });
    }
    const result = await dbRun(
      "INSERT INTO news (title, category, snippet, content, date, image_url) VALUES (?, ?, ?, ?, ?, ?)",
      [
        title,
        category,
        snippet,
        content,
        date || new Date().toISOString().split("T")[0],
        image_url ||
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800",
      ],
    );
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/news/:id", async (req, res) => {
  try {
    const { title, category, snippet, content, date, image_url } = req.body;
    await dbRun(
      "UPDATE news SET title = ?, category = ?, snippet = ?, content = ?, date = ?, image_url = ? WHERE id = ?",
      [title, category, snippet, content, date, image_url, req.params.id],
    );
    res.json({ success: true, message: "تم تحديث الخبر بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/news/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM news WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Initiatives
app.get("/api/initiatives", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM initiatives ORDER BY id DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/initiatives/:id", async (req, res) => {
  try {
    const row = await dbGet("SELECT * FROM initiatives WHERE id = ?", [
      req.params.id,
    ]);
    if (!row)
      return res
        .status(404)
        .json({ success: false, error: "المبادرة غير موجودة" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/initiatives", async (req, res) => {
  try {
    const { title, category, description, status, date, image_url } = req.body;
    if (!title || !category || !description) {
      return res
        .status(400)
        .json({ success: false, error: "العنوان والتصنيف والوصف حقول مطلوبة" });
    }
    const result = await dbRun(
      "INSERT INTO initiatives (title, category, description, status, date, image_url) VALUES (?, ?, ?, ?, ?, ?)",
      [
        title,
        category,
        description,
        status || "قيد التنفيذ",
        date || new Date().toISOString().split("T")[0],
        image_url ||
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
      ],
    );
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/initiatives/:id", async (req, res) => {
  try {
    const { title, category, description, status, date, image_url } = req.body;
    await dbRun(
      "UPDATE initiatives SET title = ?, category = ?, description = ?, status = ?, date = ?, image_url = ? WHERE id = ?",
      [title, category, description, status, date, image_url, req.params.id],
    );
    res.json({ success: true, message: "تم تحديث المبادرة بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/initiatives/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM initiatives WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Articles
app.get("/api/articles", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM articles ORDER BY date DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/articles/:id", async (req, res) => {
  try {
    const row = await dbGet("SELECT * FROM articles WHERE id = ?", [
      req.params.id,
    ]);
    if (!row)
      return res
        .status(404)
        .json({ success: false, error: "المقال غير موجود" });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/articles", async (req, res) => {
  try {
    const { title, author, category, snippet, content, date, read_time } =
      req.body;
    if (!title || !category || !snippet || !content) {
      return res
        .status(400)
        .json({ success: false, error: "جميع حقول المقال الأساسية مطلوبة" });
    }
    const result = await dbRun(
      "INSERT INTO articles (title, author, category, snippet, content, date, read_time) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        title,
        author || "اسم الشخص",
        category,
        snippet,
        content,
        date || new Date().toISOString().split("T")[0],
        read_time || "5 دقائق",
      ],
    );
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/articles/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM articles WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Gallery
app.get("/api/gallery", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM gallery ORDER BY id DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/gallery", async (req, res) => {
  try {
    const { title, category, image_url, date } = req.body;
    if (!title || !category || !image_url) {
      return res.status(400).json({
        success: false,
        error: "العنوان والتصنيف ورابط الصورة حقول مطلوبة",
      });
    }
    const result = await dbRun(
      "INSERT INTO gallery (title, category, image_url, date) VALUES (?, ?, ?, ?)",
      [
        title,
        category,
        image_url,
        date || new Date().toISOString().split("T")[0],
      ],
    );
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/gallery/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM gallery WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Achievements
app.get("/api/achievements", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM achievements ORDER BY id DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/achievements", async (req, res) => {
  try {
    const { title, category, description, year } = req.body;
    if (!title || !category || !description) {
      return res
        .status(400)
        .json({ success: false, error: "جميع حقول الإنجاز مطلوبة" });
    }
    const result = await dbRun(
      "INSERT INTO achievements (title, category, description, year) VALUES (?, ?, ?, ?)",
      [
        title,
        category,
        description,
        year || new Date().getFullYear().toString(),
      ],
    );
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/achievements/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM achievements WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "تم الحذف بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Messages
app.get("/api/messages", async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM messages ORDER BY created_at DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const { name, email, phone, subject, details } = req.body;
    if (!name || !email || !subject || !details) {
      return res
        .status(400)
        .json({ success: false, error: "جميع الحقول الأساسية مطلوبة" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, error: "تنسيق البريد الإلكتروني غير صحيح" });
    }
    const result = await dbRun(
      "INSERT INTO messages (name, email, phone, subject, details, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        name.trim(),
        email.trim(),
        phone ? phone.trim() : "",
        subject.trim(),
        details.trim(),
        "جديد",
      ],
    );
    res.json({
      success: true,
      id: result.id,
      message: "تم إرسال الرسالة بنجاح وسوف يتم التواصل معكم قريباً.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/messages/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status)
      return res.status(400).json({ success: false, error: "الحالة مطلوبة" });
    await dbRun("UPDATE messages SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ success: true, message: "تم تغيير حالة الرسالة بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/messages/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM messages WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "تم مسح الرسالة بنجاح" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Unified Search Endpoint (/api/search?q=query)
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : "";
    if (!q) {
      return res.json({
        success: true,
        data: { news: [], initiatives: [], articles: [], achievements: [] },
      });
    }
    const searchTerm = `%${q}%`;
    const news = await dbAll(
      "SELECT id, title, category, snippet, date FROM news WHERE title LIKE ? OR snippet LIKE ? OR content LIKE ? LIMIT 10",
      [searchTerm, searchTerm, searchTerm],
    );
    const initiatives = await dbAll(
      "SELECT id, title, category, description, status FROM initiatives WHERE title LIKE ? OR description LIKE ? LIMIT 10",
      [searchTerm, searchTerm],
    );
    const articles = await dbAll(
      "SELECT id, title, category, snippet, author, date FROM articles WHERE title LIKE ? OR snippet LIKE ? OR content LIKE ? LIMIT 10",
      [searchTerm, searchTerm, searchTerm],
    );
    const achievements = await dbAll(
      "SELECT id, title, category, description, year FROM achievements WHERE title LIKE ? OR description LIKE ? LIMIT 10",
      [searchTerm, searchTerm],
    );

    res.json({
      success: true,
      query: q,
      data: { news, initiatives, articles, achievements },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Complete Database Export/Backup Endpoint
app.get("/api/db/export", async (req, res) => {
  try {
    const settings = await dbAll("SELECT * FROM settings");
    const stats = await dbAll("SELECT * FROM stats");
    const news = await dbAll("SELECT * FROM news");
    const initiatives = await dbAll("SELECT * FROM initiatives");
    const articles = await dbAll("SELECT * FROM articles");
    const gallery = await dbAll("SELECT * FROM gallery");
    const achievements = await dbAll("SELECT * FROM achievements");
    const messages = await dbAll("SELECT * FROM messages");

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        settings,
        stats,
        news,
        initiatives,
        articles,
        gallery,
        achievements,
        messages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. SQL Console Explorer Endpoint (for Admin Dashboard)
app.post("/api/sql/query", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "استعلام SQL فارغ أو غير صحيح" });
    }

    const startQueryTime = Date.now();
    const trimmed = query.trim().toUpperCase();

    if (
      trimmed.startsWith("SELECT") ||
      trimmed.startsWith("PRAGMA") ||
      trimmed.startsWith("EXPLAIN")
    ) {
      const rows = await dbAll(query);
      const durationMs = Date.now() - startQueryTime;
      res.json({
        success: true,
        type: "select",
        durationMs,
        count: rows.length,
        data: rows,
      });
    } else {
      const result = await dbRun(query);
      const durationMs = Date.now() - startQueryTime;
      res.json({
        success: true,
        type: "mutation",
        durationMs,
        changes: result.changes,
        lastID: result.id,
      });
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Start Server

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Public website: /index.html`);
  console.log(`🔑 Admin dashboard: /admin.html`);
});

// Graceful Shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 إغلاق الخادم وقاعدة البيانات بنجاح...");
  db.close(() => {
    process.exit(0);
  });
});

