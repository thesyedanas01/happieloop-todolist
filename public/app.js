/* ═══════════════════════════════════════════════════════════════════
   HappieLoop — Frontend Application Logic & Multi-User Auth + Profile
   ═══════════════════════════════════════════════════════════════════ */

// ─── Toast Notifications ─────────────────────────────────────────────
class Toast {
  static container = document.getElementById('toast-container');

  static show(message, type = 'success', duration = 2500) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    Toast.container.appendChild(el);

    setTimeout(() => {
      el.classList.add('toast--exiting');
      el.addEventListener('animationend', () => el.remove());
    }, duration);
  }
}

// ─── API Base URL Configuration ──────────────────────────────────────
const API_BASE = window.API_BASE || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : (window.location.origin.includes('vercel.app') 
        ? (localStorage.getItem('HAPPIELOOP_API_URL') || 'https://happieloop-todolist.onrender.com')
        : '')
);

// ─── Authentication Service ──────────────────────────────────────────
class AuthService {
  static TOKEN_KEY = 'happieloop_auth_token';
  static USER_KEY = 'happieloop_auth_user';

  static getToken() {
    return localStorage.getItem(AuthService.TOKEN_KEY);
  }

  static getUser() {
    const userJson = localStorage.getItem(AuthService.USER_KEY);
    try {
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  static setSession(token, user) {
    localStorage.setItem(AuthService.TOKEN_KEY, token);
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  static clearSession() {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.USER_KEY);
  }

  static isAuthenticated() {
    return !!AuthService.getToken();
  }

  static async register(email, username, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    return res.json();
  }

  static async login(identifier, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    return res.json();
  }

  static async getProfile() {
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      headers: {
        Authorization: `Bearer ${AuthService.getToken()}`,
      },
    });
    return res.json();
  }

  static async updateProfile(fullName, username) {
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AuthService.getToken()}`,
      },
      body: JSON.stringify({ fullName, username }),
    });
    return res.json();
  }

  static async changePassword(currentPassword, newPassword) {
    const res = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AuthService.getToken()}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res.json();
  }
}

// ─── Task API Service (Authenticated) ────────────────────────────────
class TaskAPI {
  static BASE = `${API_BASE}/api/tasks`;

  static getHeaders() {
    const token = AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  static async getAll() {
    const res = await fetch(TaskAPI.BASE, {
      headers: TaskAPI.getHeaders(),
    });
    return res.json();
  }

  static async create(title) {
    const res = await fetch(TaskAPI.BASE, {
      method: 'POST',
      headers: TaskAPI.getHeaders(),
      body: JSON.stringify({ title }),
    });
    return res.json();
  }

  static async update(id, data) {
    const res = await fetch(`${TaskAPI.BASE}/${id}`, {
      method: 'PATCH',
      headers: TaskAPI.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async clearFromAll() {
    const res = await fetch(`${TaskAPI.BASE}/clear-from-all`, {
      method: 'POST',
      headers: TaskAPI.getHeaders(),
    });
    return res.json();
  }

  static async remove(id) {
    const res = await fetch(`${TaskAPI.BASE}/${id}`, {
      method: 'DELETE',
      headers: TaskAPI.getHeaders(),
    });
    return res.json();
  }
}

// ─── Main Controller & Router ────────────────────────────────────────
class App {
  constructor() {
    // Task state
    this.tasks = [];
    this.filter = 'all'; // 'all' | 'active' | 'completed'

    // DOM Elements - Views
    this.viewLogin = document.getElementById('view-login');
    this.viewRegister = document.getElementById('view-register');
    this.viewTasks = document.getElementById('view-tasks');
    this.viewProfile = document.getElementById('view-profile');
    this.views = [this.viewLogin, this.viewRegister, this.viewTasks, this.viewProfile];

    // DOM Elements - Navbar
    this.navGuest = document.getElementById('nav-guest');
    this.navAuth = document.getElementById('nav-auth');
    this.navUsername = document.getElementById('nav-username');
    this.navAvatar = document.getElementById('nav-avatar');
    this.navLogoutBtn = document.getElementById('nav-logout-btn');

    // DOM Elements - Auth Forms
    this.loginForm = document.getElementById('login-form');
    this.loginIdentifier = document.getElementById('login-identifier');
    this.loginPassword = document.getElementById('login-password');

    this.registerForm = document.getElementById('register-form');
    this.registerEmail = document.getElementById('register-email');
    this.registerPassword = document.getElementById('register-password');
    this.registerUsername = document.getElementById('register-username');

    // DOM Elements - Tasks Dashboard
    this.userDisplayName = document.getElementById('user-display-name');
    this.userAvatarInitial = document.getElementById('user-avatar-initial');
    this.userWelcomeSub = document.getElementById('user-welcome-sub');

    this.addTaskForm = document.getElementById('add-task-form');
    this.taskInput = document.getElementById('task-input');
    this.taskList = document.getElementById('task-list');
    this.emptyState = document.getElementById('empty-state');
    this.emptyStateHeading = document.getElementById('empty-state-heading');
    this.emptyStateText = document.getElementById('empty-state-text');
    this.taskCounter = document.getElementById('task-counter');
    this.clearCompletedBtn = document.getElementById('clear-completed-btn');
    this.filterBtns = document.querySelectorAll('.filter-pill');

    // DOM Elements - Profile View
    this.profileAvatarLarge = document.getElementById('profile-avatar-large');
    this.profileDisplayHeading = document.getElementById('profile-display-heading');
    this.profileInfoForm = document.getElementById('profile-info-form');
    this.profileFullname = document.getElementById('profile-fullname');
    this.profileUsername = document.getElementById('profile-username');
    this.profileEmail = document.getElementById('profile-email');
    this.profilePasswordForm = document.getElementById('profile-password-form');
    this.passwordCurrent = document.getElementById('password-current');
    this.passwordNew = document.getElementById('password-new');
    this.passwordConfirm = document.getElementById('password-confirm');

    this.bindEvents();
    this.handleRoute();
  }

  // ── Event Listeners ────────────────────────────────────────────────
  bindEvents() {
    // Router change
    window.addEventListener('hashchange', () => this.handleRoute());

    // Auth actions
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    this.navLogoutBtn.addEventListener('click', () => this.handleLogout());

    // Task actions
    this.addTaskForm.addEventListener('submit', (e) => this.handleAddTask(e));
    this.filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
    });
    this.clearCompletedBtn.addEventListener('click', () => this.handleClearCompletedFromAll());

    // Profile actions
    this.profileInfoForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
    this.profilePasswordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
  }

  // ── Helper to switch active view ───────────────────────────────────
  showView(targetView) {
    this.views.forEach((v) => {
      v.classList.remove('is-active');
      v.style.display = 'none';
    });
    targetView.style.display = 'flex';
    targetView.classList.add('is-active');
  }

  // ── Router & View Switcher ─────────────────────────────────────────
  handleRoute() {
    const hash = window.location.hash.toLowerCase() || '#home';
    const isAuth = AuthService.isAuthenticated();
    const currentUser = AuthService.getUser();

    // Update navbar state
    if (isAuth && currentUser) {
      this.navGuest.style.display = 'none';
      this.navAuth.style.display = 'flex';
      const displayName = currentUser.fullName || currentUser.username;
      this.navUsername.textContent = displayName;
      if (this.navAvatar) {
        this.navAvatar.textContent = displayName.charAt(0).toUpperCase();
      }
    } else {
      this.navGuest.style.display = 'flex';
      this.navAuth.style.display = 'none';
    }

    // Route logic
    if (hash === '#register') {
      if (isAuth) {
        window.location.hash = '#tasks';
        return;
      }
      this.showView(this.viewRegister);
      this.registerEmail.focus();
    } else if (hash === '#profile') {
      if (!isAuth) {
        window.location.hash = '#login';
        return;
      }
      this.showView(this.viewProfile);
      this.loadProfile();
    } else if (hash === '#tasks') {
      if (!isAuth) {
        window.location.hash = '#login';
        return;
      }
      this.showView(this.viewTasks);
      this.setupTaskDashboard(currentUser);
      this.loadUserTasks();
    } else {
      // Default: #login or #home
      if (isAuth) {
        window.location.hash = '#tasks';
      } else {
        this.showView(this.viewLogin);
        this.loginIdentifier.focus();
      }
    }
  }

  // ── Auth Handlers ──────────────────────────────────────────────────
  async handleLogin(e) {
    e.preventDefault();
    const identifier = this.loginIdentifier.value.trim();
    const password = this.loginPassword.value;

    if (!identifier || !password) return;

    const submitBtn = document.getElementById('login-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const res = await AuthService.login(identifier, password);
      if (!res.success) {
        throw new Error(res.error || 'Failed to log in');
      }

      AuthService.setSession(res.data.token, res.data.user);
      Toast.show(`Welcome back, ${res.data.user.username}!`, 'success');
      this.loginForm.reset();
      window.location.hash = '#tasks';
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const email = this.registerEmail.value.trim();
    const password = this.registerPassword.value;
    const username = this.registerUsername.value.trim();

    if (!email || !password || !username) return;

    const submitBtn = document.getElementById('register-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      const res = await AuthService.register(email, username, password);
      if (!res.success) {
        throw new Error(res.error || 'Registration failed');
      }

      AuthService.setSession(res.data.token, res.data.user);
      Toast.show(`Account created! Welcome, ${res.data.user.username}!`, 'success');
      this.registerForm.reset();
      window.location.hash = '#tasks';
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  }

  handleLogout() {
    AuthService.clearSession();
    this.tasks = [];
    Toast.show('Logged out successfully', 'success');
    window.location.hash = '#login';
  }

  // ── Profile Management ─────────────────────────────────────────────
  async loadProfile() {
    try {
      const res = await AuthService.getProfile();
      if (!res.success) {
        if (res.error && res.error.includes('expired')) {
          this.handleLogout();
          return;
        }
        throw new Error(res.error || 'Failed to load profile');
      }

      const user = res.data;
      const initial = (user.fullName || user.username).charAt(0).toUpperCase();
      this.profileAvatarLarge.textContent = initial;
      this.profileDisplayHeading.textContent = user.fullName || user.username;

      this.profileFullname.value = user.fullName || '';
      this.profileUsername.value = user.username;
      this.profileEmail.value = user.email; // Read-only greyish box
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  }

  async handleProfileUpdate(e) {
    e.preventDefault();
    const fullName = this.profileFullname.value.trim();
    const username = this.profileUsername.value.trim();

    if (!username) {
      Toast.show('Username cannot be empty', 'error');
      return;
    }

    const saveBtn = document.getElementById('profile-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const res = await AuthService.updateProfile(fullName, username);
      if (!res.success) throw new Error(res.error);

      // Update session storage and header
      const currentUser = AuthService.getUser();
      const updatedUser = {
        ...currentUser,
        fullName: res.data.fullName,
        username: res.data.username,
      };
      localStorage.setItem(AuthService.USER_KEY, JSON.stringify(updatedUser));

      // Refresh UI display
      const displayName = updatedUser.fullName || updatedUser.username;
      this.navUsername.textContent = displayName;
      this.navAvatar.textContent = displayName.charAt(0).toUpperCase();
      this.profileAvatarLarge.textContent = displayName.charAt(0).toUpperCase();
      this.profileDisplayHeading.textContent = displayName;

      Toast.show('Profile updated successfully!');
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }

  async handlePasswordChange(e) {
    e.preventDefault();
    const currentPassword = this.passwordCurrent.value;
    const newPassword = this.passwordNew.value;
    const confirmPassword = this.passwordConfirm.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      Toast.show('New password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show('New passwords do not match', 'error');
      return;
    }

    const changeBtn = document.getElementById('password-change-btn');
    changeBtn.disabled = true;
    changeBtn.textContent = 'Updating...';

    try {
      const res = await AuthService.changePassword(currentPassword, newPassword);
      if (!res.success) throw new Error(res.error);

      this.profilePasswordForm.reset();
      Toast.show('Password changed successfully!');
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      changeBtn.disabled = false;
      changeBtn.textContent = 'Update Password';
    }
  }

  // ── Task Management ────────────────────────────────────────────────
  setupTaskDashboard(user) {
    if (!user) return;
    const name = user.fullName || user.username;
    this.userDisplayName.textContent = name;
    this.userAvatarInitial.textContent = name.charAt(0).toUpperCase();
    this.userWelcomeSub.textContent = `Welcome back! You have active tasks below.`;
  }

  async loadUserTasks() {
    this.taskList.innerHTML = '<li style="text-align:center; padding: 1.5rem; color:#94a3b8;">Loading your tasks...</li>';
    try {
      const res = await TaskAPI.getAll();
      if (!res.success) {
        if (res.error && res.error.includes('expired')) {
          this.handleLogout();
          return;
        }
        throw new Error(res.error || 'Failed to load tasks');
      }
      this.tasks = res.data;
      this.renderTasks();
    } catch (err) {
      Toast.show(err.message, 'error');
      this.tasks = [];
      this.renderTasks();
    }
  }

  async handleAddTask(e) {
    e.preventDefault();
    const title = this.taskInput.value.trim();
    if (!title) return;

    try {
      const res = await TaskAPI.create(title);
      if (!res.success) throw new Error(res.error);

      this.tasks.unshift(res.data);
      this.taskInput.value = '';
      this.taskInput.focus();
      this.renderTasks();
      Toast.show('Task added!');
    } catch (err) {
      Toast.show(err.message || 'Error adding task', 'error');
    }
  }

  async toggleTask(id) {
    const task = this.tasks.find((t) => t._id === id);
    if (!task) return;

    const targetCompleted = !task.completed;
    task.completed = targetCompleted;
    if (!targetCompleted) {
      task.hiddenFromAll = false;
    }
    this.renderTasks();

    try {
      const res = await TaskAPI.update(id, { completed: targetCompleted });
      if (!res.success) throw new Error(res.error);
      
      // Update local task properties
      task.completed = res.data.completed;
      task.completedAt = res.data.completedAt;
      task.hiddenFromAll = res.data.hiddenFromAll;
      this.renderTasks();
      
      if (targetCompleted) {
        Toast.show('Task completed!', 'success');
      }
    } catch (err) {
      task.completed = !targetCompleted; // Rollback
      this.renderTasks();
      Toast.show('Failed to update task status', 'error');
    }
  }

  async deleteTask(id) {
    const el = this.taskList.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.add('task-item--removing');
      await new Promise((r) => setTimeout(r, 200));
    }

    try {
      const res = await TaskAPI.remove(id);
      if (!res.success) throw new Error(res.error);

      this.tasks = this.tasks.filter((t) => t._id !== id);
      this.renderTasks();
      Toast.show('Task deleted');
    } catch (err) {
      if (el) el.classList.remove('task-item--removing');
      Toast.show('Failed to delete task', 'error');
    }
  }

  // Clear completed tasks ONLY from "All" section view (preserves them in "Completed" tab)
  async handleClearCompletedFromAll() {
    const visibleCompleted = this.tasks.filter((t) => t.completed && !t.hiddenFromAll).length;
    if (visibleCompleted === 0) return;

    try {
      const res = await TaskAPI.clearFromAll();
      if (!res.success) throw new Error(res.error);

      this.tasks.forEach((t) => {
        if (t.completed) t.hiddenFromAll = true;
      });
      this.renderTasks();
      Toast.show('Cleared completed tasks');
    } catch (err) {
      Toast.show('Failed to clear tasks', 'error');
    }
  }

  setFilter(filter) {
    this.filter = filter;
    this.filterBtns.forEach((btn) => {
      btn.classList.toggle('filter-pill--active', btn.dataset.filter === filter);
    });
    this.renderTasks();
  }

  getFilteredTasks() {
    switch (this.filter) {
      case 'active':
        return this.tasks.filter((t) => !t.completed);
      case 'completed':
        return this.tasks.filter((t) => Boolean(t.completed));
      default:
        return this.tasks.filter((t) => !t.hiddenFromAll);
    }
  }

  // ── Render Tasks ───────────────────────────────────────────────────
  renderTasks() {
    const filtered = this.getFilteredTasks();
    const activeCount = this.tasks.filter((t) => !t.completed).length;
    const completedCount = this.tasks.filter((t) => t.completed).length;
    const completedVisibleInAll = this.tasks.filter((t) => t.completed && !t.hiddenFromAll).length;

    this.taskList.innerHTML = '';
    filtered.forEach((task) => {
      this.taskList.appendChild(this.createTaskElement(task));
    });

    // Empty state handling
    if (filtered.length === 0) {
      this.emptyState.style.display = 'flex';
      if (this.tasks.length === 0) {
        this.emptyStateHeading.textContent = 'No tasks yet';
        this.emptyStateText.textContent = 'Add your first task above to get started!';
      } else if (this.filter === 'active') {
        this.emptyStateHeading.textContent = 'All active tasks done!';
        this.emptyStateText.textContent = 'You have completed all pending tasks 🎉 Check the "Completed" tab!';
      } else if (this.filter === 'completed') {
        this.emptyStateHeading.textContent = 'No completed tasks';
        this.emptyStateText.textContent = 'Tasks you complete will stay here until 12:00 midnight.';
      } else {
        this.emptyStateHeading.textContent = 'All caught up!';
        this.emptyStateText.textContent = 'No active tasks to show.';
      }
    } else {
      this.emptyState.style.display = 'none';
    }

    // Counter badge text based on active filter
    if (this.filter === 'completed') {
      this.taskCounter.textContent = `${completedCount} completed task${completedCount !== 1 ? 's' : ''}`;
    } else if (this.filter === 'active') {
      this.taskCounter.textContent = `${activeCount} active task${activeCount !== 1 ? 's' : ''}`;
    } else {
      this.taskCounter.textContent = `${activeCount} active, ${completedCount} completed`;
    }

    // Clear completed button: only shows in "All" view when there are completed tasks visible in All
    if (this.filter === 'all' && completedVisibleInAll > 0) {
      this.clearCompletedBtn.style.display = 'inline-block';
      this.clearCompletedBtn.textContent = 'Clear completed';
    } else {
      this.clearCompletedBtn.style.display = 'none';
    }
  }

  createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' task-item--completed' : ''}`;
    li.dataset.id = task._id;

    li.innerHTML = `
      <label class="task-checkbox-label" title="Toggle task completion">
        <input type="checkbox" class="task-checkbox-input" ${task.completed ? 'checked' : ''} />
        <span class="task-checkmark">
          <svg viewBox="0 0 14 14"><polyline points="2 7 5.5 10.5 12 3.5"/></svg>
        </span>
      </label>
      <span class="task-title">${this.escapeHTML(task.title)}</span>
      <button class="task-btn-delete" title="Delete task" aria-label="Delete task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    // Toggle checkbox
    const checkbox = li.querySelector('.task-checkbox-input');
    checkbox.addEventListener('change', () => this.toggleTask(task._id));

    // Delete button
    const deleteBtn = li.querySelector('.task-btn-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteTask(task._id);
    });

    return li;
  }

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
