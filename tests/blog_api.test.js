const { test, describe, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const Blog = require('../models/blog')

const api = supertest(app)

beforeEach(async () => {
  await Blog.deleteMany({})
  await Blog.insertMany(helper.initialBlogs)
})

describe('when there are blogs saved initially', () => {
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('there are right amount of blogs', async () => {
    const response = await api.get('/api/blogs')
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  test('The unique identifier property of the blog posts is named id', async () => {
    const response = await api.get('/api/blogs')
    assert(response.body[0].id)
  })

  describe('when adding a new blog', () => {
    
    test('a valid blog can be added', async () => {
      const newBlog = {
        title: 'Blankki-Blogi',
        author: 'Blanko',
        url: 'http://www.blankki.fi/avatutsaajuoda',
        likes: 0
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const response = await api.get('/api/blogs')
      const titles = response.body.map(blog => blog.title)
      assert.strictEqual(response.body.length, helper.initialBlogs.length + 1)
      assert(titles.includes(newBlog.title), true)
    })

    test('blog without likes defaults to 0', async () => {
      const newBlog = {
        title: 'Kukaan ei pidä minusta',
        author: 'Yksinäinen Sielu',
        url: 'http://nyyh.vuodatus.net/'
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const response = await api.get('/api/blogs')
      const titles = response.body.map(blog => blog.title)
      assert.strictEqual(response.body.length, helper.initialBlogs.length + 1)
      assert(titles.includes(newBlog.title), true)
      assert.strictEqual(response.body[response.body.length - 1].likes, 0)
    })

    test('blog without title and url is not added', async () => {
      const newBlog = {
        author: 'Kai Unho',
      }
      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      const response = await api.get('/api/blogs')
      assert.strictEqual(response.body.length, helper.initialBlogs.length)
    })

    describe('deletion of a blog', () => {
      test('deletes a blog successfully with a status code 204', async () => {
        const blogsAtStart = await helper.blogsInDb()
        const blogToDelete = blogsAtStart[0]

        await api
          .delete(`/api/blogs/${blogToDelete.id}`)
          .expect(204)
        const blogsAtEnd = await helper.blogsInDb()
        const titles = blogsAtEnd.map(blog => blog.title)
        assert(!titles.includes(blogToDelete.title))
        assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)
      })
    })

    describe('updating a blog', () => {
      test('the likes of a blog can be updated successfully', async () => {
        const blogsAtStart = await helper.blogsInDb()
        const blogToUpdate = blogsAtStart[0]
        const updatedBlogData = { ...blogToUpdate, likes: blogToUpdate.likes + 1 }

        await api
          .put(`/api/blogs/${blogToUpdate.id}`)
          .send(updatedBlogData)
          .expect(200)
          .expect('Content-Type', /application\/json/)

        const blogsAtEnd = await helper.blogsInDb()
        const updatedBlog = blogsAtEnd.find(blog => blog.id === blogToUpdate.id)
        assert.strictEqual(updatedBlog.likes, blogToUpdate.likes + 1)
      })
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})