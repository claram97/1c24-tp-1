const express = require('express');
const axios = require('axios');
// const StatsD = require('node-statsd');

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

// const dogstatsd = new StatsD({
//   host: 'graphite',
//   port: 8125,
// });

var StatsD = require('hot-shots'),
dogstatsd = new StatsD({
  host: 'graphite',  
  port: 8125
});

// Middleware para establecer startTime en cada solicitud entrante
app.use((req, res, next) => {
  req.startTime = Date.now(); // Establecer el tiempo de inicio de la solicitud
  next(); // Llamar a la siguiente función de middleware en la cadena
});

app.get('/ping', (req, res) => {
    res.status(200).send("Pong!");
    const responseTime = Date.now() - req.startTime;
    dogstatsd.gauge(`throughput.ping_response_time`, responseTime);
    dogstatsd.gauge(`latency.ping_latency`, responseTime);
});

const CACHE_EXPIRATION_SECONDS = 10; // Tiempo de expiración en segundos

app.get('/dictionary', async (req, res) => {
    const word = req.query.word;
    console.log(`Pedido de dictionary sobre la palabra ${word}`);
    // Verificar si la palabra está en caché en Redis
    const cachedDefinition = await redisClient.get(`dictionary:${word}`);
  
    if (cachedDefinition) {
      console.log(`La palabra ${word} se encontró en la caché de Redis.`);
      const responseTime = Date.now() - req.startTime;
      dogstatsd.timing(`throughput.dictionary_response_time`, responseTime);
      dogstatsd.timing(`latency.dictionary_latency`, responseTime);
      return res.status(200).json(JSON.parse(cachedDefinition));
    }
    try {
      // Si la palabra no está en caché, hacer la solicitud a la API
      const result = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const latency = Date.now() - req.startTime;
      dogstatsd.timing(`latency.dictionary_latency`, latency);

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

      // Guardar la palabra en caché en Redis con tiempo de expiración
      await redisClient.set(`dictionary:${word}`, JSON.stringify(definitions), {EX: CACHE_EXPIRATION_SECONDS});

      res.status(200).json(definitions);
      const responseTime = Date.now() - req.startTime;
      dogstatsd.timing(`throughput.dictionary_response_time`, responseTime);
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
      const latency = Date.now() - req.startTime;
      dogstatsd.timing(`latency.space_news_latency`, latency);
      const responseTime = Date.now() - req.startTime;
      dogstatsd.timing(`throughput.space_news_response_time`, responseTime);
      return res.status(200).json(titles);
    }
    else {
      try {
        const result = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=${HEADLINE_COUNT}`);
        const latency = Date.now() - req.startTime;
        dogstatsd.timing(`latency.space_news_latency`, latency);
        result.data.results.forEach(result => {titles.push(result.title)} )
      } catch (error) {
        console.error('Error obteniendo resultado desde spaceflightnewsapi:', error);
        return res.status(500).send('Error when consulting the news, contact your service administrator');
      }
    }

    redisClient.set('space-news', JSON.stringify(titles), {EX: SPACE_NEWS_EXPIRATION});
    res.status(200).json(titles);
    const responseTime = Date.now() - req.startTime;
    dogstatsd.timing(`throughput.space_news_response_time`, responseTime);
});

app.get('/quote', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    try {
        const result = await axios.get(`https://api.quotable.io/quotes/random`);
        const latency = Date.now() - req.startTime;
        dogstatsd.timing(`latency.quote_latency`, latency);
        const quote = result.data.map(quote => ({
                      quote: quote.content,
                      author: quote.author
                    }));
        const responseTime = Date.now() - req.startTime;
        dogstatsd.timing(`latency.quote_latency`, responseTime);
        return res.status(200).json(quote[0]);
      } catch (error) {
        console.error('Error obteniendo resultado desde quotable:', error);
        res.status(500).send('Error when retrieving quote, contact your service administrator');
      }
});


// // Manejador para rutas no encontradas
// app.use((req, res) => {
//     res.status(404).json({ error: 'Page not found' });
//     console.log("Pedido sobre ruta no existente")
// });

// // Manejador de errores
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).json({ error: 'Internal server error' });
// });

// Iniciamos el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
