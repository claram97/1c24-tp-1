const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const nodeId = process.env.HOSTNAME;

var StatsD = require('hot-shots'),
myStats = new StatsD({
  host: 'graphite',  
  port: 8125
});

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
  res.setHeader('X-Node-Id', nodeId);
  next(); // Llamar a la siguiente función de middleware en la cadena
});

app.get('/ping', (req, res) => {
  console.log("Pong!")
  res.status(SuccessCodes.OK).send("Pong!");
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
                  synonyms: definition.synonyms.map(synonym => synonym),
                  antonyms: definition.antonyms.map(antonym => antonym),
                  example: definition.example
                })),
                synonyms: meaning.synonyms.map(synonym => synonym),
                antonyms: meaning.antonyms.map(antonyms => antonyms)
              }))
            }));

        res.status(SuccessCodes.OK).json(definitions);
        const responseTime = Date.now() - req.startTime;
        myStats.gauge(`throughput.dictionary_response_time`, responseTime);
      } catch (error) {
        let errorMessage = "";
        if (error.response) {
          errorMessage = `Error when consulting the dictionary:  ${error.response.status}: ${error.response.statusText}`;
          res.status(error.response.status).send(errorMessage);
        } else {
          errorMessage = 'Error when consulting the dictionary, contact your service administrator';
          res.status(ErrorCodes.INTERNAL_SERVER_ERROR).send(errorMessage);
        }
        console.error(errorMessage);
      }
});

const HEADLINE_COUNT = 5;
app.get('/spaceflight_news', async (req, res) => {
    console.log(`Pedido de noticias sobre el espacio`);

    try {
        const result = await axios.get(`https://api.spaceflightnewsapi.net/v4/articles/?limit=${HEADLINE_COUNT}`);
        const latency = Date.now() - req.startTime;
        myStats.gauge(`latency.space_news_latency`, latency);

        const titles = [];

        result.data.results.forEach(result => {titles.push(result.title)} )

        res.status(SuccessCodes.OK).json(titles);
        const responseTime = Date.now() - req.startTime;
        myStats.gauge(`throughput.space_news_response_time`, responseTime);
      } catch (error) {
        let errorMessage = "";
        if (error.response) {
          errorMessage = `Error when consulting the news:  ${error.response.status}: ${error.response.statusText}`;
          res.status(error.response.status).send(errorMessage);
        } else {
          let errorCode = "";
          if(error.code){
            errorCode= error.code;
          }
          errorMessage = `${errorCode} error when consulting the news, contact your service administrator`;
          res.status(ErrorCodes.INTERNAL_SERVER_ERROR).send(errorMessage);
        }
        console.error(errorMessage);
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
