// load the server dependencies
const express = require('express');
const cors = require('cors');
const ejs = require('ejs');
const pg = require('pg');
const methodoverride = require('method-override')
// configuration
require('dotenv').config();
const app = express();
const superagent = require('superagent');
const { text } = require('express');
app.use(cors());
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });//heroko

app.use(express.static('./public'));
app.use(express.urlencoded({ extended: true }));
app.use(methodoverride("_method"))

const PORT = process.env.PORT;

// set the view engine to ejs
app.set('view engine', 'ejs');

// use res.render to load up an ejs view file

/********************************** **
***************END POINTS  ***********
***************************************/
// index page 
app.get('/hello', (req, res) => {
    console.log("the main route")
    res.render('./pages/index');
});
app.get('/searches/new', (req, res) => {
    // console.log(res, req);
    res.render('./pages/searches/new')
});
app.get('/', (req, res) => {
    const query='SELECT * FROM books';
    client.
    query(query).
    then(data=>{
        res.render('./pages/index',{"books":data.rows})
    }).catch(error=>{
        console.log(error);
        res.render('./pages/error', { "error": error })
    });
    
})
app.post('/searches/show', (req, res) => {
    //{ searchQuery: 'hello', searchBy: 'title', search: 'search' }
    //request google  google book api 

    let baseAPIUrl = "https://www.googleapis.com/books/v1/volumes"
    let searchQuery = req.body.searchQuery + "+" + req.body.searchBy;
    let query = {
        q: searchQuery,
    }
    superagent.get(baseAPIUrl).query(query).then(data => {
        // console.log(data.body.items);
        var results = [];
        for (let index = 0; index < 10; index++) {
            const element = data.body.items[index];
            const book = new Book(
                element.volumeInfo.title,
                element.volumeInfo.imageLinks,
                element.volumeInfo.authors,
                element.volumeInfo.description,
                element.volumeInfo.industryIdentifiers
            );
            results.push(book);
        }
        res.render('./pages/searches/show', { "results": results });
    }).catch(error => {
        console.log(error);
        res.render('./pages/error', { "error": error })
    });
});
app.get('/books/:id', (req,res)=>{
    let id = req.params.id;
    const query='SELECT * FROM books WHERE id=$1 ';
    let safeValue = [id];
    client.
    query(query,safeValue).
    then(data=>{
        console.log(data.rows);
        res.render('./pages/books/show.ejs',{"books":data.rows})
    }).catch(error=>{
        console.log(error);
        res.render('./pages/error', { "error": error })
    }); 
})
app.get('/books/show', (req,res)=>{
//     console.log("params =", req.params);
// console.log("query is ",req.query);
})
app.post('/books', (req,res)=>{
    const item=JSON.parse(req.body.item);
    const dbQuery='INSERT INTO books (author, title, isbn, image_url,description)VALUES($1,$2,$3,$4,$5) RETURNING id'
    const safeValues=[item.author,item.title,item.isbn,item.image_url,item.description]
    // console.log(safeValues)
    client.
    query(dbQuery,safeValues).then(data=>{

        // console.log("successfully inserted ");
        // console.log(data.rows[0].id);
        res.redirect(`/books/${data.rows[0].id}`)
    }).catch(error=>{
        console.log("error in inserting to db\n",error);
        res.render('./pages/error', { "error": error })
    })
})


app.put('/books/:id', (req,res)=>{
    //collect the data from the form
    //update the database with the values
    // when I hit update it read all the page for me with the new values(redirect)
    const item=req.body;
    console.log(req.params.id);
    let id = req.params.id;
    let updateQuery = 'UPDATE books SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5 WHERE id=$6 '
    const safeValues=[item.title, item.authors, item.isbn,item.image,item.description, id];
    client.query(updateQuery,safeValues).then(data =>{
        res.redirect(`/books/${id}`)
    }).catch(error=>{
        console.log("error in Updating data\n",error);
    })
})


app.delete('/books/:id', (req,res)=>{
    let id = req.params.id;
    console.log(id);
    // console.log("not working!!!!!!!!!!!");
    let deleteQuery = 'DELETE FROM books WHERE id=$1';
    let safeValue = [id];
    client.query(deleteQuery,safeValue).then(data =>{
        console.log(data);
    res.redirect('/')
    }).catch(error=>{
        console.log("error when deleting data\n",error);
    })
})

/********************************** **
***************DATA MODEL  ***********
***************************************/
function Book(title, img, authorName, description, isbn) {
    this.title = title || 'unknown title';
    this.image_url = secure(img) || 'https://i.imgur.com/J5LVHEL.jpg';
    // this.img = secure(img);
    this.authorName = formatAuthor(authorName) || 'unknown author';
    this.description = description || 'unavailable description';
    this.isbn = formatIsbn(isbn) || "unavailable isbn";
}

/***************************************** 
*****************************************
***************helper********************
*******************************************/
function secure(img) {
    if(typeof img==typeof undefined) return null;
    let url= img.thumbnail;
    if (url[5] != 's') {
        var i = url.split("")
        i.splice(4, 0, 's');
    }
    return i.join("");
}
function formatIsbn(isbn) {
    if (isbn.length!=0) 
        return isbn[0].type + " " + isbn[0].identifier//isbn
    return null;
}
function formatAuthor(author){
    if(typeof author==typeof undefined) return null;
    if (author.length!=0) 
        return author.join(", ");
    return null;
}
client.connect().then(()=>{
    app.listen(PORT, () => {
        console.log('app is lestining in port ....', PORT);
    });
}).catch(error=>{
    console.log('error app is not lestining in port ....', error);
});

