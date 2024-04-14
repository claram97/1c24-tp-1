const express = require('express');
const axios = require('axios');
const router = express.Router();

// Función para obtener las definiciones de una palabra
const getDefinitions = async (word) => {
    const result = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);

    return result.data.map(entry => ({
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
};

// Ruta para obtener definiciones de una palabra
router.get('/dictionary', async (req, res) => {
    const word = req.query.word;
    
    if (!word) {
        return res.status(400).send('Por favor, proporciona una palabra');
    }

    console.log(`Pedido de definición de la palabra ${word}`);

    try {
        const definitions = await getDefinitions(word);
        res.status(200).json(definitions);
    } catch (error) {
        console.error('Error al obtener resultados desde dictionaryapi:', error);

        if (error.response && error.response.status === 400) {
            res.status(404).send('No se encontraron definiciones para la palabra especificada');
        } else {
            res.status(500).send('Error al consultar el diccionario, contacta al administrador del servicio');
        }
    }
});

module.exports = router;
