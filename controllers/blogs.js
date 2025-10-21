const router = require('express').Router()
const Blog = require('../models/blog')

router.get('/', async (request, response) => {
  const blogs = await Blog.find({})
  response.json(blogs)
})

router.post('/', async (request, response) => {
  const blog = new Blog(request.body)
  if (!blog.title || !blog.url) {
    return response.status(400).json({ error: 'title and url are required' })
  } else if (blog.likes === undefined) {
    blog.likes = 0
  }
  const result = await blog.save()
  response.status(201).json(result)
})

module.exports = router
