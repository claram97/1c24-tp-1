const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const {createClient} = require('redis');
const SPACE_NEWS_EXPIRATION = 40;

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

var StatsD = require('hot-shots'),
myStats = new StatsD({
  host: 'graphite',
  port: 8125
});

const HEADLINE_COUNT = 5;

const SuccessCodes = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204
};

const ErrorCodes = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Middleware para establecer startTime en cada solicitud entrante
app.use((req, res, next) => {
  req.startTime = Date.now(); // Establecer el tiempo de inicio de la solicitud
  next(); // Llamar a la siguiente función de middleware en la cadena
});

app.get('/ping', (req, res) => {
  res.status(SuccessCodes.OK).send("Pong!");
  const responseTime = Date.now() - req.startTime;
  myStats.gauge(`throughput.ping_response_time`, responseTime);
  myStats.gauge(`latency.ping_latency`, responseTime);
});

const CACHE_EXPIRATION_SECONDS = 40; // Tiempo de expiración en segundos

app.get('/dictionary', async (req, res) => {
  const word = req.query.word;
  if (word == null) {
    return res.status(ErrorCodes.BAD_REQUEST).send('Please provide a word');
  }

  console.log(`Pedido de dictionary sobre la palabra ${word}`);
  // Verificar si la palabra está en caché en Redis
  let definitions = await redisClient.get(`dictionary:${word}`);

  if (definitions) {
    definitions = JSON.parse(definitions);
    console.log(`La palabra ${word} se encontró en la caché de Redis.`);
    const responseTime = Date.now() - req.startTime;
    myStats.gauge(`latency.dictionary_latency`, responseTime);
    res.status(200).json(definitions);
  } else {
    try {
      // Si la palabra no está en caché, hacer la solicitud a la API
      const dictStartTime = Date.now(); // Excluimos el tiempo de la pegada a redis de la latencia que deberia estar solo midiendo la latencia de la pegada al servicio externo
      const result = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const latency = Date.now() - dictStartTime;
      myStats.gauge(`latency.dictionary_latency`, latency);

      definitions = result.data.map(entry => ({
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
      res.status(SuccessCodes.OK).json(definitions);
    } catch (error) {
      let errorMessage = "";
      if (error.response) {
        errorMessage = `Error when consulting the dictionary: ${error.response.statusText}`;
        res.status(error.response.status).send(errorMessage);
      } else {
        errorMessage = `Error when consulting the dictionary, contact your service administrator`;
        res.status(ErrorCodes.INTERNAL_SERVER_ERROR).send(errorMessage);
      }
      console.error(errorMessage);
      const responseTime = Date.now() - req.startTime;
      myStats.gauge(`throughput.dictionary_response_time`, responseTime);
      return;
    }
  }

  // Guardar la palabra en caché en Redis con tiempo de expiración
  await redisClient.set(`dictionary:${word}`, JSON.stringify(definitions), {EX: CACHE_EXPIRATION_SECONDS});
  const responseTime = Date.now() - req.startTime;
  myStats.gauge(`throughput.dictionary_response_time`, responseTime);
});

const HEADLINE_COUNT = 5;
app.get('/spaceflight_news', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    const spaceNews = await redisClient.get('space-news');

    let titles = [];

    if (spaceNews) {
        titles = JSON.parse(spaceNews);
        const latency = Date.now() - req.startTime;
        myStats.gauge(`latency.space_news_latency`, latency);
        const responseTime = Date.now() - req.startTime;
        myStats.gauge(`throughput.space_news_response_time`, responseTime);
        res.status(SuccessCodes.OK).json(titles);
    }
    else {
        try {
            const result = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=${HEADLINE_COUNT}`);
            const latency = Date.now() - req.startTime;
            myStats.gauge(`latency.space_news_latency`, latency);
            result.data.results.forEach(result => {titles.push(result.title)} )
        } catch (error) {
                let errorMessage = "";
                if (error.response) {
                  errorMessage = `Error when consulting the news: ${error.response.statusText}`;
                  res.status(error.response.status).send(errorMessage);
                } else {
                  errorMessage = 'Error when consulting the news, contact your service administrator';
                  res.status(ErrorCodes.INTERNAL_SERVER_ERROR).send(errorMessage);
                }
                console.error(errorMessage);
                return;
              }
    }

    redisClient.set('space-news', JSON.stringify(titles), {EX: SPACE_NEWS_EXPIRATION});
    res.status(SuccessCodes.OK).json(titles);
    const responseTime = Date.now() - req.startTime;
    myStats.gauge(`throughput.space_news_response_time`, responseTime);
});

app.get('/quote', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    try {
        const result = await axios.get(`https://api.quotable.io/quotes/random`);
        const latency = Date.now() - req.startTime;
        myStats.gauge(`latency.quote_latency`, latency);
        const quote = result.data.map(quote => ({
                      quote: quote.content,
                      author: quote.author
                    }));

        res.status(SuccessCodes.OK).json(quote[0]);
        const responseTime = Date.now() - req.startTime;
        myStats.gauge(`throughput.quote_response_time`, responseTime);
      } catch (error) {
        let errorMessage = "";
        if (error.response) {
          errorMessage = `Error when retrieving quote: ${error.response.status}: ${error.response.statusText}`;
          res.status(error.response.status).send(errorMessage);
        } else {
          errorMessage = 'Error when retrieving quote, contact your service administrator';
          res.status(ErrorCodes.INTERNAL_SERVER_ERROR).send(errorMessage);
        }
        console.error(errorMessage);
      }
});

// Iniciamos el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
