const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/dictionary', async (req, res) => {
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

module.exports = router;
