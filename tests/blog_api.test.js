const { test, describe, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')

const api = supertest(app)

describe.only('number of blogs', () => {
  test.only('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test.only('there are right amount of blogs', async () => {
    const response = await api.get('/api/blogs')
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  test.only('The unique identifier property of the blog posts is named id', async () => {
    const response = await api.get('/api/blogs')
    console.log(response.body)
    assert(response.body[0].id)
  })
})

after(async () => {
  await mongoose.connection.close()
})