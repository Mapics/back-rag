const express = require('express')
const mariadb = require('mariadb')
const bcrypt = require('bcrypt')

require('dotenv').config();

const app = express()
var cors = require('cors')

app.use(express.json())
app.use(cors())

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    database: process.env.DB_DTB,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
})

app.get('/jeux', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM jeu');
        res.status(200).json(rows);
    } catch(err) {
        res.status(404).console.log(err);
    } finally {
        if (conn) conn.release();
    }
});

app.get('/jeux/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM jeu WHERE id = ?', [req.params.id]);
        res.status(200).json(rows);
    } catch(err) {
        res.status(404).console.log(err);
    } finally {
        if (conn) conn.release();
    }
});

app.get('/user/:id' , async (req, res) => {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM user WHERE id = ?', [req.params.id]);
    conn.release();
    res.json(rows);
})

// Ajoutez d'autres routes pour les opérations CRUD sur 'jeu', 'user', et 'location'