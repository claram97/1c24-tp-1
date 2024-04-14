const express = require('express');
const axios = require('axios');
const router = express.Router();

// Función para obtener una cita aleatoria
const getRandomQuote = async () => {
    const result = await axios.get(`https://api.quotable.io/quotes/random`);
    const quote = {
        quote: result.data.content,
        author: result.data.author
    };
    return quote;
};

// Manejador de errores
const errorHandler = (error, res) => {
    console.error('Error obteniendo resultado desde quotable:', error);
    res.status(500).send('Error when retrieving quote, contact your service administrator');
};

router.get('/quote', async (req, res) => {
    console.log(`Pedido de cita aleatoria`);

    try {
        const quote = await getRandomQuote();
        res.status(200).json(quote);
    } catch (error) {
        errorHandler(error, res);
    }
});

module.exports = router;
