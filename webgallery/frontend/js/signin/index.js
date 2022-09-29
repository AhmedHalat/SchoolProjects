export default {
  form: null,
  error: null,
  service: null,

  init(mainService) {
    this.form = document.getElementById("signin-user-form");
    this.error = document.getElementById("signin-error");
    this.service = mainService;
  },
  submitForm(e) {
    e.preventDefault();

    const username = this.form.username.value;
    const password = this.form.password.value;

    api.signin(username, password, (data, status) => {
      if (status != 200) {
        this.error.innerText = data.message;
        return;
      }
      // Reload the page
      api.updateGalleryUser(username);

      this.service.swapPage("gallery");
      this.service.alert("success", "You have successfully signined!");
    });
  },

  initListeners() {
    this.form.addEventListener("submit", this.submitForm.bind(this));
  },
};
