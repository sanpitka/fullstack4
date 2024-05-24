const _ = require('lodash')

const dummy = (blogs) => {
    return 1
}

const totalLikes = (blogs) => {
    return blogs.reduce((sum, blog) => sum + blog.likes, 0)
}

const favoriteBlog = (blogs) => {

    if (blogs.length === 0) {
        return {}
    }

    const favorite = blogs.reduce((max, blog) => blog.likes > max.likes ? blog : max, blogs[0])

    return {
        title: favorite.title,
        author: favorite.author,
        likes: favorite.likes
    }
}

const mostBlogs = (blogs) => {
    if (blogs.length === 0) {
        return {}
    }

    const authors = _.groupBy(blogs, 'author')
    const author = _.maxBy(Object.keys(authors), author => authors[author])

    return {
        author,
        blogs: authors[author].length
    }
}

const mostLikes = (blogs) => {
    if (blogs.length === 0) {
        return {}
    }

    const authors = _.groupBy(blogs, 'author')
    const author = _.maxBy(Object.keys(authors), author => totalLikes(authors[author]))

    return {
        author,
        likes: totalLikes(authors[author])
    }
}

module.exports = {
    dummy,
    totalLikes,
    favoriteBlog,
    mostBlogs,
    mostLikes
}