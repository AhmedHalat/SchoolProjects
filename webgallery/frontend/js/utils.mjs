// A util function module
export function displayAlert(level, message, timeOut) {
  const alert = document.getElementById("alert");
  const alertText = alert.children[1];
  alert.classList.add(level);
  alert.classList.remove("hidden");
  alertText.innerText = message;

  if (timeOut) {
    setTimeout(() => {
      alert.classList.remove(level);
      alert.classList.add("hidden");
    }, timeOut);
  }
}

/**
 * Return the value of the cookie if it exists
 * @param {string} name Document cookie name
 */
export function getCookie(name) {
  for (let cookie of document.cookie.split(";")) {
    const [key, value] = cookie.trim().split("=");
    if (key === name) return value;
  }
  return null;
}

/**
 * Format a date string for visual use
 * @param {String} date ISO 8601 date string
 * @returns a formatted date string
 */
export function formatDate(date) {
  var options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };

  return new Date(date).toLocaleDateString("en-US", options);
}
