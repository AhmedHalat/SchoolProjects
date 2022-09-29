import { displayAlert, formatDate, getCookie } from "../utils.mjs";

export function initListeners() {
  "use strict";

  let imagePage = 0;
  let commentPage = 0;

  // ================================================================
  // ID Formatters
  // ================================================================

  function commentsListId(imageId) {
    return `${imageId}-comments-list`;
  }

  function commentsFormId(imageId) {
    return `${imageId}-comment-form`;
  }

  function commentItemId(commentId) {
    return `post-comment-${commentId}`;
  }

  // ================================================================
  // Comment Event Handlers
  // ================================================================
  /**
   * Add deletion event listeners to an array of rendered comments
   * @param {Array} comments Array of rendered comments
   */
  function addCommentDeletionListeners(comments) {
    // Add event listeners to all comment deletion buttons
    comments.forEach((comment) => {
      const id = commentItemId(comment._id);
      const elm = document.getElementById(id);
      // Add event listener to the delete button
      elm?.querySelector("button.delete-btn")?.addEventListener("click", () => {
        elm.remove();
        api.deleteComment(comment._id, (del, status) => {
          if (status != 200) {
            displayAlert("danger", "Failed to delete comment", 3000);
          }
          // Update the comment paging buttons
          const nextBtn = document.getElementById("next-comment");
          const prevBtn = document.getElementById("prev-comment");
          const imageId = comments[0].imageId;
          const totalPages = Math.ceil(del.remaining / 5);
          // If were not on the first page and this page no longer has any comments
          if (commentPage > totalPages - 1 && totalPages != 0) {
            commentPage--;
          }

          // Disable pagination indicators
          if (commentPage === 0) {
            nextBtn.classList.add("disabled");
          }

          if (commentPage >= totalPages - 1) {
            prevBtn.classList.add("disabled");
          }

          // Re-render the comment to account for page length change
          api.getImageComments(imageId, commentPage, 5, (comments, status) => {
            if (status != 200) {
              return displayAlert(
                "danger",
                "Failed to get image comments",
                3000
              );
            }
            renderComments(imageId, comments.comments);
          });
        });
      });
    });
  }

  /**
   * Add pagination event listeners to the comment list for an image
   * @param {String} imageId The id of the image the comments belong to
   */
  function createCommentsPaginationsListener(imageId) {
    const olderComments = document.getElementById("prev-comment");
    const newerComments = document.getElementById("next-comment");
    newerComments.classList.add("disabled");

    // Check if there are more than 1 page, if not disable the older comments button
    api.getImageComments(imageId, 0, 5, (res, status) => {
      if (status != 200) {
        return displayAlert("danger", "Failed to get image comments", 3000);
      }

      const totalPages = Math.ceil(res.total / 5);
      if (totalPages <= 1) {
        olderComments.classList.add("disabled");
      }

      // Add event listeners to the older and newer comment buttons
      newerComments.addEventListener("click", () => {
        if (newerComments.classList.contains("disabled")) return;
        api.getImageComments(imageId, --commentPage, 5, (res, status) => {
          if (status != 200) {
            return displayAlert("danger", "Failed to get image comments", 3000);
          }

          const totalPages = Math.ceil(res.total / 5);
          if (commentPage === 0) {
            newerComments.classList.add("disabled");
          }

          if (commentPage === totalPages - 1) {
            olderComments.classList.add("disabled");
          }
          // On going to a page of new comments, enable the older comments button
          olderComments.classList.remove("disabled");
          // Render the new page of comments
          renderComments(imageId, res.comments);
        });
      });

      olderComments.addEventListener("click", () => {
        if (olderComments.classList.contains("disabled")) return;
        api.getImageComments(imageId, ++commentPage, 5, (res, status) => {
          if (status != 200) {
            return displayAlert("danger", "Failed to get image comments", 3000);
          }

          const totalPages = Math.ceil(res.total / 5);
          if (commentPage === totalPages - 1) {
            olderComments.classList.add("disabled");
          }
          // On going to a page of old comments, enable the rewer comments button
          newerComments.classList.remove("disabled");
          // Render the new page of comments
          renderComments(imageId, res.comments);
        });
      });
    });
  }

  function removeExtraComments(list, limit) {
    while (list.children.length > limit) {
      list.removeChild(list.lastChild);
    }
  }

  /**
   * Add a comment submission event listener to the rendered image comments list
   * @param {String} imageId The id of the image the comments belong to
   */
  function createImageCommentsListener(imageId) {
    const form = document.getElementById(commentsFormId(imageId));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const content = form.querySelector("textarea[name=content]").value;
      form.reset();

      const commentsList = document.getElementById(commentsListId(imageId));
      // Save and render the new comment
      api.addComment(imageId, content, (res, status) => {
        if (status != 200) {
          return displayAlert("danger", "Failed to add the comment", 3000);
        }

        const totalPages = Math.ceil(res.total / 5);
        if (totalPages > commentPage + 1 && commentsList.children.length >= 5) {
          commentPage++;
          removeExtraComments(commentsList, 5 - 1);
          // Make the back button clickable
          const prevBtn = document.getElementById("prev-comment");
          prevBtn.classList.remove("disabled");
        }

        renderComments(imageId, [res.comment], true);
      });
    });
  }

  // ================================================================
  // Image Post Event Handlers
  // ================================================================

  /**
   * Add an event listener to the delete button of the rendered image
   * @param {String} imageId Id of the rendered image post
   */
  function addPostDeletionListener(imageId) {
    const elm = document.getElementById(imageId);
    elm.querySelector("button.delete-btn").addEventListener("click", () => {
      const nextBtn = document.getElementById("next-image");
      const prevBtn = document.getElementById("prev-image");
      // Get the info of the image being deleted (for pagination)
      api.deleteImage(imageId, (res, status) => {
        if (status != 200) {
          return displayAlert("danger", "Failed to delete the image", 3000);
        }

        const totalPages = res.remaining / 5;

        elm.remove();
        // Update pagination buttons
        if (imagePage === 0) {
          nextBtn.classList.add("disabled");
        }

        if (imagePage > totalPages - 1) {
          prevBtn.classList.add("disabled");
        }

        // Render the last image to the gallery
        api.getImage(imagePage, ({ image }) => addImageToGallery(image));
      });
    });
  }

  /**
   * Create image form event listeners
   */
  function createImageFormListener() {
    const form = document.getElementById("post-image-form");
    form.addEventListener("submit", (e) => {
      // prevent from refreshing the page on submit
      e.preventDefault();
      // read form elements
      const title = document.getElementById("post_title").value;
      const file = document.getElementById("post_image").files[0];
      // clean form
      form.reset();
      // create image
      api.addImage(title, file, (image, status) => {
        if (status != 200) {
          return displayAlert("danger", "Failed to upload the image", 3000);
        }

        addImageToGallery(image);
      });

      api.getImage(0, (res, status) => {
        if (status != 200) {
          return displayAlert("danger", "Failed to get the image posts", 3000);
        }

        const prevImage = document.getElementById("prev-image");

        imagePage = 0;
        if (res.count === 0) {
          prevImage.classList.add("disabled");
        } else {
          prevImage.classList.remove("disabled");
        }
      });
    });
  }

  /**
   * Add the pagination event listeners for the gallery
   */
  function createImagePaginationListener() {
    const nextImage = document.getElementById("next-image");
    const prevImage = document.getElementById("prev-image");
    nextImage.classList.add("disabled");

    api.getImage(0, (res) => {
      if (res.count <= 1) {
        prevImage.classList.add("disabled");
      }

      nextImage.addEventListener("click", goToNextImage);

      prevImage.addEventListener("click", goToPreviousImage);
    });
  }

  /**
   * Create the event listener for toggling the new post form
   */
  function createFormVisibilityListener() {
    const toggle = document.getElementById("image-form-toggle");
    toggle.addEventListener("click", () => {
      const form = document.getElementById("post-image-form");
      // toggle the form visibility
      form.classList.toggle("hidden");
      // Rotate the button icon
      toggle.children[0].classList.toggle("up");
      toggle.children[0].classList.toggle("down");
    });
  }

  // ================================================================
  // HTML Rendering
  // ================================================================

  /**
   * Create the HTML elements for a comment
   * @param {Object} comment the comment to be rendered
   * @returns Rendered HTML for the comment as a string
   */
  function commentHTML(comment) {
    const username = getCookie("username");

    return /*html*/ `
      <div class="post-comment" id="${commentItemId(comment._id)}">
        <div class="post-comment-header">
          <div class="post-meta">
            On
            <span>
              ${formatDate(comment.createdAt)}, ${comment.author}
            </span>
            commented
          </div>
          ${
            comment.author == username || api.getGalleryUser() == username
              ? '<button type="button" class="btn-sm icon-btn delete-btn"></button>'
              : ""
          }

        </div>
        <div class="post-comment-content">
          ${comment.content}
        </div>
      </div>
    `;
  }

  /**
   * Render comments under the image
   * @param {String} imageId The id of the image the comment belongs to
   * @param {Array} comments Array of comments to be rendered
   * @param {Boolean} append Whether to append the comments to the existing ones
   */
  function renderComments(imageId, comments, append) {
    const commentsList = document.getElementById(commentsListId(imageId));
    // Remove all existing comments
    if (!append) {
      commentsList.innerHTML = "";
    }

    // For each comment, render its HTML
    commentsList.innerHTML =
      comments.reverse().map(commentHTML).join("") + commentsList.innerHTML;
    addCommentDeletionListeners(comments);
  }

  /**
   * Renders an image into the gallery and calls all the listeners inits
   * @param {Object} image The image to be rendered
   * @returns {void}
   */
  function addImageToGallery(image) {
    if (!image?.imageId) return;

    // Creating the image element
    const elmt = document.createElement("div");
    elmt.className = "post";
    elmt.id = image.imageId;
    // Fetch the image comments if they exist
    image.comments = image.comments || [];
    const username = getCookie("username");
    // Render the image
    elmt.innerHTML = /*html*/ `
      <div class="post-container">
       <div class="post-header">
          <span class="post-title">${image.title}</span>
          ${
            image.author == username
              ? '<button type="button" class="btn-md icon-btn delete-btn"></button>'
              : ""
          }
        </div>
        <div class="post-content">
          <img src="/api/images/${image._id}/image" alt="${image.title}">
        </div>
        <div class="post-meta">
          Posted By
          <span class="post-author">${image.author}</span>
          On
          <span class="post-date">${formatDate(image.createdAt)}</span>
        </div>
      </div>
      <div class="post-comments">
        <span class="post-comments-title">Comments</span>
        <!-- Pagination -->
        <div class="pagination">
          <button type="button" id="prev-comment" class="btn-md icon-btn">
            <i class="arrow left"></i>
          </button>
          <button type="button" id="next-comment" class="btn-md icon-btn">
            <i class="arrow right"></i>
          </button>
        </div>
        <!-- Comment list -->
        <div class="post-comments-list" id="${commentsListId(image.imageId)}">
          ${image.comments.map(commentHTML).join("")}
        </div>
        <!-- New comment button  -->
        <form class="new-comment-form" id="${commentsFormId(image.imageId)}">
          <span class="post-comments-title">Post a new Comment</span>
          <textarea name="content" class="form-element" placeholder="Your comment" required></textarea>
          <button type="submit" class="btn">Add comment</button>
        </form>
      </div>`;
    // Add the image to the gallery
    document.getElementById("gallery").innerHTML = "";
    document.getElementById("gallery").appendChild(elmt);
    // Add the event listeners for the image and its comments
    createImageCommentsListener(image.imageId);
    createCommentsPaginationsListener(image.imageId);
    addCommentDeletionListeners(image.comments);
    if (image.author == username) addPostDeletionListener(image.imageId);
  }

  // ================================================================
  // Event Handlers Callbacks
  // ================================================================

  /**
   * Callback for handling the next image pagination event
   * @returns {void}
   */
  function goToNextImage() {
    const nextBtn = document.getElementById("next-image");
    const prevBtn = document.getElementById("prev-image");

    if (nextBtn.classList.contains("disabled")) return;

    api.getImage(--imagePage, (res, status) => {
      if (status != 200) {
        return displayAlert("danger", "Failed to get the next image", 3000);
      }

      commentPage = 0;
      if (imagePage === 0) {
        nextBtn.classList.add("disabled");
      }

      prevBtn.classList.remove("disabled");
      addImageToGallery(res.image);
      api.getImageComments(
        res.image.imageId,
        commentPage,
        5,
        (comments, status) => {
          if (status != 200) {
            return displayAlert("danger", "Failed to get image comments", 3000);
          }

          renderComments(res.image.imageId, comments.comments, false);
        }
      );
    });
  }

  /**
   * Callback for handling the previous image pagination event
   * @returns {void}
   */
  function goToPreviousImage() {
    const nextBtn = document.getElementById("next-image");
    const prevBtn = document.getElementById("prev-image");

    if (prevBtn.classList.contains("disabled")) return;

    api.getImage(++imagePage, (res, status) => {
      if (status != 200) {
        return displayAlert("danger", "Failed to get the next image", 3000);
      }

      commentPage = 0;
      if (imagePage === res.count - 1) {
        prevBtn.classList.add("disabled");
      }

      nextBtn.classList.remove("disabled");
      addImageToGallery(res.image);
      api.getImageComments(
        res.image.imageId,
        commentPage,
        5,
        (comments, status) => {
          if (status != 200) {
            return displayAlert("danger", "Failed to get image comments", 3000);
          }

          renderComments(res.image.imageId, comments.comments, false);
        }
      );
    });
  }

  // ================================================================
  // Initialization
  // ================================================================

  createFormVisibilityListener();
  createImageFormListener();
  createImagePaginationListener();
  api.getImage(0, (res, status) => {
    if (status != 200) {
      return displayAlert("danger", "Failed to get the first image", 3000);
    }

    if (res.image) {
      addImageToGallery(res.image);

      api.getImageComments(
        res.image.imageId,
        imagePage,
        5,
        (comments, status) => {
          if (status != 200) {
            return displayAlert("danger", "Failed to get image comments", 3000);
          }

          renderComments(res.image.imageId, comments.comments, false);
        }
      );
    }
  });
}
