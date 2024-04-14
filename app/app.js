const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const dictionaryRoutes = require('./dictionaryRoutes');
const quoteRoutes = require('./quoteRoutes');
const spaceflightNewsRoutes = require('./spaceflightNewsRoutes');

app.use(dictionaryRoutes);
app.use(quoteRoutes);
app.use(spaceflightNewsRoutes);

app.get('/ping', (req, res) => {
    res.status(200).send("Pong!");
});

// Manejador para rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Page not found' });
    console.log("Pedido sobre ruta no existente")
});

// Manejador de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Iniciamos el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
