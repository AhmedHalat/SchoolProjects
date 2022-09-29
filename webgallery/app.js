const bodyParser = require("body-parser");
const multer = require("multer");
const Datastore = require("nedb");
const express = require("express");
const app = express();

const cookie = require("cookie");
const bcrypt = require("bcrypt");
const session = require("express-session");

const comments = new Datastore({
  filename: "db/comments.db",
  autoload: true,
  timestampData: true,
});

const images = new Datastore({
  filename: "db/images.db",
  autoload: true,
  timestampData: true,
});

const users = new Datastore({
  filename: "db/users.db",
  autoload: true,
});

const upload = multer({
  dest: "uploads/",
});

const saltRounds = 10;

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());

app.use(express.static("frontend"));

app.use(
  session({
    // Set the secret to a UUID4 string
    secret: "a4d8c6f5-e2a3-40ca-aa84-0b2b0e1e5fc0",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(function (req, res, next) {
  if (req.session?.username) {
    req.username = req.session.username;
    users.findOne({ _id: req.session.username }, (err, user) => {
      if (err || !user) req.user = null;
      else req.user = user;
      next();
    });
  } else {
    next();
  }

  console.log("HTTP request", req.method, req.url, req.body);
});

const Comment = (function () {
  return function item(comment) {
    this.content = comment.content;
    this.author = comment.author;
    this.imageId = comment.imageId;
    this.upvote = 0;
    this.downvote = 0;
  };
})();

function hashPassword(password, callback) {
  bcrypt.hash(password, saltRounds, callback);
}

function compareHash(pass, hash, callback) {
  bcrypt.compare(pass, hash, callback);
}

function setCookie(res, userId) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("username", userId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
  );
}

var isAuthenticated = function (req, res, next) {
  if (!req.session.username)
    return res.status(401).json({ message: "access denied" });
  next();
};

// Get profile image
app.get(
  "/api/images/:imageId/image",
  isAuthenticated,
  function (req, res, next) {
    images.findOne(
      {
        _id: req.params.imageId,
      },
      function (err, image) {
        if (!image) return res.status(404).send("User not found");
        // Get the post image
        res.setHeader("Content-Type", image.image.mimetype);
        res.sendFile(image.image.path, {
          root: __dirname,
        });
      }
    );
  }
);

// Create
app.post(
  "/api/images",
  isAuthenticated,
  upload.single("file"),
  function (req, res, next) {
    // Make sure required fields are present
    if (!req.body.title || !req.file)
      return res.status(400).send("Missing required fields");

    // Create a new image
    const image = {
      title: req.body.title,
      author: req.user._id,
      image: req.file,
    };

    // Save the image
    images.insert(image, function (err, newImage) {
      if (err) return res.status(500).send(err);
      delete newImage.image;
      res.send(newImage);
    });
  }
);

app.post(
  "/api/images/:imageId/comments",
  isAuthenticated,
  function (req, res, next) {
    req.body.author = req.user._id;
    const id = req.params.imageId;
    const comment = new Comment({ ...req.body, imageId: id });

    // Make sure the image exists
    images.findOne({ _id: id }, function (err, image) {
      if (!image) return res.status(404).send("Image not found");

      // Save the comment
      comments.insert(comment, function (err, newComment) {
        if (err) return res.status(500).send(err);
        newComment.imageId = image._id;
        comments.count({ imageId: image._id }, function (err, total) {
          res.send({
            comment: newComment,
            total,
          });
        });
      });
    });
  }
);

// Read

app.get("/api/images", isAuthenticated, function (req, res) {
  const page = req.query.page || 0;
  images.count({ author: req.query.username }, (err, count) => {
    images
      .find({ author: req.query.username })
      .sort({ createdAt: -1 })
      .skip(page)
      .limit(1)
      .exec((err, image) => {
        res.json({
          count,
          image: image[0],
        });
      });
  });
});

app.get("/api/users/", isAuthenticated, function (req, res, next) {
  return res.json(users.getAllData().map((user) => user._id));
});

app.get(
  "/api/images/:imageId/comments",
  isAuthenticated,
  function (req, res, next) {
    // Get the last 5 comments based on the page number
    const page = req.query.page || 0;
    const limit = req.params.limit || 5;
    comments.count({ imageId: req.params.imageId }, (err, total) => {
      comments
        .find({ imageId: req.params.imageId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(page * limit)
        .exec((err, comments) =>
          res.json({
            total,
            comments: comments.reverse(),
          })
        );
    });
  }
);

// Update

app.patch("/api/comments/:id/", isAuthenticated, function (req, res, next) {
  const id = parseInt(req.params.id);

  let handle = (err, numUpdated) => {
    if (err) {
      res.status(500).send(err);
    } else if (numUpdated == 0) {
      res.status(404).send("Comment not found");
    } else {
      // Get the updated message
      comments.findOne(
        {
          _id: id,
        },
        (_, message) => {
          return res.json(message);
        }
      );
    }
  };

  switch (req.body.action) {
    case "upvote":
      comments.update(
        { _id: id, author: req.session.username },
        { $inc: { upvote: 1 } },
        handle
      );
      break;
    case "downvote":
      comments.update(
        { _id: id, author: req.session.username },
        { $inc: { downvote: 1 } },
        handle
      );
      break;
    default:
      res.status(400).send("Invalid action");
  }
});

// Delete
app.delete("/api/comments/:id/", isAuthenticated, function (req, res, next) {
  const id = req.params.id;
  let handle = function (err, comment) {
    comments.count(
      { imageId: comment.imageId, author: req.session.username },
      (err, count) => {
        if (err) return res.status(500).send(err);
        res.json({
          msg: "Deleted comment",
          remaining: count - 1,
          comment,
        });
      }
    );
  };

  // Get the comment
  comments.findOne({ _id: id }, (_, comment) => {
    if (!comment) {
      res.status(404).send("Comment not found");
    } else {
      // Get the image
      images.findOne({ _id: comment.imageId }, (_, image) => {
        if (!image) {
          res.status(404).send("Image not found");
        } else {
          // Check if the user is the author
          if (
            image.author == req.session.username ||
            req.session.username == comment.author
          ) {
            comments.remove({ _id: id }, handle);
          } else {
            res.status(403).send("You are not the author of the image");
          }
        }
      });
    }
  });
});

app.delete("/api/images/:id", isAuthenticated, function (req, res, next) {
  const id = req.params.id;
  let handle = function (err, image) {
    images.count({ author: req.session.username }, (err, count) => {
      if (err) return res.status(500).send(err);

      res.json({
        msg: "Deleted image",
        remaining: count - 1,
        image,
      });
    });
  };

  // Get the comment
  images.findOne({ _id: id }, (_, image) => {
    if (!image) {
      res.status(404).send("Image not found");
    } else {
      images.remove(
        { _id: id, author: req.session.username },
        {},
        handle(_, image)
      );
    }
  });
});

app.post("/signup/", function (req, res, next) {
  var username = req.body.username;
  var password = req.body.password;

  users.findOne({ _id: username }, (err, user) => {
    if (err) return res.status(500).end(err);
    if (user)
      return res.status(409).json({
        message: "username " + username + " already exists",
      });

    hashPassword(password, (_err, hash) => {
      users.update(
        { _id: username },
        { _id: username, password: hash },
        { upsert: true },
        (err) => {
          if (err) return res.status(500).end(err);

          // initialize cookie
          req.session.username = username;
          setCookie(res, username);

          return res.json({ username });
        }
      );
    });
  });
});

app.post("/signin/", function (req, res, next) {
  var username = req.body.username;
  var password = req.body.password;

  // retrieve user from the database
  users.findOne({ _id: username }, (err, user) => {
    if (err) return res.status(500).end(err);
    if (!user)
      return res.status(401).json({
        message: "access denied",
      });

    compareHash(password, user.password, (_err, match) => {
      if (!match)
        return res.status(401).json({
          message: "access denied",
        });

      // Create and store a random uuid4 as a session token
      req.session.username = user._id;
      setCookie(res, user._id);

      return res.json({
        username: user._id,
      });
    });
  });
});

// curl -b cookie.txt -c cookie.txt localhost:3000/signout/
app.get("/signout/", isAuthenticated, function (req, res, next) {
  req.session.destroy(function (err) {
    if (err) return res.status(500).end(err);
    res.clearCookie("username");

    return res.redirect("/");
  });
});

const http = require("http");
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
