const express = require('express');
const Database = require('better-sqlite3');
const cron = require('node-cron');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Database Setup ----------
const db = new Database(path.join(__dirname, 'flower_shop.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    birthday TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    last_purchase_at TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    items TEXT NOT NULL,
    points_earned INTEGER DEFAULT 0,
    coupon_id INTEGER,
    coupon_name TEXT,
    coupon_discount TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    discount TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'system',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS birthday_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    remind_date TEXT NOT NULL,
    sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS redeemable_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    points_cost INTEGER NOT NULL,
    description TEXT,
    active INTEGER DEFAULT 1
  );
`);

const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
const hasCouponId = tableInfo.some(col => col.name === 'coupon_id');
if (!hasCouponId) {
  db.exec(`
    ALTER TABLE orders ADD COLUMN coupon_id INTEGER;
    ALTER TABLE orders ADD COLUMN coupon_name TEXT;
    ALTER TABLE orders ADD COLUMN coupon_discount TEXT;
  `);
}

// ---------- Seed Data ----------
const memberCount = db.prepare('SELECT COUNT(*) AS cnt FROM members').get().cnt;
if (memberCount === 0) {
  const insertMember = db.prepare(`
    INSERT INTO members (name, phone, birthday, tags, points, total_spent, total_orders, last_purchase_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOrder = db.prepare(`
    INSERT INTO orders (member_id, amount, items, points_earned, created_at) VALUES (?, ?, ?, ?, ?)
  `);
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (member_id, name, discount, used, expires_at) VALUES (?, ?, ?, ?, ?)
  `);
  const insertRedeem = db.prepare(`
    INSERT INTO redeemable_items (name, points_cost, description) VALUES (?, ?, ?)
  `);
  const insertNotif = db.prepare(`
    INSERT INTO notifications (member_id, title, content, type) VALUES (?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    // Members
    const members = [
      ['林小花', '13800001111', '1992-06-15', '["regular"]', 2860, 14300, 23, '2026-05-20'],
      ['王美琪', '13900002222', '1988-03-22', '["corporate"]', 5200, 26000, 18, '2026-06-01'],
      ['张雅琴', '13700003333', '1995-11-08', '["wedding"]', 8900, 44500, 12, '2026-05-28'],
      ['李思思', '13600004444', '1990-06-11', '["regular","corporate"]', 1500, 7500, 15, '2026-06-05'],
      ['陈月月', '13500005555', '1998-01-20', '["regular"]', 680, 3400, 8, '2026-04-18'],
      ['赵小雪', '13400006666', '1985-12-25', '["wedding"]', 12000, 60000, 30, '2026-06-03'],
      ['周佳佳', '13300007777', '1993-06-09', '["corporate"]', 3200, 16000, 10, '2026-05-15'],
      ['吴芳芳', '13200008888', '1997-08-30', '["regular"]', 450, 2250, 5, '2026-03-10'],
      ['郑晓晓', '13100009999', '1991-04-05', '["regular","wedding"]', 6700, 33500, 20, '2026-06-07'],
      ['孙萌萌', '13000010000', '1996-10-14', '["regular"]', 900, 4500, 7, '2026-05-02'],
    ];
    const memberIds = [];
    for (const m of members) {
      const info = insertMember.run(...m);
      memberIds.push(info.lastInsertRowid);
    }

    // Orders for each member
    const flowerItems = [
      '红玫瑰花束 x1', '百合花束 x2', '向日葵混搭 x1', '郁金香礼盒 x1',
      '永生花摆件 x1', '婚礼花艺全套 x1', '企业前台花 x3', '母亲节康乃馨 x1',
      '情人节玫瑰礼盒 x1', '开业花篮 x2', '满天星干花 x1', '绣球花束 x1',
    ];
    for (let i = 0; i < memberIds.length; i++) {
      const orderCount = members[i][6]; // total_orders
      const avgAmount = members[i][5] / Math.max(orderCount, 1);
      for (let j = 0; j < Math.min(orderCount, 5); j++) {
        const amount = Math.round((avgAmount * (0.6 + Math.random() * 0.8)) * 100) / 100;
        const pts = Math.floor(amount / 10);
        const item = flowerItems[Math.floor(Math.random() * flowerItems.length)];
        const day = 28 - j * 7 - i;
        const d = day > 0 ? day : 1;
        insertOrder.run(memberIds[i], amount, item, pts, `2026-05-${String(d).padStart(2,'0')}`);
      }
    }

    // Coupons
    const couponDefs = [
      ['生日专属9折券', '全场9折', 0, '2026-12-31'],
      ['鲜花8.5折优惠', '全场8.5折', 0, '2026-09-30'],
      ['满200减30', '满200减30元', 1, '2026-08-31'],
      ['永生花买一送一', '永生花买一送一', 0, '2026-07-31'],
      ['新人50元券', '无门槛减50元', 0, '2026-12-31'],
    ];
    for (let i = 0; i < memberIds.length; i++) {
      const ci = i % couponDefs.length;
      insertCoupon.run(memberIds[i], couponDefs[ci][0], couponDefs[ci][1], couponDefs[ci][2], couponDefs[ci][3]);
    }

    // Redeemable items
    insertRedeem.run('满天星小花束', 500, '精美满天星小花束一束');
    insertRedeem.run('9折优惠券', 300, '全场商品9折优惠券一张');
    insertRedeem.run('玫瑰永生花', 2000, '永生玫瑰花礼盒');
    insertRedeem.run('8折优惠券', 800, '全场商品8折优惠券一张');
    insertRedeem.run('定制花篮', 3000, '定制款豪华花篮');

    // Notifications
    insertNotif.run(memberIds[0], '生日快乐', '亲爱的林小花，祝您生日快乐！专属9折券已发放', 'birthday');
    insertNotif.run(null, '夏日鲜花特惠', '全场鲜花8折起，永生花买一送一！', 'promotion');
    insertNotif.run(null, '新品上市', '进口绣球花到货，数量有限速来选购！', 'new_product');
  });
  seedAll();
  console.log('示例数据已初始化');
}

// ---------- Helper ----------
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ---------- API: Members ----------
app.get('/api/members', (req, res) => {
  const { sort, tag, search } = req.query;
  let sql = 'SELECT * FROM members WHERE 1=1';
  const params = [];
  if (tag) { sql += ` AND tags LIKE ?`; params.push(`%${tag}%`); }
  if (search) { sql += ` AND (name LIKE ? OR phone LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
  if (sort === 'frequency') sql += ' ORDER BY total_orders DESC';
  else if (sort === 'spent') sql += ' ORDER BY total_spent DESC';
  else if (sort === 'points') sql += ' ORDER BY points DESC';
  else sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/members/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: '会员不存在' });
  const orders = db.prepare('SELECT * FROM orders WHERE member_id = ? ORDER BY created_at DESC').all(m.id);
  const coupons = db.prepare('SELECT * FROM coupons WHERE member_id = ? ORDER BY created_at DESC').all(m.id);
  const notifications = db.prepare('SELECT * FROM notifications WHERE member_id = ? OR member_id IS NULL ORDER BY created_at DESC').all(m.id);
  res.json({ ...m, orders, coupons, notifications });
});

app.post('/api/members', (req, res) => {
  const { name, phone, birthday } = req.body;
  if (!name || !phone || !birthday) return res.status(400).json({ error: '请填写完整信息' });
  try {
    const info = db.prepare('INSERT INTO members (name, phone, birthday) VALUES (?, ?, ?)').run(name, phone, birthday);
    const welcomeCoupon = db.prepare('INSERT INTO coupons (member_id, name, discount, expires_at) VALUES (?, ?, ?, ?)');
    welcomeCoupon.run(info.lastInsertRowid, '新人专属8.8折券', '全场8.8折', '2026-12-31');
    welcomeCoupon.run(info.lastInsertRowid, '满100减15元券', '满100减15元', '2026-12-31');
    db.prepare('INSERT INTO notifications (member_id, title, content, type) VALUES (?, ?, ?, ?)')
      .run(info.lastInsertRowid, '欢迎加入花语会员', '恭喜成为花语花店会员，专属优惠券已发放！', 'system');
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid);
    res.json(member);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: '该手机号已注册' });
    throw e;
  }
});

app.put('/api/members/:id/tags', (req, res) => {
  const { tags } = req.body;
  db.prepare('UPDATE members SET tags = ? WHERE id = ?').run(JSON.stringify(tags), req.params.id);
  res.json({ ok: true });
});

// ---------- API: Orders ----------
app.post('/api/orders', (req, res) => {
  const { member_id, amount, items, coupon_id } = req.body;
  if (!member_id || !amount || !items) return res.status(400).json({ error: '信息不完整' });

  const createOrder = db.transaction(() => {
    let couponName = null, couponDiscount = null;

    if (coupon_id) {
      const coupon = db.prepare(`
        SELECT * FROM coupons 
        WHERE id = ? AND member_id = ? AND used = 0 
        AND (expires_at IS NULL OR expires_at >= date('now','localtime'))
      `).get(coupon_id, member_id);
      if (!coupon) {
        const exists = db.prepare('SELECT * FROM coupons WHERE id = ? AND member_id = ?').get(coupon_id, member_id);
        if (!exists) throw new Error('优惠券不存在');
        if (exists.used) throw new Error('优惠券已使用');
        throw new Error('优惠券已过期');
      }
      couponName = coupon.name;
      couponDiscount = coupon.discount;
      db.prepare('UPDATE coupons SET used = 1 WHERE id = ?').run(coupon_id);
    }

    const points = Math.floor(amount / 10);
    const info = db.prepare('INSERT INTO orders (member_id, amount, items, points_earned, coupon_id, coupon_name, coupon_discount) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(member_id, amount, items, points, coupon_id, couponName, couponDiscount);

    db.prepare(`UPDATE members SET points = points + ?, total_spent = total_spent + ?,
      total_orders = total_orders + 1, last_purchase_at = datetime('now','localtime') WHERE id = ?`)
      .run(points, amount, member_id);

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
    const now = new Date();
    const bMonth = parseInt(member.birthday.split('-')[1]);
    if (bMonth === now.getMonth() + 1) {
      db.prepare('UPDATE members SET points = points + 100 WHERE id = ?').run(member_id);
    }

    return { id: info.lastInsertRowid, points_earned: points, coupon_name: couponName };
  });

  try {
    const result = createOrder();
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/orders', (req, res) => {
  const { member_id } = req.query;
  let sql = 'SELECT o.*, m.name AS member_name FROM orders o JOIN members m ON o.member_id = m.id';
  const params = [];
  if (member_id) { sql += ' WHERE o.member_id = ?'; params.push(member_id); }
  sql += ' ORDER BY o.created_at DESC LIMIT 100';
  res.json(db.prepare(sql).all(...params));
});

// ---------- API: Points Redeem ----------
app.get('/api/redeem-items', (req, res) => {
  res.json(db.prepare('SELECT * FROM redeemable_items WHERE active = 1').all());
});

app.post('/api/redeem', (req, res) => {
  const { member_id, item_id } = req.body;
  const item = db.prepare('SELECT * FROM redeemable_items WHERE id = ? AND active = 1').get(item_id);
  if (!item) return res.status(404).json({ error: '兑换商品不存在' });
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
  if (!member) return res.status(404).json({ error: '会员不存在' });
  if (member.points < item.points_cost) return res.status(400).json({ error: '积分不足' });
  db.prepare('UPDATE members SET points = points - ? WHERE id = ?').run(item.points_cost, member_id);
  db.prepare('INSERT INTO notifications (member_id, title, content, type) VALUES (?, ?, ?, ?)')
    .run(member_id, '兑换成功', `您已成功兑换「${item.name}」，消耗${item.points_cost}积分`, 'redeem');
  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
  res.json({ ok: true, remaining_points: updated.points });
});

// ---------- API: Coupons ----------
app.get('/api/coupons', (req, res) => {
  const { member_id, available } = req.query;
  if (!member_id) return res.json([]);
  let sql = 'SELECT * FROM coupons WHERE member_id = ?';
  const params = [member_id];
  if (available === 'true') {
    sql += ' AND used = 0 AND (expires_at IS NULL OR expires_at >= date(\'now\',\'localtime\'))';
  }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// ---------- API: Notifications ----------
app.get('/api/notifications', (req, res) => {
  const { member_id } = req.query;
  let sql, params;
  if (member_id) {
    sql = 'SELECT * FROM notifications WHERE member_id = ? OR member_id IS NULL ORDER BY created_at DESC';
    params = [member_id];
  } else {
    sql = 'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50';
    params = [];
  }
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/notifications/broadcast', (req, res) => {
  const { title, content, tag } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和内容' });
  let members;
  if (tag) {
    members = db.prepare('SELECT id FROM members WHERE tags LIKE ?').all(`%${tag}%`);
  } else {
    members = db.prepare('SELECT id FROM members').all();
  }
  const insert = db.prepare('INSERT INTO notifications (member_id, title, content, type) VALUES (?, ?, ?, ?)');
  const batch = db.transaction(() => {
    for (const m of members) {
      insert.run(m.id, title, content, 'broadcast');
    }
    // Also insert a system-wide copy
    insert.run(null, title, content, 'broadcast');
  });
  batch();
  res.json({ ok: true, sent_to: members.length });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- API: Birthday Reminders ----------
app.get('/api/birthday-reminders', (req, res) => {
  const today = new Date();
  const in3 = new Date(today); in3.setDate(in3.getDate() + 3);
  const mmdd = `${String(in3.getMonth() + 1).padStart(2, '0')}-${String(in3.getDate()).padStart(2, '0')}`;
  const upcoming = db.prepare(`
    SELECT m.*, printf('%s-%s', substr(m.birthday,6,2), substr(m.birthday,9,2)) AS mmdd
    FROM members m
    WHERE substr(m.birthday,6,5) BETWEEN
      printf('%s-%s', substr(?,1,2), substr(?,4,2))
      AND printf('%s-%s', substr(?,1,2), substr(?,4,2))
    ORDER BY m.birthday
  `).all(
    `${today.getMonth()+1}-${today.getDate()}`,
    `${today.getMonth()+1}-${today.getDate()}`,
    `${in3.getMonth()+1}-${in3.getDate()}`,
    `${in3.getMonth()+1}-${in3.getDate()}`
  );
  res.json(upcoming);
});

// ---------- API: Stats ----------
app.get('/api/stats', (req, res) => {
  const totalMembers = db.prepare('SELECT COUNT(*) AS v FROM members').get().v;
  const totalOrders = db.prepare('SELECT COUNT(*) AS v FROM orders').get().v;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(amount),0) AS v FROM orders').get().v;
  const avgPoints = db.prepare('SELECT COALESCE(AVG(points),0) AS v FROM members').get().v;
  const topSpenders = db.prepare('SELECT name, total_spent, total_orders, points FROM members ORDER BY total_spent DESC LIMIT 5').all();
  const tagStats = db.prepare(`SELECT tags FROM members`).all();
  const tagCounts = {};
  for (const row of tagStats) {
    const arr = JSON.parse(row.tags);
    for (const t of arr) { tagCounts[t] = (tagCounts[t] || 0) + 1; }
  }
  res.json({ totalMembers, totalOrders, totalRevenue, avgPoints: Math.round(avgPoints), topSpenders, tagCounts });
});

// ---------- Birthday Check Cron (every day at 9am) ----------
cron.schedule('0 9 * * *', () => {
  const today = new Date();
  const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 3);
  const soonMmdd = `${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`;

  const upcoming = db.prepare(`
    SELECT * FROM members WHERE
      substr(birthday,6,5) >= ? AND substr(birthday,6,5) <= ?
  `).all(mmdd <= soonMmdd ? mmdd : soonMmdd, mmdd <= soonMmdd ? soonMmdd : mmdd);

  for (const m of upcoming) {
    const exists = db.prepare(`SELECT id FROM birthday_reminders WHERE member_id = ? AND remind_date = ?`)
      .get(m.id, mmdd);
    if (!exists) {
      db.prepare('INSERT INTO birthday_reminders (member_id, remind_date) VALUES (?, ?)').run(m.id, mmdd);
      db.prepare('INSERT INTO notifications (member_id, title, content, type) VALUES (?, ?, ?, ?)')
        .run(m.id, '生日提醒', `会员「${m.name}」的生日（${m.birthday}）即将到来，记得准备祝福和优惠券！`, 'birthday');
      console.log(`[生日提醒] ${m.name} 的生日即将到来 (${m.birthday})`);
    }
  }
});

// ---------- SPA Fallback ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🌸 花语花店会员管理系统已启动`);
  console.log(`  📡 http://localhost:${PORT}\n`);
});
