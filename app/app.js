const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

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


// Manejador para rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
    console.log("Pedido sobre ruta no existente")
});

// Manejador de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciamos el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
