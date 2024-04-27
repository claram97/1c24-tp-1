const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

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
  res.status(200).send("Pong!");
  const responseTime = Date.now() - req.startTime;
  myStats.gauge(`throughput.ping_response_time`, responseTime);
  myStats.gauge(`latency.ping_latency`, responseTime);
});

app.get('/dictionary', async (req, res) => {
    const word = req.query.word;
    if (word == null) {
      return res.status(ErrorCodes.BAD_REQUEST).send('Please provide a word');
    }
    
    console.log(`Pedido de dictionary sobre la palabra ${word}`);

    try {
        const result = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const latency = Date.now() - req.startTime;
        myStats.gauge(`latency.dictionary_latency`, latency);
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
        const responseTime = Date.now() - req.startTime;
        myStats.gauge(`throughput.dictionary_response_time`, responseTime);
      } catch (error) {
        console.error('Error obteniendo resultado desde dictionaryapi:', error.response.statusText);
        if (error.response) {
            const errorMessage = `Error when consulting the dictionary: ${error.response.statusText}`;
            return res.status(error.response.status).send(errorMessage);
        } else {
            return res.status(500).send('Error when consulting the dictionary, contact your service administrator');
        }
      }
});

app.get('/spaceflight_news', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    try {
        const result = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=${HEADLINE_COUNT}`);
        const latency = Date.now() - req.startTime;
        myStats.gauge(`latency.space_news_latency`, latency);

        const titles = [];

        result.data.results.forEach(result => {titles.push(result.title)} )

        res.status(200).json(titles);
        const responseTime = Date.now() - req.startTime;
        myStats.gauge(`throughput.space_news_response_time`, responseTime);
      } catch (error) {
        console.error('Error obteniendo resultado desde spaceflightnewsapi:', error);
        res.status(500).send('Error when consulting the news, contact your service administrator');
      }
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

        res.status(200).json(quote[0]);
        const responseTime = Date.now() - req.startTime;
        myStats.gauge(`throughput.quote_response_time`, responseTime);
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
