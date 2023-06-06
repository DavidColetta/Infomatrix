const Blog = require('../models/blog');

const blog_index = (req, res) => {
  Blog.find().sort({ createdAt: -1 })
    .then(result => {
      res.render('index', { blogs: result, title: 'All blogs', tagsToSearch: [] });
    })
    .catch(err => {
      console.log(err);
    });
}

const blog_details = (req, res) => {
  const id = req.params.id;
  Blog.findById(id)
    .then(result => {
      res.render('details', { blog: result, title: 'Blog Details' });
    })
    .catch(err => {
      console.log(err);
      res.render('404', { title: 'Blog not found' });
    });
}

const blog_create_get = (req, res) => {
  res.render('create', { title: 'Create a new blog' });
}

const blog_create_post = (req, res) => {
  const blog = new Blog(req.body);
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
      res.render('index', { blogs: result, title: 'All blogs', tagsToSearch: tagsSearch });
    })
    .catch(err => {
      console.log(err);
    });
}

const blog_delete = (req, res) => {
  const id = req.params.id;
  Blog.findByIdAndDelete(id)
    .then(result => {
      res.json({ redirect: '/blogs' });
    })
    .catch(err => {
      console.log(err);
    });
}

module.exports = {
  blog_index, 
  blog_details, 
  blog_create_get, 
  blog_create_post, 
  blog_tag_search,
  blog_delete
}