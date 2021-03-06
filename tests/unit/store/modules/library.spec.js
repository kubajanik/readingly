import library from '@/store/modules/library'
import { uploadFile, getFiles, deleteFile } from '@/firebase/storage'
import { createThumbnail } from '@/services/book.service'

jest.mock('@/firebase/storage', () => ({
    uploadFile: jest.fn(() => Promise.resolve('path/to/book')),
    getFiles: jest.fn(() => Promise.resolve(['path/to/book1.epub', 'path/to/book2.epub'])),
    deleteFile: jest.fn(() => Promise.resolve())
}))

jest.mock('@/services/book.service', () => ({
    createThumbnail: jest.fn(() => Promise.resolve('path/to/thumbnail'))
}))

describe('Store - library', () => {
    describe('mutations', () => {
        let state

        beforeEach(() => {
            state = library.state
        })

        it('pushBook pushes new book', () => {
            const book = 'path/to/book'

            library.mutations.pushBook(state, book)

            expect(state.books).toHaveLength(1)
            expect(state.books).toContain(book)
        })

        it('setBooks sets books', () => {
            const books = ['path/to/book1', 'path/to/book2', 'path/to/book3']

            library.mutations.setBooks(state, books)

            expect(state.books).toHaveLength(books.length)
            expect(state.books).toEqual(books)
        })

        it('setBookIsUploading sets new value', () => {
            expect(state.bookIsUploading).toBe(false)

            library.mutations.setBookIsUploading(state, true)

            expect(state.bookIsUploading).toBe(true)
        })
    })

    describe('actions', () => {
        let commit

        beforeEach(() => {
            commit = jest.fn()
        })

        it('addBook uploads and pushes book', async () => {
            const book = new File([], 'book.epub', { type: 'application/epub+zip' })

            await library.actions.addBook({ commit }, book)

            expect(commit).toHaveBeenCalledWith('setBookIsUploading', true)
            expect(commit).toHaveBeenCalledWith('setBookIsUploading', false)
            expect(uploadFile).toHaveBeenCalledWith(book)
            expect(createThumbnail).toHaveBeenCalledWith('path/to/book')
            expect(commit).toHaveBeenLastCalledWith('pushBook', 'path/to/book')
        })

        it('getBooks fetches books', async () => {
            await library.actions.getBooks({ commit })

            expect(getFiles).toHaveBeenCalledWith(/.*\.epub/)
            expect(commit).toHaveBeenCalledWith('setBooks', ['path/to/book1.epub', 'path/to/book2.epub'])
        })

        it('removeBook removes book', async () => {
            const state = {
                books: ['path/to/book1.epub', 'path/to/book2.epub']
            }

            await library.actions.removeBook({ state }, 'book2.epub')

            expect(state.books.includes('book2.epub')).toBe(false)
            expect(deleteFile).toHaveBeenCalledWith('book2.epub')
            expect(deleteFile).toHaveBeenCalledWith('book2.jpg')
        })
    })
})
