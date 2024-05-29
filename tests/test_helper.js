const Blog = require('../models/blog')

const initialBlogs = [
    {
        title: "Vaarallinen juhannus",
        author: "Tove Jansson",
        url: "hattivatti.blogspot.com",
        likes: 71842,
        id: "66426e93a189228adc77d783"
    },
    {
        title: "Veronan yöt",
        author: "Julia Capulet",
        url: "oiromeo.lily.fi",
        likes: 46,
        id: "664275b688b3cbb58af74252"
    }
]

const nonExistingId = async () => {
    const blog = new Blog({ title: 'Nollakatu nolla', author: 'Oskari Olematon', url: 'olematonta.vuodatus.net', likes: 0 })
    await blog.save()
    await blog.remove()

    return blog._id.toString()
}

const blogsInDb = async () => {
    const blogs = await Blog.find({})
    return blogs.map(blog => blog.toJSON())
}

module.exports = {
    initialBlogs, nonExistingId, blogsInDb
}
