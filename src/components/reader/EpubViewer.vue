<template>
    <div class="epub">
        <ClipLoader
            class="epub__loading"
            v-show="loading"
            color="var(--theme-text-color)"
            size="75px"
        />

        <div id="epub__viewer" />
    </div>
</template>

<script>
import { Book } from 'epubjs'
import { mapState, mapMutations } from 'vuex'
import ClipLoader from 'vue-spinner/src/ClipLoader'
import when from 'when-key-events'
import isMobile from 'ismobilejs'

export default {
    name: 'EpubViewer',
    props: {
        src: {
            type: String,
            required: true
        }
    },
    components: {
        ClipLoader
    },
    data() {
        return {
            rendition: null,
            book: null,
            loading: true
        }
    },
    async mounted() {
        this.book = new Book(this.src, { openAs: 'epub' })

        this.rendition = this.book.renderTo('epub__viewer', {
            manager: 'continuous',
            flow: 'paginated',
            width: '100%',
            height: '100%',
            stylesheet: '/fonts.css',
            snap: true
        })

        this.setupThemes()
    
        const lastLocation = localStorage.getItem(this.src)
        if (lastLocation) {
            this.rendition.display(lastLocation)
        } else {
            this.rendition.display()
        }

        await this.book.ready
        this.book.locations.generate(1000)

        this.rendition.on('selected', this.onSelected)
        this.rendition.on('relocated', this.onRelocated)
        this.rendition.on('rendered', this.onRendered)

        when('arrow_left').Execute(() => this.rendition.prev())
        when('arrow_right').Execute(() => this.rendition.next())
    },
    computed: {
        ...mapState('reader', ['fontSize', 'theme', 'progress', 'font'])
    },
    methods: {
        ...mapMutations('reader', ['setProgress']),
        async onSelected(cfiRange) {
            const range = await this.book.getRange(cfiRange)
            
            this.$emit('text-select', range.toString())
        },
        onRelocated(location) {
            localStorage.setItem(this.src, location.start.cfi)

            const progress = this.book.locations.percentageFromCfi(location.start.cfi)
            this.setProgress(progress * 100)
        },
        onRendered() {
            this.loading = false

            this.rendition.getContents().forEach(content => {
                content.content.onclick = () => {
                    const selection = content.window.getSelection()
                
                    selection.modify('extend', 'backward', 'word')       
                    const b = selection.toString()

                    selection.modify('extend', 'forward', 'word')
                    const a = selection.toString()
                    selection.modify('move','forward','character')
                    
                    if (/\w+/.test(b + a)) {
                        this.$emit('text-select', b + a)
                    }
                }
            })

            this.changeFont(this.font)
        },
        setupThemes() {
            this.rendition.themes.register('white', { body: { background: '#f9f9f9', color: '#333' }})
            this.rendition.themes.register('black', { body: { background: '#333', color: '#e7e7e7' }})
            this.rendition.themes.register('sepia', { body: { background: '#fbf0d9', color: '#5f4b32' }})

            this.rendition.themes.fontSize(this.fontSize + '%')
            this.rendition.themes.select(this.theme)
        },
        changeFont(font) {
            this.rendition.getContents().forEach(content => {
                content.documentElement.querySelector('#epubjs-inserted-css-').innerHTML = `
                    * { 
                        font-family: ${this.font}, serif !important;
                        ${!isMobile(window.navigator).any && 'cursor: pointer;'}
                    }
                `
            })
        }
    },
    watch: {
        fontSize(newFontSize) {
            this.rendition.themes.fontSize(newFontSize + '%')
        },
        theme(newTheme) {
            this.rendition.getContents().forEach(content => {
                content.documentElement.querySelector('#epubjs-inserted-css-white')?.remove()
                content.documentElement.querySelector('#epubjs-inserted-css-black')?.remove()
                content.documentElement.querySelector('#epubjs-inserted-css-sepia')?.remove()
            })
            
            this.rendition.themes.update(newTheme)
        },
        font() {
            this.changeFont(this.font)
        }
    }
}
</script>

<style scoped>
    #epub__viewer {
        height: calc(100vh - 32px);
        background: var(--theme-bg-color);
    }

    .epub__loading {
        position: fixed;
        height: calc(100% - 32px);
        width: 100%;
        top: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--theme-bg-color);
        color: var(--theme-text-color);
    }
</style>

<style>
    .epub-container {
        margin: auto;
    }
</style>