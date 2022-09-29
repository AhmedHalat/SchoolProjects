import signin from './index.js';
import { getCookie } from '../utils.mjs';

// A user signin Module
export default {
	_path: '',
	_page: null,
	isActive: false,
	signin: null,
	service: null,
	name: 'signin',
	title: 'Sign in',

	init(mainService) {
		this.signin = signin;
		this.service = mainService;
	},
	hidden() {
		return getCookie('username');
	},
	unload() {
		this.isActive = false;
		if (this._page) this._page.remove();
	},
	load(body) {
		this.isActive = true;
		body.innerHTML += this._html();
		this._page = document.getElementById('signin-page');
		this.signin.init(this.service);
		this.signin.initListeners();
	},
	_html() {
		return /* html*/ `
		<div id="signin-page">
			<!-- Form -->
			<div class="container alert hidden" id="alert">
				<button class="form-toggle icon-btn">
					<div class="icon">i</div>
				</button>
				<div class="alert-text">This is the alert content</div>
			</div>
			<div class="form-container container">
				<form id="signin-user-form">
					<div class="form-title">Sign In</div>
					<input type="text" id="username" class="form-element" placeholder="Enter your username" name="username" required />
					<input type="password" id="password" class="form-element" placeholder="Enter your password" name="user_name" required />
					<div id="signin-error" class="form-error"></div>
					<button type="submit" class="btn">Sign In and head to gallery</button>
				</form>
			</div>
		</div>
		`;
	}
}