const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const {createClient} = require('redis');
const SPACE_NEWS_EXPIRATION = 10;

const redisClient = createClient({
  url: 'redis://redis:6379'
});

(async () => {
  await redisClient.connect();
  console.log('Connected to Redis');
})();

process.on('SIGTERM', async () => {
  await redisClient.quit();
  console.log('Disconnected from Redis');
});

// Middleware para establecer startTime en cada solicitud entrante
app.use((req, res, next) => {
  req.startTime = Date.now(); // Establecer el tiempo de inicio de la solicitud
  next(); // Llamar a la siguiente función de middleware en la cadena
});

app.get('/ping', (req, res) => {
    res.status(200).send("Pong!");
});

app.get('/dictionary', async (req, res) => {
    const word = req.query.word;
    console.log(`Pedido de dictionary sobre la palabra ${word}`);

    try {
        const result = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

        const definitions = result.data.map(entry => ({
              word: entry.word,
              phonetic: entry.phonetic,
              meanings: entry.meanings.map(meaning => ({
                partOfSpeech: meaning.partOfSpeech,
                definitions: meaning.definitions.map(definition => ({
                  definition: definition.definition,
                  synonyms: definition.synonyms,
                  antonyms: definition.antonyms,
                  example: definition.example
                }))
              }))
            }));

        res.status(200).json(definitions);
      } catch (error) {
        console.error('Error obteniendo resultado desde dictionaryapi:', error);
        res.status(500).send('Error when consulting the dictionary, contact your service administrator');
      }
});

const HEADLINE_COUNT = 5;
app.get('/spaceflight_news', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    const spaceNews = await redisClient.get('space-news');

    let titles = [];
    
    if (spaceNews) {
      titles = JSON.parse(spaceNews);
    }
    else {
      try {
        const result = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=${HEADLINE_COUNT}`);
        result.data.results.forEach(result => {titles.push(result.title)} )
      } catch (error) {
        console.error('Error obteniendo resultado desde spaceflightnewsapi:', error);
        res.status(500).send('Error when consulting the news, contact your service administrator');
      }
    }

    redisClient.set('space-news', JSON.stringify(titles), {EX: SPACE_NEWS_EXPIRATION});
    res.status(200).json(titles);
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
