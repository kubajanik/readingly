const { https } = require('firebase-functions')
const os = require('os')
const gs = require('gs')
const path = require('path')
const fs = require('fs')
const cors = require('cors')({ origin: true })
const admin = require('firebase-admin')
const request = require('request')
const cheerio = require('cheerio')
admin.initializeApp()

exports.createThumbnail = https.onRequest((req, res) => {
    cors(req, res, () => {
        if (! req.body.file) {
            return res.status(400).send('File is not specified')
        }

        let filePath = /o\/(.*)\?/.exec(req.body.file)[1].replace('%2F', '/')

        const fileName = path.basename(filePath)
        const tempFilePath = path.join(os.tmpdir(), fileName)

        const newName = path.basename(filePath, '.pdf') + '.jpg'
        const tempNewPath = path.join(os.tmpdir(), newName)

        const bucket = admin.storage().bucket()

        return bucket.file(filePath).download({
            destination: tempFilePath
        }).then(() => {
            return new Promise((resolve, reject) => {
                gs()
                    .batch()
                    .nopause()
                    .option('-dFirstPage=1')
                    .option('-dLastPage=1')
                    .executablePath('lambda-ghostscript/bin/./gs')
                    .device('jpeg')
                    .output(tempNewPath)
                    .input(tempFilePath)
                    .exec((err) => {
                        if (! err) {
                            resolve()
                        } else {
                            reject(err)
                        }
                    })
            })
        }).then(async () => {
            await bucket.upload(tempNewPath, { destination: newName })

            return res.status(200).send(`https://firebasestorage.googleapis.com/v0/b/readingly-ab5f7.appspot.com/o/${ newName }?alt=media`)
        }).then(() => {
            fs.unlinkSync(tempNewPath)
            fs.unlinkSync(tempFilePath)
        })
    })
})

exports.translate = https.onRequest((req, res) => {
    const word = req.body.word

    request(`https://en.bab.la/dictionary/english-polish/${ word }`, (error, {}, html) => {
        if (! error) {
            const $ = cheerio.load(html)

            const el = $('.quick-results').first()

            const translations = el.find('.sense-group-results > li > a').map(({}, a) => $(a).text())

            return res.json(translations.toArray())
        }
    })
})