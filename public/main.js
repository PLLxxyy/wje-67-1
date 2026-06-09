// -------- State --------
let currentPage = 'dashboard';
let members = [], memberDetail = null, stats = {}, redeemItems = [];
const TAG_LABELS = {regular:'常客',corporate:'企业客户',wedding:'婚礼客户'};

// -------- Router --------
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  render();
}

document.addEventListener('click', e => {
  const link = e.target.closest('.nav-link');
  if (link) { e.preventDefault(); navigate(link.dataset.page); }
});

// -------- API --------
async function api(url, opts) {
  const r = await fetch(url, opts);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || '请求失败');
  return d;
}

// -------- Toast --------
function toast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => t.className = 'toast', 3000);
}

// -------- Modal --------
function showModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// -------- Render --------
async function render() {
  const el = document.getElementById('content');
  switch (currentPage) {
    case 'dashboard': return renderDashboard(el);
    case 'register': return renderRegister(el);
    case 'members': return renderMembers(el);
    case 'purchase': return renderPurchase(el);
    case 'redeem': return renderRedeem(el);
    case 'birthdays': return renderBirthdays(el);
    case 'notifications': return renderNotifications(el);
    case 'member-center': return renderMemberCenter(el);
    case 'member-detail': return renderMemberDetail(el);
  }
}

// -------- Dashboard --------
async function renderDashboard(el) {
  const s = await api('/api/stats');
  const reminders = await api('/api/birthday-reminders');
  el.innerHTML = `
    <div class="page-header"><div><h2>数据总览</h2><p class="subtitle">花语花店运营数据一览</p></div></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="label">会员总数</div><div class="value">${s.totalMembers}</div><div class="sub">注册会员</div></div>
      <div class="stat-card green"><div class="label">累计订单</div><div class="value">${s.totalOrders}</div><div class="sub">笔</div></div>
      <div class="stat-card amber"><div class="label">累计营收</div><div class="value">¥${s.totalRevenue.toLocaleString()}</div><div class="sub">元</div></div>
      <div class="stat-card"><div class="label">平均积分</div><div class="value">${s.avgPoints}</div><div class="sub">分/人</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><h3>会员标签分布</h3></div>
        ${Object.entries(s.tagCounts).map(([t,c]) => `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span class="tag tag-${t}">${TAG_LABELS[t]||t}</span>
            <div style="flex:1;height:8px;background:var(--slate-100);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${Math.round(c/s.totalMembers*100)}%;background:var(--pink-400);border-radius:4px"></div>
            </div>
            <span style="font-size:13px;color:var(--slate-500);min-width:30px">${c}人</span>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="card-header"><h3>消费排行 TOP 5</h3></div>
        ${s.topSpenders.map((m,i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--slate-50)">
            <span style="font-size:18px;font-weight:700;color:${i<3?'var(--pink-500)':'var(--slate-400)'};width:28px">${i+1}</span>
            <span style="flex:1;font-weight:500">${m.name}</span>
            <span style="color:var(--slate-400);font-size:13px">${m.total_orders}单</span>
            <span style="font-weight:600;color:var(--pink-600)">¥${m.total_spent.toLocaleString()}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ${reminders.length ? `
    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>近期生日提醒</h3></div>
      ${reminders.map(m => `
        <div class="bday-card">
          <div class="bday-icon">🎂</div>
          <div class="bday-info"><h4>${m.name}</h4><p>生日: ${m.birthday} | 积分: ${m.points}</p></div>
        </div>
      `).join('')}
    </div>` : ''}
  `;
}

// -------- Register --------
function renderRegister(el) {
  el.innerHTML = `
    <div class="page-header"><div><h2>扫码注册</h2><p class="subtitle">扫描二维码或手动填写信息注册新会员</p></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div class="card" style="text-align:center">
        <div class="card-header"><h3>扫描二维码</h3></div>
        <div class="qr-box">
          <div class="qr-icon">📷</div>
          <p>请用微信扫码</p>
          <p>快速注册会员</p>
        </div>
        <p style="font-size:12px;color:var(--slate-400);margin-top:12px">扫描二维码后自动跳转注册页面</p>
      </div>
      <div class="card">
        <div class="card-header"><h3>手动注册</h3></div>
        <form id="registerForm">
          <div class="form-group">
            <label>姓名 *</label>
            <input type="text" id="regName" placeholder="请输入姓名" required>
          </div>
          <div class="form-group">
            <label>手机号 *</label>
            <input type="tel" id="regPhone" placeholder="请输入手机号" required pattern="1[3-9]\\d{9}">
          </div>
          <div class="form-group">
            <label>生日 *</label>
            <input type="date" id="regBirthday" required>
          </div>
          <div class="form-group">
            <label>会员标签</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer">
                <input type="checkbox" value="regular" class="tag-cb"> 常客
              </label>
              <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer">
                <input type="checkbox" value="corporate" class="tag-cb"> 企业客户
              </label>
              <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer">
                <input type="checkbox" value="wedding" class="tag-cb"> 婚礼客户
              </label>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%">注册会员</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const m = await api('/api/members', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          name: document.getElementById('regName').value,
          phone: document.getElementById('regPhone').value,
          birthday: document.getElementById('regBirthday').value,
        })
      });
      toast(`会员「${m.name}」注册成功！`);
      // Apply tags if checked
      const tags = [...document.querySelectorAll('.tag-cb:checked')].map(cb => cb.value);
      if (tags.length) {
        await api(`/api/members/${m.id}/tags`, {
          method: 'PUT',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({tags})
        });
      }
      e.target.reset();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// -------- Members --------
async function renderMembers(el) {
  const sort = document.getElementById('_msort')?.value || '';
  const tag = document.getElementById('_mtag')?.value || '';
  const search = document.getElementById('_msearch')?.value || '';
  const params = new URLSearchParams();
  if (sort) params.set('sort', sort);
  if (tag) params.set('tag', tag);
  if (search) params.set('search', search);
  members = await api('/api/members?' + params);
  el.innerHTML = `
    <div class="page-header"><div><h2>会员管理</h2><p class="subtitle">管理所有会员信息</p></div>
      <button class="btn btn-primary" onclick="navigate('register')">+ 新增会员</button>
    </div>
    <div class="card">
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="_msearch" placeholder="搜索姓名或手机号..." value="${search}" style="padding:8px 14px;border:1px solid var(--slate-200);border-radius:var(--radius-sm);width:220px" oninput="renderMembers(document.getElementById('content'))">
        <select id="_msort" style="padding:8px 14px;border:1px solid var(--slate-200);border-radius:var(--radius-sm)" onchange="renderMembers(document.getElementById('content'))">
          <option value="">默认排序</option>
          <option value="frequency" ${sort==='frequency'?'selected':''}>按消费频次</option>
          <option value="spent" ${sort==='spent'?'selected':''}>按消费总额</option>
          <option value="points" ${sort==='points'?'selected':''}>按积分</option>
        </select>
        <select id="_mtag" style="padding:8px 14px;border:1px solid var(--slate-200);border-radius:var(--radius-sm)" onchange="renderMembers(document.getElementById('content'))">
          <option value="">全部标签</option>
          <option value="regular" ${tag==='regular'?'selected':''}>常客</option>
          <option value="corporate" ${tag==='corporate'?'selected':''}>企业客户</option>
          <option value="wedding" ${tag==='wedding'?'selected':''}>婚礼客户</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>会员</th><th>手机号</th><th>生日</th><th>标签</th><th>积分</th><th>消费总额</th><th>订单数</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${members.map(m => `<tr>
              <td style="font-weight:600">${m.name}</td>
              <td>${m.phone}</td>
              <td>${m.birthday}</td>
              <td>${JSON.parse(m.tags).map(t=>`<span class="tag tag-${t}">${TAG_LABELS[t]||t}</span>`).join(' ')}</td>
              <td><span class="badge badge-pink">${m.points}</span></td>
              <td style="font-weight:500">¥${m.total_spent.toLocaleString()}</td>
              <td>${m.total_orders}</td>
              <td><button class="btn btn-sm btn-secondary" onclick="viewMember(${m.id})">详情</button>
              <button class="btn btn-sm btn-primary" onclick="editTags(${m.id},'${JSON.parse(m.tags).join(',')}')">标签</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function viewMember(id) {
  memberDetail = await api(`/api/members/${id}`);
  navigate('member-detail');
}

function editTags(id, current) {
  const cur = current.split(',').filter(Boolean);
  showModal(`
    <h3>编辑标签</h3>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin:20px 0">
      ${['regular','corporate','wedding'].map(t => `
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 14px;border:2px solid ${cur.includes(t)?'var(--pink-400)':'var(--slate-200)'};border-radius:var(--radius-sm);background:${cur.includes(t)?'var(--pink-50)':'#fff'}">
          <input type="checkbox" value="${t}" ${cur.includes(t)?'checked':''} class="et-tag-cb">
          <span class="tag tag-${t}">${TAG_LABELS[t]}</span>
        </label>
      `).join('')}
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveTags(${id})">保存</button>
    </div>
  `);
}

async function saveTags(id) {
  const tags = [...document.querySelectorAll('.et-tag-cb:checked')].map(cb => cb.value);
  await api(`/api/members/${id}/tags`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({tags}) });
  closeModal();
  toast('标签已更新');
  renderMembers(document.getElementById('content'));
}

// -------- Member Detail --------
function renderMemberDetail(el) {
  if (!memberDetail) { navigate('members'); return; }
  const m = memberDetail;
  const tags = JSON.parse(m.tags);
  el.innerHTML = `
    <div class="page-header"><div><button class="btn btn-secondary" onclick="navigate('members')" style="margin-bottom:12px">← 返回列表</button></div></div>
    <div class="card">
      <div class="detail-header">
        <div class="detail-avatar">${m.name[0]}</div>
        <div class="detail-info">
          <h2>${m.name}</h2>
          <div class="meta">手机: ${m.phone} | 生日: ${m.birthday} | 注册: ${m.created_at?.slice(0,10)}</div>
          <div style="margin-top:8px">${tags.map(t=>`<span class="tag tag-${t}">${TAG_LABELS[t]||t}</span>`).join(' ')}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:32px;font-weight:700;color:var(--pink-600)">${m.points}</div>
          <div style="font-size:12px;color:var(--slate-400)">积分余额</div>
        </div>
      </div>
      <div class="stats-grid" style="margin-bottom:0">
        <div class="stat-card"><div class="label">消费总额</div><div class="value" style="font-size:22px">¥${m.total_spent.toLocaleString()}</div></div>
        <div class="stat-card green"><div class="label">订单总数</div><div class="value" style="font-size:22px">${m.total_orders}</div></div>
        <div class="stat-card amber"><div class="label">优惠券</div><div class="value" style="font-size:22px">${m.coupons?.filter(c=>!c.used).length||0}张可用</div></div>
      </div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab(this,'tab-orders')">消费记录</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-coupons')">优惠券</button>
      <button class="tab-btn" onclick="switchTab(this,'tab-notifs')">消息通知</button>
    </div>
    <div id="tab-orders" class="tab-content active">
      <div class="card">
        ${m.orders?.length ? `<div class="table-wrap"><table>
          <thead><tr><th>日期</th><th>商品</th><th>金额</th><th>获得积分</th></tr></thead>
          <tbody>${m.orders.map(o=>`<tr>
            <td>${o.created_at?.slice(0,10)}</td><td>${o.items}</td>
            <td style="font-weight:600">¥${o.amount}</td><td><span class="badge badge-pink">+${o.points_earned}</span></td>
          </tr>`).join('')}</tbody>
        </table></div>` : '<div class="empty"><div class="empty-icon">📋</div><p>暂无消费记录</p></div>'}
      </div>
    </div>
    <div id="tab-coupons" class="tab-content">
      <div class="card">
        ${m.coupons?.length ? m.coupons.map(c=>`
          <div class="coupon-card ${c.used?'used':''}">
            <div><div class="coupon-name">${c.name}</div><div class="coupon-discount">${c.discount} | 有效期至 ${c.expires_at||'永久'}</div></div>
            <span class="badge ${c.used?'badge-amber':'badge-green'}">${c.used?'已使用':'可使用'}</span>
          </div>
        `).join('') : '<div class="empty"><div class="empty-icon">🎫</div><p>暂无优惠券</p></div>'}
      </div>
    </div>
    <div id="tab-notifs" class="tab-content">
      <div class="card">
        ${m.notifications?.length ? m.notifications.map(n=>`
          <div class="notif-item ${n.is_read?'':'unread'}">
            <div class="notif-title">${n.title}</div>
            <div class="notif-body">${n.content}</div>
            <div class="notif-time">${n.created_at?.slice(0,16)}</div>
          </div>
        `).join('') : '<div class="empty"><div class="empty-icon">🔔</div><p>暂无消息</p></div>'}
      </div>
    </div>
  `;
}

function switchTab(btn, tabId) {
  btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  btn.closest('.main').querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
}

// -------- Purchase --------
async function renderPurchase(el) {
  const ms = await api('/api/members');
  el.innerHTML = `
    <div class="page-header"><div><h2>消费录入</h2><p class="subtitle">为会员录入消费记录，自动累积积分</p></div></div>
    <div class="card" style="max-width:560px">
      <form id="purchaseForm">
        <div class="form-group">
          <label>选择会员 *</label>
          <select id="purMember" required>
            <option value="">请选择会员...</option>
            ${ms.map(m=>`<option value="${m.id}">${m.name} (${m.phone}) - 积分:${m.points}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>商品信息 *</label>
          <input type="text" id="purItems" placeholder="如：红玫瑰花束 x2" required>
        </div>
        <div class="form-group">
          <label>消费金额 (元) *</label>
          <input type="number" id="purAmount" min="1" step="0.01" placeholder="0.00" required>
        </div>
        <div style="background:var(--pink-50);padding:12px;border-radius:var(--radius-sm);margin-bottom:16px;font-size:13px;color:var(--slate-500)">
          积分规则: 每消费10元获得1积分，生日当月额外赠送100积分
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">确认录入</button>
      </form>
    </div>
  `;
  document.getElementById('purchaseForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const res = await api('/api/orders', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          member_id: document.getElementById('purMember').value,
          amount: parseFloat(document.getElementById('purAmount').value),
          items: document.getElementById('purItems').value,
        })
      });
      toast(`消费录入成功！获得 ${res.points_earned} 积分`);
      e.target.reset();
    } catch(err) { toast(err.message, true); }
  });
}

// -------- Redeem --------
async function renderRedeem(el) {
  const items = await api('/api/redeem-items');
  const ms = await api('/api/members');
  el.innerHTML = `
    <div class="page-header"><div><h2>积分兑换</h2><p class="subtitle">使用积分兑换精美礼品或优惠券</p></div></div>
    <div class="card" style="max-width:400px;margin-bottom:20px">
      <div class="form-group">
        <label>选择会员</label>
        <select id="redeemMember">
          <option value="">请选择会员...</option>
          ${ms.map(m=>`<option value="${m.id}">${m.name} (积分: ${m.points})</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
      ${items.map(item => `
        <div class="card" style="text-align:center;border:2px solid var(--pink-100)">
          <div style="font-size:40px;margin-bottom:8px">${item.name.includes('券')?'🎫':item.name.includes('花')?'💐':'🎁'}</div>
          <h3 style="font-size:16px;margin-bottom:6px">${item.name}</h3>
          <p style="font-size:13px;color:var(--slate-400);margin-bottom:12px">${item.description||''}</p>
          <div style="font-size:20px;font-weight:700;color:var(--pink-600);margin-bottom:12px">${item.points_cost} 积分</div>
          <button class="btn btn-primary" onclick="doRedeem(${item.id},'${item.name}',${item.points_cost})">立即兑换</button>
        </div>
      `).join('')}
    </div>
  `;
}

async function doRedeem(itemId, name, cost) {
  const memberId = document.getElementById('redeemMember')?.value;
  if (!memberId) { toast('请先选择会员', true); return; }
  if (!confirm(`确认用 ${cost} 积分兑换「${name}」？`)) return;
  try {
    const res = await api('/api/redeem', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({member_id: memberId, item_id: itemId})
    });
    toast(`兑换成功！剩余积分: ${res.remaining_points}`);
    renderRedeem(document.getElementById('content'));
  } catch(err) { toast(err.message, true); }
}

// -------- Birthdays --------
async function renderBirthdays(el) {
  const all = await api('/api/members');
  const today = new Date();
  const todayMm = today.getMonth() + 1;
  const todayDd = today.getDate();
  // Find birthdays in next 30 days
  const upcoming = [];
  for (const m of all) {
    const [y,mm,dd] = m.birthday.split('-').map(Number);
    const thisYear = new Date(today.getFullYear(), mm-1, dd);
    const diff = (thisYear - today) / 86400000;
    if (diff >= -1 && diff <= 30) {
      upcoming.push({...m, daysUntil: Math.ceil(diff)});
    }
  }
  upcoming.sort((a,b) => a.daysUntil - b.daysUntil);

  // Birthday reminders (auto-generated)
  const reminders = await api('/api/birthday-reminders');

  el.innerHTML = `
    <div class="page-header"><div><h2>生日提醒</h2><p class="subtitle">自动提醒店主会员生日，提前3天发送通知</p></div></div>
    ${reminders.length ? `
    <div class="card">
      <div class="card-header"><h3>系统自动提醒</h3><span class="badge badge-pink">距生日3天内</span></div>
      ${reminders.map(m => `
        <div class="bday-card">
          <div class="bday-icon">🎉</div>
          <div class="bday-info" style="flex:1">
            <h4>${m.name} <span class="tag tag-${JSON.parse(m.tags)[0]||'regular'}">${TAG_LABELS[JSON.parse(m.tags)[0]]||''}</span></h4>
            <p>生日: ${m.birthday} | 手机: ${m.phone} | 积分: ${m.points}</p>
          </div>
          <button class="btn btn-sm btn-primary" onclick="sendBdayGreeting(${m.id},'${m.name}')">发送祝福</button>
        </div>
      `).join('')}
    </div>` : `
    <div class="card"><div class="empty"><div class="empty-icon">🎂</div><p>近3天内暂无会员生日</p></div></div>
    `}
    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>未来30天生日</h3></div>
      ${upcoming.length ? upcoming.map(m => `
        <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--slate-50)">
          <span style="font-size:13px;font-weight:600;color:${m.daysUntil<=3?'var(--pink-600)':'var(--slate-400)'};min-width:60px">${m.daysUntil===0?'今天':m.daysUntil===1?'明天':`还有${m.daysUntil}天`}</span>
          <span style="flex:1;font-weight:500">${m.name}</span>
          <span style="font-size:13px;color:var(--slate-400)">${m.birthday}</span>
          <span class="badge badge-pink">${m.points}积分</span>
        </div>
      `).join('') : '<div class="empty"><div class="empty-icon">📅</div><p>未来30天内暂无生日</p></div>'}
    </div>
  `;
}

async function sendBdayGreeting(id, name) {
  try {
    await api('/api/notifications/broadcast', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({title: '生日祝福', content: `亲爱的${name}，花语花店全体员工祝您生日快乐！送上专属生日优惠券，期待您的光临~`, tag: ''})
    });
    toast('生日祝福已发送！');
  } catch(err) { toast(err.message, true); }
}

// -------- Notifications --------
async function renderNotifications(el) {
  const notifs = await api('/api/notifications');
  el.innerHTML = `
    <div class="page-header"><div><h2>消息通知</h2><p class="subtitle">群发通知与消息管理</p></div>
      <button class="btn btn-primary" onclick="showBroadcast()">+ 群发消息</button>
    </div>
    <div class="card">
      ${notifs.length ? notifs.map(n => `
        <div class="notif-item">
          <div class="notif-title">${n.title} <span class="badge badge-${n.type==='birthday'?'pink':n.type==='promotion'?'amber':'green'}" style="margin-left:8px">${{birthday:'生日',promotion:'促销',new_product:'新品',broadcast:'群发',system:'系统',redeem:'兑换'}[n.type]||n.type}</span></div>
          <div class="notif-body">${n.content}</div>
          <div class="notif-time">${n.created_at?.slice(0,16)} ${n.member_id?`· 会员专属`:''}</div>
        </div>
      `).join('') : '<div class="empty"><div class="empty-icon">📭</div><p>暂无消息</p></div>'}
    </div>
  `;
}

function showBroadcast() {
  showModal(`
    <h3>群发消息</h3>
    <form id="broadcastForm">
      <div class="form-group">
        <label>标题 *</label>
        <input type="text" id="bcastTitle" placeholder="消息标题" required>
      </div>
      <div class="form-group">
        <label>内容 *</label>
        <textarea id="bcastContent" rows="4" placeholder="消息内容..." required style="width:100%;padding:10px 14px;border:1px solid var(--slate-200);border-radius:var(--radius-sm)"></textarea>
      </div>
      <div class="form-group">
        <label>发送范围</label>
        <select id="bcastTag">
          <option value="">全部会员</option>
          <option value="regular">常客</option>
          <option value="corporate">企业客户</option>
          <option value="wedding">婚礼客户</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button type="submit" class="btn btn-primary">发送</button>
      </div>
    </form>
  `);
  document.getElementById('broadcastForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/api/notifications/broadcast', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          title: document.getElementById('bcastTitle').value,
          content: document.getElementById('bcastContent').value,
          tag: document.getElementById('bcastTag').value,
        })
      });
      closeModal();
      toast('消息发送成功！');
      renderNotifications(document.getElementById('content'));
    } catch(err) { toast(err.message, true); }
  });
}

// -------- Member Center (public-facing) --------
async function renderMemberCenter(el) {
  const ms = await api('/api/members');
  el.innerHTML = `
    <div class="page-header"><div><h2>会员中心</h2><p class="subtitle">查看个人信息、积分与优惠</p></div></div>
    <div class="card" style="max-width:400px;margin-bottom:20px">
      <div class="form-group"><label>选择会员查看</label>
        <select id="mcMember" onchange="loadMemberCenter()">
          <option value="">请选择...</option>
          ${ms.map(m=>`<option value="${m.id}">${m.name} (${m.phone})</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="mcContent"></div>
  `;
}

async function loadMemberCenter() {
  const id = document.getElementById('mcMember')?.value;
  const container = document.getElementById('mcContent');
  if (!id) { container.innerHTML = ''; return; }
  const m = await api(`/api/members/${id}`);
  const tags = JSON.parse(m.tags);
  container.innerHTML = `
    <div class="card" style="background:linear-gradient(135deg,var(--pink-500),var(--pink-600));color:#fff;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h2 style="font-size:24px;margin-bottom:4px">${m.name}</h2>
          <p style="opacity:.8;font-size:13px">${tags.map(t=>TAG_LABELS[t]).join(' / ')||'普通会员'}</p>
        </div>
        <div style="text-align:right">
          <div style="font-size:36px;font-weight:700">${m.points}</div>
          <div style="opacity:.8;font-size:12px">可用积分</div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="card" style="text-align:center">
        <div style="font-size:28px;font-weight:700;color:var(--pink-600)">¥${m.total_spent.toLocaleString()}</div>
        <div style="font-size:13px;color:var(--slate-400);margin-top:4px">累计消费</div>
      </div>
      <div class="card" style="text-align:center">
        <div style="font-size:28px;font-weight:700;color:var(--pink-600)">${m.total_orders}</div>
        <div style="font-size:13px;color:var(--slate-400);margin-top:4px">消费次数</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><h3>专属优惠券</h3><span class="badge badge-green">${m.coupons.filter(c=>!c.used).length}张可用</span></div>
      ${m.coupons.map(c=>`
        <div class="coupon-card ${c.used?'used':''}">
          <div><div class="coupon-name">${c.name}</div><div class="coupon-discount">${c.discount} | ${c.expires_at?'至 '+c.expires_at:'永久有效'}</div></div>
          <span class="badge ${c.used?'badge-amber':'badge-green'}">${c.used?'已使用':'可使用'}</span>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <div class="card-header"><h3>消费记录</h3></div>
      ${m.orders.length ? m.orders.slice(0,10).map(o=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--slate-50)">
          <div>
            <div style="font-weight:500">${o.items}</div>
            <div style="font-size:12px;color:var(--slate-400)">${o.created_at?.slice(0,10)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:600;color:var(--slate-700)">¥${o.amount}</div>
            <div style="font-size:12px;color:var(--pink-500)">+${o.points_earned}积分</div>
          </div>
        </div>
      `).join('') : '<div class="empty"><div class="empty-icon">📋</div><p>暂无消费记录</p></div>'}
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>消息通知</h3></div>
      ${m.notifications?.length ? m.notifications.slice(0,5).map(n=>`
        <div class="notif-item ${n.is_read?'':'unread'}">
          <div class="notif-title">${n.title}</div>
          <div class="notif-body">${n.content}</div>
          <div class="notif-time">${n.created_at?.slice(0,16)}</div>
        </div>
      `).join('') : '<div class="empty"><p>暂无消息</p></div>'}
    </div>
  `;
}

// -------- Init --------
render();
