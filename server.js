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

// Modification de la route côté serveur
app.post('/location/:userId', async (req, res) => {
    const userId = req.params.userId;

    let conn;
    try {
        conn = await pool.getConnection();
        const locationsToAdd = req.body;

        await Promise.all(locationsToAdd.map(async (locationData) => {
            const { id, dateStart, dateEnd } = locationData;

            const result = await conn.query(
                'INSERT INTO location (id_jeu, id_user, date_debut, date_fin) VALUES (?, ?, ?, ?)',
                [id, userId, dateStart, dateEnd]
            );
        }));

        res.status(201).json({ message: "Locations ajoutées avec succès." });
    } catch (err) {
        console.error("Erreur lors de la création des locations :", err);
        res.status(500).json({ error: "Erreur lors de la création des locations.", details: err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.post('/game/:gameId/comment', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const { gameId } = req.params;
        const { userId, commentary } = req.body;

        // Ajoutez la logique nécessaire pour insérer le commentaire dans la base de données
        const result = await conn.query(
            'UPDATE location SET commentaire = ? WHERE id_jeu = ? AND id_user = ?',
            [commentary, gameId, userId]
        );

        // Vérifiez si la mise à jour a été effectuée avec succès
        if (result.affectedRows > 0) {
            res.status(201).json({ message: "Commentaire ajouté avec succès." });
        } else {
            res.status(404).json({ error: "Le jeu ou l'utilisateur n'a pas été trouvé." });
        }
    } catch (err) {
        console.error("Erreur lors de la soumission du commentaire :", err);
        res.status(500).json({ error: "Erreur lors de la soumission du commentaire.", details: err.message });
    } finally {
        if (conn) conn.release();
    }
});

app.post("/login", async (req, res) => {
    let conn;
    console.log('tentative de connexion');
    try {
        conn = await pool.getConnection();
        const { email, password } = req.body;
        const user = await conn.query('SELECT * FROM user WHERE email = ?', [email]);

        if (user.length === 0) {
            res.status(404).json({ error: "Utilisateur non trouvé." });
            return;
        }

        const hashedPassword = user[0].password;

        // Utilisez bcrypt.compare de manière asynchrone
        const passwordMatch = await bcrypt.compare(password, hashedPassword);

        if (passwordMatch) {
            console.log("Mot de passe correct");
            const userId = user[0].id;
            res.json({ userId });
        } else {
            console.log("Mot de passe incorrect");
            res.status(401).json({ error: "Mot de passe incorrect." });
        }
    } catch (err) {
        console.error("Erreur lors de la connexion :", err);
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
        res.status(404).json(err);
    } finally {
        if (conn) conn.release();
    }
});

app.get('/users', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM user');
        res.status(200).json(rows);
    } catch(err) {
        res.status(404).json(err);
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

app.get('/user/:id/username', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT username FROM user WHERE id = ?', [req.params.id]);
        console.log(rows);
        res.status(200).json(rows);
    } catch(err) {
        res.status(404).json(err);
    } finally {
        if (conn) conn.release();
    }
});

app.post('/location', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const locationsToAdd = req.body; // Reçoit un tableau d'objets

        // Utilise Promise.all pour effectuer les insertions en parallèle
        await Promise.all(locationsToAdd.map(async (locationData) => {
            const { id, titre, dateStart, dateEnd } = locationData;
            const userId = req.user.id;
            
            // Ajoutez la location avec les informations nécessaires
            const result = await conn.query(
                'INSERT INTO location (id_jeu, id_user, date_debut, date_fin) VALUES (?, ?, ?, ?)',
                [id, userId, dateStart, dateEnd]
            );

            const insertedId = result.insertId;
        }));

        res.status(201).json({ message: "Locations ajoutées avec succès." });
    } catch (err) {
        console.error("Erreur lors de la création des locations :", err);
        res.status(500).json({ error: "Erreur lors de la création des locations.", details: err.message });
    } finally {
        if (conn) conn.release(); // Toujours libérer la connexion après usage
    }
});


app.get('/user/:userId/gamesInLocation', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const userId = req.params.userId;
        const query = `
            SELECT jeu.id, jeu.images, jeu.titre, jeu.description, jeu.plateforme, jeu.prix
            FROM location
            JOIN jeu ON location.id_jeu = jeu.id
            WHERE location.id_user = ?
        `;
        const rows = await conn.query(query, [userId]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("Erreur lors de la récupération des jeux en location :", err);
        res.status(500).json({ error: "Erreur lors de la récupération des jeux en location.", details: err.message });
    } finally {
        if (conn) conn.release(); // Toujours libérer la connexion après usage
    }
});

app.get('/user/:userId/gamesWithComments', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const userId = req.params.userId;

        // Sélectionne les jeux de l'utilisateur avec leurs commentaires
        const rows = await conn.query(`
            SELECT jeu.*, location.commentaire AS userComment
            FROM jeu
            LEFT JOIN location ON jeu.id = location.jeu_id
            WHERE location.user_id = ?
        `, [userId]);

        res.status(200).json(rows);
    } catch (err) {
        console.error("Erreur lors de la récupération des jeux avec commentaires :", err);
        res.status(500).json({ error: "Erreur lors de la récupération des jeux avec commentaires.", details: err.message });
    } finally {
        if (conn) conn.release(); // Toujours libérer la connexion après usage
    }
});

app.get('/location/comment/:gamesid', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM location WHERE id_jeu = ?', [req.params.gamesid]);
        res.status(200).json(rows);
    } catch(err) {
        res.status(404).console.log(err);
    } finally {
        if (conn) conn.release();
    }
})

app.listen(8000, () => {
    console.log("Serveur a l'ecoute");
})