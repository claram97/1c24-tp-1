const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const dictionaryRoutes = require('./dictionaryRoutes');

app.use(dictionaryRoutes);

app.get('/ping', (req, res) => {
    res.status(200).send("Pong!");
});

const HEADLINE_COUNT = 5;
app.get('/spaceflight_news', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    try {
        const result = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=${HEADLINE_COUNT}`);
        const titles = [];

        result.data.results.forEach(result => {titles.push(result.title)} )

        res.status(200).json(titles);
      } catch (error) {
        console.error('Error obteniendo resultado desde spaceflightnewsapi:', error);
        res.status(500).send('Error when consulting the news, contact your service administrator');
      }
});

app.get('/quote', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    try {
        const result = await axios.get(`https://api.quotable.io/quotes/random`);

        const quote = result.data.map(quote => ({
                      quote: quote.content,
                      author: quote.author
                    }));

        res.status(200).json(quote[0]);
      } catch (error) {
        console.error('Error obteniendo resultado desde quotable:', error);
        res.status(500).send('Error when retrieving quote, contact your service administrator');
      }
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
