import gallery from './gallery/module.js';
import register from './register/module.js';
import signout from './signout/module.js';
import signin from './signin/module.js';
import users from './users/module.js';

import {
  displayAlert,
  getCookie
} from './utils.mjs';

export default {
  body: document.getElementById('page-body'),
  nav: document.getElementById('page-nav'),
  defaultPage: null,
  activePage: null,
  pages: {
    gallery,
    users,
    signin,
    signout,
    register,
  },

  init() {
    this.setUser();
    Object.values(this.pages).forEach(page => page.init(this));
    if (this.pages.gallery.hidden()) this.defaultPage = this.pages.signin;
    else this.defaultPage = this.pages.gallery;

    this.loadPage();
    this.loadNav();
  },
  setUser() {
    const username = getCookie('username');
    if (username) {
      api.updateGalleryUser(username);
    }
  },
  loadPage() {
    // Load the gallery page
    let pageLoaded = false;
    Object.values(this.pages).forEach(page => {
      if (!page.isActive) return;

      page.load(this.body);
      this.activePage = page;
      pageLoaded = true;
    });

    if (!pageLoaded) {
      this.defaultPage.load(this.body);
      this.activePage = this.defaultPage;
      this.loadNav();
    }
  },
  swapPage(name) {
    const newPage = this.pages[name];
    if (newPage == this.activePage) return;

    Object.values(this.pages).forEach(page => {
      if (page != newPage)
        page.unload();
    });

    newPage.isActive = true;
    this.activePage = newPage;
    newPage.load(this.body);
    this.loadNav();
  },
  alert(level, message, timeOut=3000) {
    displayAlert(level, message, timeOut);
  },
  loadNav() {
    this.nav.innerHTML = this.navBar();
    this.initListeners();
  },
  initListeners() {
    this.nav.querySelectorAll('button').forEach(link => {
      link.addEventListener('click', () => {
        this.swapPage(link.dataset.page);
      });
    });
  },
  navBar() {
    return /* html */ `
      <div class="container navigation" id="nav">
        <div class="nav-item">
          ${
            Object.values(this.pages).map(this._navItem.bind(this)).join('')
          }
        </div>
		  </div>
    `;
  },
  _navItem(page) {
    if (page.hidden()) return '';

    return /* html */ `
      <button class="nav-btn btn ${page.isActive ? 'active' : '' }" data-page="${page.name}">
        <i class="icon-${page.icon}"></i>
        <div>${page.title}</div>
      </button>
    `;
  }
};