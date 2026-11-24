import { useEffect, useState } from 'react';
import { Activity, Building2, Check, Plus, RefreshCw, Save, Settings2, Shield, Tag } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
async function request(path, options = {}) {
  const token = localStorage.getItem('cf_token');
  const response = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

const tabs = [
  ['categories', 'Categories', Tag],
  ['departments', 'Departments', Building2],
  ['settings', 'System settings', Settings2],
  ['permissions', 'Permissions', Shield],
  ['audit', 'Access audit', Activity]
];
const systemOnly = ['departments', 'settings', 'permissions', 'audit'];

export default function AdminConsole({ user }) {
  const [tab, setTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [settings, setSettings] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const system = user.role === 'SYSTEM_ADMIN';
  const available = tabs.filter(([key]) => !systemOnly.includes(key) || system);

  async function load() {
    setError('');
    try {
      if (tab === 'departments') {
        const data = await request('/admin/departments');
        setDepartments(data.departments || []);
      }
      if (tab === 'categories') {
        const data = await request('/admin/categories');
        setCategories(data.categories || []);
      }
      if (tab === 'settings') {
        const data = await request('/admin/settings');
        setSettings({
          allow_registration: 'true',
          max_upload_mb: '15',
          ...Object.fromEntries((data.settings || []).map(item => [item.setting_key, item.setting_value]))
        });
      }
      if (tab === 'permissions') {
        const data = await request('/admin/permissions');
        setPermissions(data.permissions || []);
      }
      if (tab === 'audit') {
        const data = await request('/admin/audit-logs?limit=100');
        setLogs(data.logs || []);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, [tab]);

  async function run(action, successMessage) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addDepartment(e) {
    e.preventDefault();
    await run(() => request('/admin/departments', { method: 'POST', body: JSON.stringify({ name }) }), 'Department created');
    setName('');
  }

  async function renameDepartment(department) {
    const next = window.prompt('Department name', department.name);
    if (!next || next.trim() === department.name) return;
    await run(() => request('/admin/departments/' + department.department_id, { method: 'PATCH', body: JSON.stringify({ name: next.trim() }) }), 'Department updated');
  }

  async function addCategory(e) {
    e.preventDefault();
    await run(() => request('/admin/categories', { method: 'POST', body: JSON.stringify({ name, description }) }), 'Category created');
    setName('');
    setDescription('');
  }

  async function toggleCategory(category) {
    await run(() => request('/admin/categories/' + category.category_id, {
      method: 'PATCH', body: JSON.stringify({ is_active: !category.is_active })
    }), 'Category updated');
  }

  async function saveSettings(e) {
    e.preventDefault();
    await run(() => request('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }), 'System settings saved');
  }

  async function togglePermission(permission) {
    await run(() => request('/admin/permissions', {
      method: 'PUT',
      body: JSON.stringify({ role: permission.role, permission: permission.permission, allowed: !permission.allowed })
    }), 'Permission updated');
  }

  return <>
    <div className="page-heading">
      <div><span className="kicker">CONTROL CENTRE</span><h1>Administration</h1><p>Manage departments, categories, system policies and access oversight.</p></div>
      <button className="primary" onClick={load}><RefreshCw size={15}/> Refresh</button>
    </div>
    <div className="admin-tabs">
      {available.map(([key, label, Icon]) => <button key={key} className={tab === key ? 'admin-tab active' : 'admin-tab'} onClick={() => { setTab(key); setError(''); setNotice(''); }}>
        <Icon size={16}/>{label}
      </button>)}
    </div>
    {error && <div className="error">{error}</div>}
    {notice && <div className="admin-notice"><Check size={15}/>{notice}</div>}

    {tab === 'departments' && <>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Academic departments</h2><p>Create and rename departments used by student, faculty and project records.</p></div><span>{departments.length} departments</span></div>
        <form className="category-form" onSubmit={addDepartment}>
          <label>Department name<input required maxLength="100" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Computer Engineering"/></label>
          <span></span><button className="primary" disabled={busy}><Plus size={15}/> Add department</button>
        </form>
      </section>
      <section className="admin-panel"><div className="admin-table-wrap"><table><thead><tr><th>Department</th><th>Department ID</th><th></th></tr></thead><tbody>
        {departments.map(department => <tr key={department.department_id}><td><strong>{department.name}</strong></td><td>{department.department_id}</td><td><button className="admin-action" disabled={busy} onClick={() => renameDepartment(department)}>Rename</button></td></tr>)}
      </tbody></table></div>{!departments.length && <p className="admin-empty">No departments found.</p>}</section>
    </>}

    {tab === 'categories' && <>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Project categories</h2><p>Organize projects into department-specific categories.</p></div><span>{categories.length} categories</span></div>
        <form className="category-form" onSubmit={addCategory}>
          <label>Category name<input required maxLength="80" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Web Development"/></label>
          <label>Description<input maxLength="500" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description"/></label>
          <button className="primary" disabled={busy}><Plus size={15}/> Add category</button>
        </form>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Available categories</h2><p>Inactive categories remain attached to historical records.</p></div></div>
        {categories.length ? <div className="admin-table-wrap"><table><thead><tr><th>Category</th><th>Description</th>{system && <th>Department</th>}<th>Status</th><th></th></tr></thead><tbody>
          {categories.map(category => <tr key={category.category_id}><td><strong>{category.name}</strong></td><td>{category.description || '—'}</td>{system && <td>{category.department_name || 'Global'}</td>}<td><span className={category.is_active ? 'admin-status active' : 'admin-status'}>{category.is_active ? 'Active' : 'Inactive'}</span></td><td><button className="admin-action" disabled={busy} onClick={() => toggleCategory(category)}>{category.is_active ? 'Deactivate' : 'Activate'}</button></td></tr>)}
        </tbody></table></div> : <p className="admin-empty">No categories created yet.</p>}
      </section>
    </>}

    {tab === 'settings' && <form className="admin-panel settings-form" onSubmit={saveSettings}>
      <div className="admin-panel-head"><div><h2>System configuration</h2><p>These settings are stored centrally and can be changed by system administrators.</p></div></div>
      <label>Allow new registrations<select value={settings.allow_registration ?? 'true'} onChange={e => setSettings({ ...settings, allow_registration: e.target.value })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
      <label>Maximum upload size (MB)<input type="number" min="1" max="100" value={settings.max_upload_mb ?? '15'} onChange={e => setSettings({ ...settings, max_upload_mb: e.target.value })}/></label>
      <button className="primary" disabled={busy}><Save size={15}/> Save configuration</button>
    </form>}

    {tab === 'permissions' && <section className="admin-panel">
      <div className="admin-panel-head"><div><h2>Role permissions</h2><p>Configure capabilities currently controlled by the permission service.</p></div></div>
      <div className="admin-table-wrap"><table><thead><tr><th>Role</th><th>Permission</th><th>Access</th><th></th></tr></thead><tbody>
        {permissions.map(permission => <tr key={permission.role + permission.permission}><td>{permission.role.replaceAll('_', ' ')}</td><td><code>{permission.permission}</code></td><td><span className={permission.allowed ? 'admin-status active' : 'admin-status'}>{permission.allowed ? 'Allowed' : 'Blocked'}</span></td><td><button className="admin-action" disabled={busy} onClick={() => togglePermission(permission)}>{permission.allowed ? 'Revoke' : 'Allow'}</button></td></tr>)}
      </tbody></table></div>
    </section>}

    {tab === 'audit' && <section className="admin-panel">
      <div className="admin-panel-head"><div><h2>System access audit</h2><p>Recent authentication and administrative actions.</p></div><span>{logs.length} records</span></div>
      <div className="admin-table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Details</th><th>IP address</th></tr></thead><tbody>
        {logs.map(log => <tr key={log.audit_id}><td>{new Date(log.created_at + 'Z').toLocaleString('en-IN')}</td><td>{log.user_name || 'System'}<small>{log.user_role || ''}</small></td><td><code>{log.action}</code></td><td>{log.resource_type}{log.resource_id ? ' · ' + log.resource_id : ''}</td><td>{log.details || '—'}</td><td>{log.ip_address || '—'}</td></tr>)}
      </tbody></table></div>
      {!logs.length && <p className="admin-empty">No audit events have been recorded yet.</p>}
    </section>}
  </>;
}
