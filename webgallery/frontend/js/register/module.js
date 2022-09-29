import register from './index.js';
import { getCookie } from '../utils.mjs';

// A user Register Module
export default {
	_path: '',
	_page: null,
	isActive: false,
	register: null,
	service: null,
	name: 'register',
	title: 'Register',

	init(mainService) {
		this.register = register;
		this.service = mainService;
	},
	unload() {
		this.isActive = false;
		if (this._page) this._page.remove();
	},
	hidden() {
		return getCookie('username');
	},
	load(body) {
		this.isActive = true;
		body.innerHTML += this._html();
		this._page = document.getElementById('register-page');
		this.register.init(this.service);
		this.register.initListeners();
	},
	_html() {
		return /* html*/ `
		<div id="register-page">
			<!-- Form -->
			<div class="form-container container">
				<form id="register-user-form">
					<div class="form-title">Register as a new User</div>
					<input type="text" id="username" class="form-element" placeholder="Enter your username" name="username" required />
					<input type="password" id="password" class="form-element" placeholder="Enter your password" name="user_name" required />
					<div id="register-error" class="form-error"></div>
					<button type="submit" class="btn">Sign up and head to gallery</button>
				</form>
			</div>
		</div>
		`;
	}
}