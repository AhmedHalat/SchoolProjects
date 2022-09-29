import { getCookie } from "../utils.mjs";

export default {
  service: null,
  isActive: false,
  name: "signout",
  title: "Sign out",

  init(mainService) {
    this.service = mainService;
  },
  unload() {},
  hidden() {
    return !getCookie("username");
  },
  load() {
    api.signout();
    // Delete the token from cookies

    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    this.service.swapPage("signin");
    this.service.alert("success", "You have Been Signout out!");
  },
};
