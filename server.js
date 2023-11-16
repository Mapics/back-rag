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

app.post("/login", async(req, res) => {
    let conn;
    console.log('tentative de connexion')
    try {
        conn = await pool.getConnection();
        const { email, password } = req.body;
        const user = await conn.query('SELECT * FROM user WHERE email = ?', [email]);

        if (user.length === 0) {
            res.status(404).json({ error: "Utilisateur non trouvé." });
            return;
        }

        const hashedPassword = user[0].password;
        console.log(password, hashedPassword)
        const passwordMatch = await bcrypt.compare(password, hashedPassword) ;
        bcrypt.compare(password, hashedPassword, function(err, response){
            if (response) {
                console.log("Mot de passe correct");
                localStorage.setItem('isConnected', 'true');
                localStorage.setItem('user', user[0].user_id);
            } else {
                console.log("Mot de passe incorrect" + err);
            }
        })
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la connexion." });
    } finally {
        console.log('echoué')
        if (conn) conn.release(); // Toujours libérer la connexion après usage
    }
});
 
app.post("/signup", async(req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { email, password, username, userfirstname } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await conn.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, password]
        );
        const insertedId = result.insertId;
        const newUser = await conn.query('SELECT * FROM users WHERE id = ?', [insertedId]);
        console.log("new user signup")
        res.status(201).json(newUser[0]);
    } catch (err) {
        console.error("Erreur lors de l'inscription :", err);
        res.status(500).json({ error: "Erreur lors de l'inscription.", details: err.message });
    } finally {
        if (conn) conn.release(); // Toujours libérer la connexion après usage
    }
})

app.post('/location', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { user_id, jeu_id, location_date } = req.body;
        const result = await conn.query(
            'INSERT INTO location (user_id, jeu_id, location_date) VALUES (?, ?, ?)',
            [user_id, jeu_id, location_date]
        );
        const insertedId = result.insertId;
        const newLocation = await conn.query('SELECT * FROM location WHERE id = ?', [insertedId]);
        res.status(201).json(newLocation[0]);
    } catch (err) {
        console.error("Erreur lors de la création de la location :", err);
        res.status(500).json({ error: "Erreur lors de la création de la location.", details: err.message });
    } finally {
        if (conn) conn.release(); // Toujours libérer la connexion après usage
    }
})

app.get('/location/comment/:gamesid', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM comment WHERE id_jeu = ?', [req.params.gamesid]);
        res.status(200).json(rows);
    } catch(err) {
        res.status(404).console.log(err);
    } finally {
        if (conn) conn.release();
    }
})
// app.get('/location/comment/:userid', async (req, res) => {

app.listen(8000, () => {
    console.log("Serveur a l'ecoute");
})