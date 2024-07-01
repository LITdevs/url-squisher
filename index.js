const express = require('express')
const app = express()
const mongoose = require("mongoose");
const cookieParser = require('cookie-parser');
const {join} = require("node:path");
const {Schema} = require("mongoose");

require('dotenv').config();
app.use(express.static('public/resources'));
app.set('views', join(__dirname, "public"));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use((req, res, next) => {
    if (req.cookies.admin === process.env.ADMIN_PASSWORD) req.admin = true;
    next()
})

const StoredURLSchema = new Schema({
    path: String,
    target: String
});
StoredURLSchema.index({path: 'text'});
const StoredURLs = mongoose.model('url', StoredURLSchema);

app.get('/', (req, res) => {
    res.render('index', {urlNotFound: false});
});

app.get('/admin', (req, res) => {
    if(!req.admin) return res.redirect('/');
    res.render('admin');
});

app.post('/admin', async (req, res) => {
    if(!req.admin) return res.redirect('/');

    const storedurl = await StoredURLs.findOne({path: req.body.path}).exec();
    console.log(storedurl)
    if(storedurl) res.send("Already exists")

    let storingurl = new StoredURLs();
    storingurl.path = req.body.path;
    storingurl.target = req.body.target;
    await storingurl.save()

    return res.redirect(`/${storingurl.path}/admin`);
});

app.get('/admin/all', async (req, res) => {
    res.render("list", {storedurls: await StoredURLs.find({}).sort({"path": 1}).exec()})
})

app.get('/:url/admin', async (req, res) => {
    const storedurl = await StoredURLs.findOne({path: req.params.url}).exec();
    if(!storedurl) res.render('index', {urlNotFound: true});

    res.render("admin-url", {storedurl})
});

app.post('/:url/admin', async (req, res) => {
    const storedurl = await StoredURLs.findOne({path: req.params.url}).exec();
    if(!storedurl) res.render('index', {urlNotFound: true});

    storedurl.target = req.body.target;
    await storedurl.save();

    return res.redirect(`/${storedurl.path}/admin`);
});

app.post('/:url/admin/delete', async (req, res) => {
    await StoredURLs.findOneAndDelete({path: req.params.url}).exec();
    return res.redirect(`/admin`);
});

app.get('/:url', async (req, res) => {
    const storedurl = await StoredURLs.findOne({path: req.params.url}).exec();

    if(storedurl) {
        res.redirect(storedurl.target);
    } else {
        res.render('index', {urlNotFound: true})
    }
});

const port = 6625;
async function startApp() {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to database")
    app.listen(port, () => {
        console.log(`url-squisher listening on port ${port}`)
    })
}
startApp();