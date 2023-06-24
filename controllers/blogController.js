const { result, indexOf } = require('lodash');
const Blog = require('../models/blog');
const User = require('../models/user');
const Tag = require('../models/tag');

const blog_index = async (req, res) => {
  const tags = await Tag.find().sort({ name: 1 });
  Blog.find({}, {body: false}).sort({ updatedAt: -1 })
    .then(result => {
      res.render('index', { tagQuery: [], tags: tags, cotags:[], blogs: result, title: 'All Blogs', name: req?.user?.username});
    })
    .catch(err => {
      console.log(err);
    });
}

const blog_tag_search = async (req, res) => {
  const tagStrings = req.params.tag.split(',');
  const tagObjects = [];
  for (i = 0; i < tagStrings.length; i++) {
    tagStrings[i] = tagStrings[i].trim();
    
    tagObjects.push(await Tag.findOne({name: tagStrings[i]}).catch(err => {
      console.log(err);
    }))
    if (tagObjects[i] == null) {
      console.log("Tag not found");
      res.render('404', { title: 'Tag not found', name: req?.user?.username });
      return;
    }
  }
  var finalBlogsList = [];
  const cotags = [];
  for (i = 0; i < tagObjects.length; i++) {
    //Find blogs that all tags have in common
    if (i == 0) {
      finalBlogsList = tagObjects[i].blogs;
      //Add tags to cotags
      for (j = 0; j < finalBlogsList.length; j++) {
        var result = await Blog.findById(finalBlogsList[j], {_id: false, title:false, snippet:false, createdAt:false, updatedAt:false, createdBy:false, createdById:false})
        result.tags.forEach(tag => {
          if (!cotags.includes(tag)) {
            cotags.push(tag);
          }
        });
      }
      cotags.sort();
    } else {
      finalBlogsList = finalBlogsList.filter(value => tagObjects[i].blogs.includes(value));
    }
  }
  //Get blogs
  finalBlogsList = await Blog.find({_id: finalBlogsList}, {body: false}).sort({ updatedAt: -1 }).catch(err => {
    console.log(err);
  });
  console.log(cotags)

  const tags = await Tag.find().sort({ name: 1 });
  res.render('index', { tagQuery: tagStrings, tags: tags, cotags: cotags, blogs: finalBlogsList, title: 'Blogs', name: req?.user?.username});
}

const blog_details = (req, res) => {
  const id = req.params.id;
  Blog.findById(id)
    .then(result => {
      res.render('details', { blog: result, title: 'Blog Details', name: req?.user?.username, user_id: req?.user?._id });
    })
    .catch(err => {
      console.log(err);
      res.render('404', { title: 'Blog not found', name: req?.user?.username });
    });
}

const blog_create_get = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  Tag.find().then(result => {
    res.render('create', { title: 'Create a new blog', name: req?.user?.username, tags: result });
  });
  
}

const blog_create_post = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  const blog = new Blog({title: req.body.title, snippet: req.body.snippet, body: req.body.body, createdBy: req.user.username, createdById: req.user._id, tags: []});
  //Save blog to user
  User.findById(req.user._id).then(user => {
    user.blogs.push(blog._id);
    user.save().catch(err => {
      console.log(err);
    });
  });
  //Save blog to tags
  const tags = req.body.tags_combined.split(',');
  for (var element in req.body) {
    if (element.startsWith('tag_')) {
      tags.push(element.substring(4));
    }
  };

  tags.forEach(element => {
    var tag = element.trim();
    if (tag.length > 0) {
      blog.tags.push(tag);
      Tag.findOne({name: tag}).then( result => {
        if (result == null) {
          const newtag = new Tag({name: tag, blogs: [blog._id]});
          newtag.save().catch(err => {
            console.log(err);
          });
        } else {
          result.blogs.push(blog._id);
          result.save().catch(err => {
            console.log(err);
          });
        }
      })
    }
  });

  //Save blog
  blog.save()
    .then(result => {
      res.redirect('/blogs');
    })
    .catch(err => {
      console.log(err);
    });
}

const blog_edit = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  const id = req.params.id;
  Blog.findById(id)
    .then(result => {
      if (result.createdById == null || req.user._id == result.createdById) {
        Tag.find().then(tags =>
          res.render('editdetails', { blog: result, tags: tags, title: 'Edit Blog Details', name: req?.user?.username })
        );
      } else {
        res.redirect('/blogs/'+id);
      }
    })
    .catch(err => {
      console.log(err);
      res.render('404', { title: 'Blog not found', name: req?.user?.username });
    });
}

const blog_edit_post = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  const id = req.params.id;

  Blog.findById(id)
    .then(blog => {
      if (req.user._id != blog.createdById && blog.createdById != null) {
        res.redirect('/blogs/'+id);
        return;
      }
      if (blog.createdById == null) {
        blog.createdById = req.user._id;
        blog.createdBy = req.user.username;

        User.findById(req.user._id).then(user => {
          user.blogs.push(blog._id);
          user.save().catch(err => {
            console.log(err);
          });
        });
      }
      blog.title = req.body.title;
      blog.snippet = req.body.snippet;
      blog.body = req.body.body;
      const tags = req.body.tags_combined.split(',');
      for (var element in req.body) {
        if (element.startsWith('tag_')) {
          tags.push(element.substring(4));
        }
      };
      //trim tags
      for (i = 0; i < tags.length; i++) {
        tags[i] = tags[i].trim();
      }

      //Delete from tags
      for (i = 0; i < blog.tags.length; i++) {
        Tag.findOne({name: blog.tags[i]}).then( tag => {
          if (tag != null) {
            if (indexOf(tags, tag.name) == -1) {//If tag not in new tags
              tag.blogs.pull(blog._id);
              if (tag.blogs.length == 0) {
                tag.delete();
              } else {
                tag.save().catch(err => {
                  console.log(err);
                });
              }
            }
          }
        });
      }

      //Add to tags
      blog.tags = [];
      tags.forEach(element => {
        if (element.length > 0) {
          blog.tags.push(element);
          Tag.findOne({name: element}).then( tag => {
            if (tag == null) {
              const newtag = new Tag({name: element, blogs: [blog._id]});
              newtag.save().catch(err => {
                console.log(err);
              });
            } else {
              if (!tag.blogs.includes(blog._id)) {//If blog not already in tag
                tag.blogs.push(blog._id);
                tag.save().catch(err => {
                  console.log(err);
                });
              }
            }
          })
        }
      });
      
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
      res.render('404', { title: 'Blog not found', name: req?.user?.username });
    });
}

const blog_delete = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  const id = req.params.id;
  Blog.findById(id)
    .then(result => {
      if (result.createdById == null || req.user._id == result.createdById) {//Execute Delete
        //Delete from tags
        for (i = 0; i < result.tags.length; i++) {
          Tag.findOne({name: result.tags[i]}).then( tag => {
            if (tag != null) {
              tag.blogs.pull(result._id);
              if (tag.blogs.length == 0) {
                tag.delete();
              } else {
                tag.save().catch(err => {
                  console.log(err);
                });
              }
            }
          });
        }
        //Delete from blogs
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
      res.render('404', { title: 'Blog not found', name: req?.user?.username });
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