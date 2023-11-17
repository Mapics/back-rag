const express = require('express')
const mariadb = require('mariadb')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');

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

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
    return res.status(401).json({ message: 'Non authentifié' });
    }

    jwt.verify(token, 'clé_secrète', (err, user) => {
    if (err) {
        return res.status(403).json({ message: 'Token invalide' });
    }

    req.user = user;
    next();
    });
};


app.get('/profil', verifyToken, (req, res) => {
    res.json({ user: req.user });
});

app.get('/')

  
app.get('/jeux', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();

        let query = 'SELECT * FROM jeu';

        if (req.query.search) {
            query += ` WHERE titre LIKE '%${req.query.search}%'`;
        }

        const rows = await conn.query(query);
        res.status(200).json(rows);
    } catch(err) {
        console.log(err);
        res.status(500).json({ error: 'Erreur serveur' });
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

        if (email === user[0].email) {
            res.status(401).json({ error : "Email deja utilisé"})
        }

        const hashedPassword = user[0].password;
        console.log(password, hashedPassword)
        await bcrypt.compare(password, hashedPassword, function(err, response){

            if (response) {
                console.log("Mot de passe correct");
                const user = { id: 123, username: 'utilisateur' }
                const token = jwt.sign(user, 'key', { expiresIn: '1h' });
                res.json({ token });
                console.log(token)
            } else {
                console.log("Mot de passe incorrect" + err);
            }
        })
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la connexion." });
    } finally {
        if (conn) conn.release(); // Toujours libérer la connexion après usage
    }
});
 
app.post("/signup", async(req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await conn.query(
            'INSERT INTO user (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        const insertedId = result.insertId;
        const newUser = await conn.query('SELECT * FROM user WHERE id = ?', [insertedId]);
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