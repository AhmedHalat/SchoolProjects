export default {
  form: null,
  error: null,
  service: null,

  init(mainService) {
    this.form = document.getElementById("register-user-form");
    this.error = document.getElementById("register-error");
    this.service = mainService;
  },
  submitForm(e) {
    e.preventDefault();
    const username = this.form.username.value;
    const password = this.form.password.value;

    api.signup(username, password, (data, status) => {
      if (status != 200) {
        this.error.innerText = data.message;
        return;
      }
      api.updateGalleryUser(username);
      // Reload the page
      this.service.swapPage("gallery");
      this.service.alert("success", "You have successfully registered!");
    });
  },

  initListeners() {
    this.form.addEventListener("submit", this.submitForm.bind(this));
  },
};
