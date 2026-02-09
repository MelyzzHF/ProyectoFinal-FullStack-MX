const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Pon tu usuario aquí
    password: "", // Pon tu Password Aquí
    database: 'gestor_tareas'
});

db.connect(err => {
    if (err) {
        console.error(err);
    } else {
        console.log('Conectado a MySQL');
    }
});

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
