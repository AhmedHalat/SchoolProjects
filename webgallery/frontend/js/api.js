var api = (function () {
  var module = {};
  let username = null;

  /*  ******* Data types *******
      image objects must have at least the following attributes:
          - (String) _id
          - (String) title
          - (String) author
          - (Date) date

      comment objects must have the following attributes
          - (String) _id
          - (String) imageId
          - (String) author
          - (String) content
          - (Date) date

  ****************************** */

  function sendRequest(method, url, data, callback, form) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onload = function () {
      if (callback) {
        if (xhr.status === 200) {
          return callback(JSON.parse(xhr.responseText), xhr.status);
        } else {
          try {
            return callback(JSON.parse(xhr.responseText), xhr.status);
          } catch (e) {
            return callback(xhr.responseText, xhr.status);
          }
        }
      }
    };

    if (form) {
      xhr.send(data);
    } else if (data) {
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(data));
    } else {
      xhr.send();
    }
  }

  // return current page, and number of total pages
  module.getImageComments = function (imageId, page, limit, callback) {
    sendRequest('GET', `/api/images/${imageId}/comments?page=${page}&limit=${limit}`, null, callback);
  };

  // add an image to the gallery
  // just return the image
  module.addImage = function (title, file, callback) {
    let formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);

    sendRequest('POST', '/api/images', formData, (data, status) => {
      if (status === 200) {
        data.imageId = data._id;
        callback(data, status);
      } else {
        callback(data, status);
      }
    }, true);
  };

  // get an image from the gallery
  // return total number of images
  module.getImage = function (page, callback) {
    sendRequest('GET', `/api/images?page=${page}&username=${username}`, null, (data, status) => {
      if (!data.image?._id) {
        return callback(data, status);
      }
      data.image.imageId = data.image._id;
      callback(data, status);
    });
  };

  // get all usernames
  module.getUsers = function (callback) {
    sendRequest('GET', '/api/users', null, callback);
  };


  // delete an image from the gallery given its imageId
  // return number of images remaining
  module.deleteImage = function (imageId, callback) {
    sendRequest('DELETE', `/api/images/${imageId}`, null, callback);
  };

  // add a comment to an image
  // just return the comment
  module.addComment = function (imageId, content, callback) {
    sendRequest('POST', `/api/images/${imageId}/comments`, { content }, callback);
  };

  // delete a comment to an image
  // TODO: return the number of remaining comments
  module.deleteComment = function (commentId, callback) {
    sendRequest('DELETE', `/api/comments/${commentId}`, null, callback);
  };

  module.signup = function (username, password, callback) {
    sendRequest('POST', '/signup/', { username, password }, callback);
  };

  module.signin = function (username, password, callback) {
    sendRequest('POST', '/signin/', { username, password }, callback);
  };

  module.signout = function () {
    sendRequest('GET', '/signout/');
    username = null;
  };

  // The user that the gallery belongs to
  module.updateGalleryUser = function (_username) {
    username = _username;
  };

  module.getGalleryUser = function () {
    return username;
  };

  return module;
})();