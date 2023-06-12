const { result } = require('lodash');
const Blog = require('../models/blog');
const User = require('../models/user');

const blog_index = (req, res) => {
  Blog.find().sort({ createdAt: -1 })
    .then(result => {
      res.render('index', { blogs: result, title: 'All blogs', tagsToSearch: [], user: req?.user?.username });
    })
    .catch(err => {
      console.log(err);
    });
}

const blog_details = (req, res) => {
  const id = req.params.id;
  Blog.findById(id)
    .then(result => {
      res.render('details', { blog: result, title: 'Blog Details', user: req?.user?.username, user_id: req?.user?._id });
    })
    .catch(err => {
      console.log(err);
      res.render('404', { title: 'Blog not found', user: req?.user?.username });
    });
}

const blog_create_get = (req, res) => {
  if (!req.isAuthenticated()) res.redirect('/login');
  res.render('create', { title: 'Create a new blog', user: req?.user?.username });
}

const blog_create_post = (req, res) => {
  if (!req.isAuthenticated()) res.redirect('/login');
  const blog = new Blog({title: req.body.title, snippet: req.body.snippet, body: req.body.body, createdBy: req.user.username, createdById: req.user._id});
  const tags = req.body.tags_combined.split(',');
  for (i = 0; i < tags.length; i++) {
    tags[i] = tags[i].trim();
    if (tags[i].length > 0) {
      blog.tags.push(tags[i]);
    }
  }
  blog.save()
    .then(result => {
      res.redirect('/blogs');
    })
    .catch(err => {
      console.log(err);
    });
}

const blog_tag_search = (req, res) => {
  const tagsString = req.params.tags;
  const tags = tagsString.split(',');
  var tagsSearch = [];
  for (i = 0; i < tags.length; i++) {
    tags[i] = tags[i].trim();
    if (tags[i].length > 0)
      tagsSearch.push(tags[i]);
  }
  Blog.find().sort({ createdAt: -1 })
    .then(result => {
      res.render('index', { blogs: result, title: 'All blogs', tagsToSearch: tagsSearch, user: req?.user?.username });
    })
    .catch(err => {
      console.log(err);
    });
}

const blog_edit = (req, res) => {
  if (!req.isAuthenticated()) res.redirect('/login');
  const id = req.params.id;
  Blog.findById(id)
    .then(result => {
      if (req.user._id == result.createdById)
        res.render('editdetails', { blog: result, title: 'Edit Blog Details', user: req?.user?.username });
      else
        res.redirect('/blogs/'+id);
    })
    .catch(err => {
      console.log(err);
      res.render('404', { title: 'Blog not found', user: req?.user?.username });
    });
}

const blog_edit_post = (req, res) => {
  if (!req.isAuthenticated()) res.redirect('/login');
  const id = req.params.id;

  Blog.findById(id)
    .then(blog => {
      if (req.user._id != blog.createdById) {
        res.redirect('/blogs/'+id);
        return;
      }
      blog.title = req.body.title;
      blog.snippet = req.body.snippet;
      blog.body = req.body.body;
      blog.tags = [];
      const tags = req.body.tags_combined.split(',');
      for (i = 0; i < tags.length; i++) {
        tags[i] = tags[i].trim();
        if (tags[i].length > 0) {
          blog.tags.push(tags[i]);
        }
      }
      blog.save()
        .then(result => {
          res.redirect('/blogs/'+id);
        })
        .catch(err => {
          console.log(err);
        });
    })
    .catch(err => {
      console.log(err);
      res.render('404', { title: 'Blog not found', user: req?.user?.username });
    });
}

const blog_delete = (req, res) => {
  if (!req.isAuthenticated()) res.redirect('/login');
  const id = req.params.id;
  Blog.findById(id)
    .then(result => {
      if (req.user._id == result.createdById) {
        Blog.findByIdAndDelete(id)
        .then(result => {
          res.json({ redirect: '/blogs' });
        })
        .catch(err => {
          console.log(err);
        });
      } else
        res.redirect('/blogs/'+id);
    })
    .catch(err => {
      console.log(err);
      res.render('404', { title: 'Blog not found', user: req?.user?.username });
    });
}

module.exports = {
  blog_index, 
  blog_details, 
  blog_create_get, 
  blog_create_post, 
  blog_tag_search,
  blog_edit,
  blog_edit_post,
  blog_delete
}