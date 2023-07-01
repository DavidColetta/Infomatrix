const inProd = process.env.NODE_ENV === 'production';
console.log("In production: " + inProd);
if (!inProd) { require('dotenv').config() }

const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const blogRoutes = require('./routes/blogRoutes');
const bcrypt = require('bcrypt');
const app = express();
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');

const User = require('./models/user')

// fixTags();

const initializePassport = require('./passport-config');
initializePassport(passport);

// connect to mongodb & listen for requests
const dbURI = process.env.MONGODB_URI;

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(result => app.listen(3000))
  .catch(err => console.log(err));

// use
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: false}));
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: false,
  cookie: {
    sameSite: `${inProd ? "none" : "lax"}`, // cross site // set lax while working with http:localhost, but none when in prod
    secure: `${inProd ? "true" : "auto"}`, // only https // auto when in development, true when in prod
    maxAge: 1000 * 60 * 60 * 24 * 14, // expiration time
  },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

// middleware & static files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

// routes
app.get('/', (req, res) => {
  res.redirect('/blogs');
});

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login', {title: 'Login', name: null});
});

//Authenticate login with passport
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/blogs',
  failureRedirect: '/login',
  failureFlash: true,
  session: true
}));

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register', {title: 'Register', name: null});
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashed_password = await bcrypt.hash(req.body.password, 10);
    const user = new User({username: req.body.username, email: req.body.email, password: hashed_password});
    user.save()
      .then(result => {
        req.logIn(user, function (err) {
          if ( ! err ){
            res.redirect('/');
          } else {
            console.log(err);
          }
        });
      })
      .catch(err => {
        console.log(err);
      });
  } catch (e) {
    res.redirect('/register');
  }
});

app.get('/logout', checkAuthenticated, (req, res) => {
  res.render('logout', { title: 'Log Out', name: req?.user?.username });
})

app.delete('/logout', checkAuthenticated, (req, res) => {
  req.logout(function(err) {
    if (err) { console.log(err); }
    res.redirect('/login');
  });
})

app.get('/about', (req, res) => {
  res.render('about', { title: 'About', name: req?.user?.username });
});

// blog routes
app.use('/blogs', blogRoutes);

// 404 page
app.use((req, res) => {
  res.status(404).render('404', { title: '404', name: req?.user?.username });
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login');
  }
}

function checkNotAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/blogs');
  }
}

async function fixTags() {
  const Blog = require('./models/blog');
  const Tag = require('./models/tag');
  //Delete all tags
  await Tag.deleteMany({});
  console.log("Deleted all tags");
  //For each tag in each blog, create a tag if it doesn't exist. If it does exist, add the blog to the tag's blogs array
  const blogs = await Blog.find().sort({ updatedAt: -1});
  for (i = 0; i < blogs.length; i++) {
    for (j = 0; j < blogs[i].tags.length; j++) {
      const tag = await Tag.findOne({name: blogs[i].tags[j]}).catch(err => {
        console.log(err);
      });
      if (tag == null) {
        const newTag = new Tag({name: blogs[i].tags[j], blogs: [blogs[i]._id]});
        await newTag.save().catch(err => {
          console.log(err);
        });
        console.log("   Created tag " + blogs[i].tags[j]);
      } else {
        // if (!tag.blogs.includes(blog._id)) {
          tag.blogs.push(blogs[i]._id);
          await tag.save().catch(err => {
            console.log(err);
          });
        // }
        console.log("   Added blog to tag " + tag.name);
      }
    }
    console.log(" Created all tags for blog " + blogs[i].title);
  };
  
  console.log("Created tags for all blogs");
}