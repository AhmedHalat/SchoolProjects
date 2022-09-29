import { getCookie } from "../utils.mjs";

// This module is for loading the list of user modules
export default {
  service: null,
  users: [],
  isActive: false,
  _page: null,
  name: "users",
  title: "User Galleries",

  init(mainService) {
    this.service = mainService;
  },
  hidden() {
    return !getCookie("username");
  },
  unload() {
    this.isActive = false;
    if (this._page) this._page.remove();
  },
  load(body) {
    this.isActive = true;
    api.getUsers((data, status) => {
      if (status != 200) {
        this.service.alert("danger", data.message);
        return;
      }

      this.users = data;
      body.innerHTML += this._html();
      this._page = document.getElementById("user-galleries");

      this._page.querySelectorAll("a").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          api.updateGalleryUser(item.dataset.username);
          this.service.swapPage("gallery");
        });
      });
    });
  },
  _html() {
    return /*html*/ `
			<div class="container" id="user-galleries">
			  <h3> User Galleries </h3>
				<div> Check out the other user galleries below </div>
				<ul class="list-group" id="galleries-list">
				${this.users.map(this._userGallery.bind(this)).join("")}
				</ul>
			</div>
		`;
  },
  _userGallery(username) {
    return /*html*/ `
			<li class="list-group-item">
				<a href="" data-username="${username}">
					${username}
				</a>
			</li>
		`;
  },
};
