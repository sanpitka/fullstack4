const { test, describe, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const Blog = require('../models/blog')

const api = supertest(app)

const initialBlogs = [
  {
    title: 'Vaarallinen juhannus',
    author: 'Tove Jansson',
    url: 'http://hattivatti.blogspot.com/',
    likes: 71824
  },
  {
    title: 'Veronan yöt',
    author: 'Julia Capulet',
    url: 'http://oiromeo.lily.fi/',
    likes: 46
  },
]

beforeEach(async () => {
  await Blog.deleteMany({})
  let blogObject = new Blog(initialBlogs[0])
  await blogObject.save()
  blogObject = new Blog(initialBlogs[1])
  await blogObject.save()
})

describe('HTTP request tests', () => {
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
})

after(async () => {
  await mongoose.connection.close()
})