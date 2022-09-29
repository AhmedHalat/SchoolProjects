import { initListeners } from "./index.js";
import { getCookie } from "../utils.mjs";

// A user galary Module
export default {
  _path: "",
  _page: null,
  isActive: false,
  title: "Gallery",
  name: "gallery",
  initListeners,

  init() {},
  hidden() {
    return !getCookie("username");
  },
  unload() {
    this.isActive = false;
    if (this._page) this._page.remove();
  },
  load(body) {
    this.isActive = true;
    body.innerHTML += this._html();
    this._page = document.getElementById("gallery-page");
    this.initListeners();
  },
  _html() {
    /* html*/
    return `
		<div id="gallery-page">
			<!-- Form -->
			<div class="form-container container">
				<button class="form-toggle icon-btn" id="image-form-toggle">
					<i class="arrow down"></i>
				</button>
				<div class="form-title" style="margin-left: 54px;margin-top: -32px;">
					Post a new Image to your gallery
				</div>
				<form id="post-image-form" class="hidden">
					<input type="text" id="post_title" class="form-element" placeholder="Enter your post title" name="title" required />
					<input type="file" rows="5" id="post_image" class="form-element" name="user_img" required />
					<button type="submit" class="btn">Submit your Post</button>
				</form>
			</div>
			<div class="container alert hidden" id="alert">
				<button class="form-toggle icon-btn">
					<div class="icon">i</div>
				</button>
				<div class="alert-text">This is the alert content</div>
			</div>
			<!-- Pagination -->
			<div class="pagination top-spacing">
				<button type="button" id="prev-image" class="btn-md icon-btn w-100">
					<i class="arrow left"></i>
				</button>
				<button type="button" id="next-image" class="btn-md icon-btn w-100">
					<i class="arrow right"></i>
				</button>
			</div>
			<!-- Image Gallery -->
			<div id="gallery" class="container">
			</div>
		</div>
		`;
  },
};
