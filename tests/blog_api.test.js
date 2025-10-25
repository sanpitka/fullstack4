const { test, describe, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const Blog = require('../models/blog')
const User = require('../models/user')
const bcrypt = require('bcrypt')

const api = supertest(app)

beforeEach(async () => {
  await Blog.deleteMany({})
  await User.deleteMany({})

  const initialUser = helper.initialUsers[0]
  const passwordHash = await bcrypt.hash(initialUser.password, 10)  

  const user = new User({ 
    username: initialUser.username,
    name: initialUser.name,
    passwordHash })

  await user.save()

  const passwordHash2 = await bcrypt.hash(helper.initialUsers[1].password, 10)
  const user2 = new User({
    username: helper.initialUsers[1].username,
    name: helper.initialUsers[1].name,
    passwordHash: passwordHash2
  })

  await user2.save()

  const testBlogs = helper.initialBlogs.map(blog => ({
    ...blog,
    user: user._id
  }))
  await Blog.insertMany(testBlogs)

  const blogObjects = await Blog.find({ user: user._id })
  user.blogs = blogObjects.map(blog => blog._id)
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
})

describe('when adding a new user', () => {
  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      username: "testi",
      name: "Ajokortti Körkort",
      password: "testi"
    } 
    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)
    
    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)
    const usernames = usersAtEnd.map(u => u.username)
    assert(usernames.includes(newUser.username))
  })

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb()
    const newUser = {
      username: "tofslan",
      name: "Superuser",
      password: "salainen"
    }
    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('username already exists'))
    
    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    
    const usernames = usersAtEnd.map(u => u.username)
    assert(!usernames.includes(newUser.username) || usersAtEnd.length === usersAtStart.length)
  })
})
describe('when logging in', () => {
  test('succeeds with correct credentials', async () => {
    const loginDetails = {
      username: 'tofslan',
      password: 'heimuumit'
    }
    const response = await api
      .post('/api/login')
      .send(loginDetails)
      .expect(200)
      .expect('Content-Type', /application\/json/)
    assert(response.body.token)
  })

  test('fails with status 401 if password is wrong', async () => {
    const loginDetails = {
      username: 'tofslan',
      password: 'wrongpassword'
    }
    const response = await api
      .post('/api/login')
      .send(loginDetails)
      .expect(401)
      .expect('Content-Type', /application\/json/)
    assert(!response.body.token)
  })

  test('fails with status 401 if username does not exist', async () => {
    const loginDetails = {
      username: 'nonexistinguser',
      password: 'somepassword'
    }
    const response = await api
      .post('/api/login')
      .send(loginDetails)
      .expect(401)
      .expect('Content-Type', /application\/json/)
    assert(!response.body.token)
  })

  test('fails with status 401 if username is too short', async () => {
    const usersAtStart = await helper.usersInDb()
    const loginDetails = {
      username: 'to',
      password: 'pitkäsalasana'
    }
    const response = await api
      .post('/api/login')
      .send(loginDetails)
      .expect(401)
      .expect('Content-Type', /application\/json/)
    
    const usersAtEnd = await helper.usersInDb()
    assert(!response.body.token)
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })
  test('fails with status 401 if password is too short', async () => {
    const usersAtStart = await helper.usersInDb()
    const loginDetails = {
      username: 'käyttäjä',
      password: 'hi'
    }
    const response = await api
      .post('/api/login')
      .send(loginDetails)
      .expect(401)
      .expect('Content-Type', /application\/json/)
    const usersAtEnd = await helper.usersInDb()
    assert(!response.body.token)
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })
})

describe('when adding a new blog', () => {
  test('a valid blog can be added with valid token', async () => {
    const loginResponse = await api
      .post('/api/login')
      .send({
        username: 'tofslan',
        password: 'heimuumit'
      })
    const token = loginResponse.body.token

    const newBlog = {
      title: 'Blankki-Blogi',
      author: 'Blanko',
      url: 'http://www.blankki.fi/avatutsaajuoda',
      likes: 0
    }

    const response = await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)
    
    const titles = blogsAtEnd.map(blog => blog.title)
    assert(titles.includes(newBlog.title), true)

    //Comparing the user to the one who is logged in
    const createdBlog = await Blog.findById(response.body.id).populate('user')
    assert.strictEqual(createdBlog.user.username, 'tofslan')
})

  test('blog without likes defaults to 0', async () => {
    const loginResponse = await api
      .post('/api/login')
      .send({
        username: 'tofslan',
        password: 'heimuumit'
      })
    const token = loginResponse.body.token

    const newBlog = {
      title: 'Kukaan ei pidä minusta',
      author: 'Yksinäinen Sielu',
      url: 'http://nyyh.vuodatus.net/'
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
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
    const loginResponse = await api
      .post('/api/login')
      .send({
        username: 'tofslan',
        password: 'heimuumit'
      })
    const token = loginResponse.body.token

    const newBlog = {
      author: 'Kai Unho',
    }
    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const response = await api.get('/api/blogs')
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })
  test('adding a blog fails with status code 401 if token is not provided', async () => {
    const newBlog = {
      title: 'Tokeniton blogi',
      author: 'Enpä Kerro',
      url: 'http://www.tokeniton.fi/'
    }
    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)
      .expect('Content-Type', /application\/json/)
    const response = await api.get('/api/blogs')
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })
})

describe('when deleting and updating blogs', () => {
  test('deletes a blog successfully with a status code 204', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]
    const loginResponse = await api
      .post('/api/login')
      .send({
        username: 'tofslan',
        password: 'heimuumit'
      })
    const token = loginResponse.body.token

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)
    const blogsAtEnd = await helper.blogsInDb()
    const titles = blogsAtEnd.map(blog => blog.title)
    assert(!titles.includes(blogToDelete.title))
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)
  })

  test('gives error code 401 if user trying to delete is not the owner', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]
    const loginResponse = await api
      .post('/api/login')
      .send({
        username: 'julle',
        password: 'seitäon'
      })
    const token = loginResponse.body.token

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
    const blogsAtEnd = await helper.blogsInDb()
    const titles = blogsAtEnd.map(blog => blog.title)
    assert(titles.includes(blogToDelete.title))
    assert.strictEqual(blogsAtStart.length, blogsAtEnd.length)
  })

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

after(async () => {
  await mongoose.connection.close()
})